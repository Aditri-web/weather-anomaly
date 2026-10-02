import os
import sys
import argparse
import yaml

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import torch
import numpy as np
from torch.utils.data import DataLoader
from src.mesh.icosahedron import build_icosahedral_mesh, build_bipartite_mapping
from src.models.tracker.gnn import SphericalAnomalyTrackerGNN
from src.models.tracker.losses import TrackerCompositeLoss
from src.data.dataset import WeatherAnomalyDataset
from src.data.sources import SyntheticForecastSource


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=str, default="configs/tracker.yaml")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--device", type=str, default="cpu")
    args = parser.parse_args()

    with open(args.config, "r") as f:
        cfg = yaml.safe_load(f)

    device = torch.device("cuda" if torch.cuda.is_available() and args.device == "cuda" else "cpu")
    print(f"[*] Training Stage 1 Tracker on device: {device}")

    # Build spherical mesh
    refinement = cfg["model"].get("mesh_refinement", 2)
    mesh = build_icosahedral_mesh(refinement_level=refinement)
    n_mesh_nodes = mesh["num_nodes"]
    mesh_edge_index = torch.tensor(mesh["edge_index"], dtype=torch.long, device=device)

    synth_source = SyntheticForecastSource()
    sample_field = synth_source.load_field("2018-05-15", lead_time_hours=0)
    lats = sample_field["latitudes"]
    lons = sample_field["longitudes"]

    grid_to_mesh_idx, grid_to_mesh_weights = build_bipartite_mapping(
        lats, lons, mesh["lats_deg"], mesh["lons_deg"]
    )
    grid_to_mesh_idx = grid_to_mesh_idx.to(device)
    grid_to_mesh_weights = grid_to_mesh_weights.to(device)

    # Instantiate model
    model = SphericalAnomalyTrackerGNN(
        in_channels=cfg["model"]["in_channels"],
        hidden_dim=cfg["model"]["hidden_dim"],
        num_processor_layers=cfg["model"]["num_processor_layers"],
        negative_slope=cfg["activation"]["negative_slope"],
    ).to(device)

    criterion = TrackerCompositeLoss(
        w_focal=cfg["loss"]["w_focal"],
        w_dice=cfg["loss"]["w_dice"],
        w_center=cfg["loss"]["w_center"],
    )

    optimizer = torch.optim.AdamW(model.parameters(), lr=cfg["training"]["learning_rate"])

    # Synthetic sample creation for smoke test & baseline training
    synth_source = SyntheticForecastSource()
    samples = []
    for d in range(8):
        lead = d * 24
        field = synth_source.load_field("2018-05-15", lead_time_hours=lead)
        ens_data = field["data"]  # (members, lat, lon)
        mean_p = np.mean(ens_data, axis=0)
        spread_p = np.std(ens_data, axis=0)
        q90_p = np.percentile(ens_data, 90, axis=0)
        efi_approx = np.clip((q90_p - 40.0) / 60.0, -1.0, 1.0)
        static_oro = np.zeros_like(mean_p)

        feats = np.stack([efi_approx, mean_p / 100.0, spread_p / 50.0, q90_p / 100.0, static_oro], axis=0)
        mask = (mean_p >= 50.0).astype(np.float32)

        peak_idx = np.unravel_index(np.argmax(mean_p), mean_p.shape)
        c_lat = float(lats[peak_idx[0]])
        c_lon = float(lons[peak_idx[1]])

        samples.append({
            "event_id": f"event_{d}",
            "year": 2018,
            "date": f"2018-05-{15+d:02d}",
            "coarse_field": feats,
            "static_fields": static_oro[None, ...],
            "target_field": mask[None, ...],
            "center_coords": (c_lat, c_lon, float(mean_p.max())),
            "anomaly_mask": mask,
        })

    dataset = WeatherAnomalyDataset(samples, split="train", allowed_years=[2018])
    loader = DataLoader(dataset, batch_size=cfg["training"]["batch_size"], shuffle=True)

    print(f"[*] Starting Stage 1 training for {args.epochs} epochs...")
    model.train()
    for epoch in range(args.epochs):
        epoch_loss = 0.0
        for batch in loader:
            optimizer.zero_grad()
            feats = batch["coarse"].to(device)  # (B, C, H, W)
            target_mask = batch["mask"].unsqueeze(1).to(device)
            target_center = batch["center"].to(device)

            out = model(
                grid_features=feats,
                grid_to_mesh_idx=grid_to_mesh_idx,
                grid_to_mesh_weights=grid_to_mesh_weights,
                mesh_edge_index=mesh_edge_index,
                n_mesh_nodes=n_mesh_nodes,
                grid_shape=(len(lats), len(lons)),
            )

            loss = criterion(
                out["anomaly_mask"],
                target_mask,
                out["center_intensity"],
                target_center,
            )
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()

        print(f"Epoch [{epoch+1}/{args.epochs}] - Loss: {epoch_loss / len(loader):.4f}")

    os.makedirs("models/checkpoints", exist_ok=True)
    save_path = "models/checkpoints/tracker_latest.pt"
    torch.save(model.state_dict(), save_path)
    print(f"[+] Tracker checkpoint successfully saved to {save_path}")


if __name__ == "__main__":
    main()
