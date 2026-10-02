import os
import sys
import argparse
import yaml

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import torch
import numpy as np
from torch.utils.data import DataLoader
from src.models.downscaler.corrdiff import CorrDiffDownscaler
from src.physics.losses import PhysicsCompositeLoss
from src.data.dataset import WeatherAnomalyDataset
from src.data.sources import SyntheticForecastSource, SyntheticTargetSource


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=str, default="configs/downscaler.yaml")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--device", type=str, default="cpu")
    args = parser.parse_args()

    with open(args.config, "r") as f:
        cfg = yaml.safe_load(f)

    device = torch.device("cuda" if torch.cuda.is_available() and args.device == "cuda" else "cpu")
    print(f"[*] Training Stage 2 Downscaler on device: {device}")

    # Model
    model = CorrDiffDownscaler(
        in_channels=cfg["model"]["in_channels"],
        base_features=cfg["model"]["base_features"],
        negative_slope=cfg["activation"]["negative_slope"],
        num_train_timesteps=cfg["model"]["num_train_timesteps"],
    ).to(device)

    # Physics loss
    p_loss_cfg = cfg["physics_losses"]
    criterion_physics = PhysicsCompositeLoss(
        w_l1=p_loss_cfg["w_l1"],
        w_agg=p_loss_cfg["w_agg"],
        w_spectral=p_loss_cfg["w_spectral"],
        w_quantile=p_loss_cfg["w_quantile"],
        scale_factor=p_loss_cfg["scale_factor"],
    )

    opt_mean = torch.optim.AdamW(model.mean_model.parameters(), lr=cfg["training"]["learning_rate"])
    opt_diff = torch.optim.AdamW(model.residual_diffusion.parameters(), lr=cfg["training"]["learning_rate"])

    # Create synthetic samples for smoke run
    src_forecast = SyntheticForecastSource()
    src_target = SyntheticTargetSource()

    samples = []
    h_c, w_c = 16, 16
    h_t, w_t = 80, 80  # 5x super-resolution

    for idx in range(8):
        # Coarse field
        raw_c = np.random.uniform(5.0, 120.0, size=(1, h_c, w_c)).astype(np.float32)
        # Interpolated to target grid
        interp_c = np.repeat(np.repeat(raw_c, 5, axis=1), 5, axis=2)
        oro = np.random.uniform(0.0, 1.0, size=(1, h_t, w_t)).astype(np.float32)
        land_sea = np.random.choice([0.0, 1.0], size=(1, h_t, w_t)).astype(np.float32)
        cond = np.concatenate([interp_c, oro, land_sea], axis=0)  # (3, H_t, W_t)

        # Target field (with high peaks)
        target = interp_c * np.random.uniform(0.8, 1.5, size=(1, h_t, w_t)).astype(np.float32)

        samples.append({
            "event_id": f"event_{idx}",
            "year": 2017,
            "date": f"2017-06-{10+idx:02d}",
            "coarse_field": cond,
            "static_fields": cond[1:],
            "target_field": target,
            "center_coords": (15.0, 85.0),
            "anomaly_mask": np.ones((h_c, w_c), dtype=np.float32),
        })

    dataset = WeatherAnomalyDataset(samples, split="train", allowed_years=[2017])
    loader = DataLoader(dataset, batch_size=cfg["training"]["batch_size"], shuffle=True)

    print(f"[*] Training conditional mean & residual diffusion for {args.epochs} epochs...")
    model.train()
    for epoch in range(args.epochs):
        mean_losses = []
        diff_losses = []

        for batch in loader:
            cond = batch["coarse"].to(device)  # (B, 3, H_t, W_t)
            target = batch["target"].to(device)  # (B, 1, H_t, W_t)
            coarse_orig = batch["coarse_raw"][:, :1].to(device)  # coarse precipitation

            # Step 1: Optimize conditional mean predictor with physics losses
            opt_mean.zero_grad()
            pred_mean = model.forward_mean(cond)
            pred_mean_phys = torch.clamp(torch.expm1(pred_mean), min=0.0)
            target_phys = torch.clamp(torch.expm1(target), min=0.0)

            loss_dict = criterion_physics(
                pred_high_res=pred_mean_phys,
                target_high_res=target_phys,
                coarse_input=coarse_orig,
            )
            loss_mean = loss_dict["total_loss"]
            loss_mean.backward()
            opt_mean.step()
            mean_losses.append(loss_mean.item())

            # Step 2: Optimize residual diffusion denoiser
            opt_diff.zero_grad()
            with torch.no_grad():
                detached_mean = model.forward_mean(cond)
                residual_target = target - detached_mean

            b = target.shape[0]
            t = torch.randint(0, cfg["model"]["num_train_timesteps"], (b,), device=device).long()
            noise = torch.randn_like(residual_target)

            # Add noise to residual
            sqrt_alpha = model.sampler.sqrt_alphas_cumprod[t].view(b, 1, 1, 1).to(device)
            sqrt_one_minus = model.sampler.sqrt_one_minus_alphas_cumprod[t].view(b, 1, 1, 1).to(device)
            noisy_residual = sqrt_alpha * residual_target + sqrt_one_minus * noise

            pred_noise = model.residual_diffusion(noisy_residual, t, cond)
            loss_diff = torch.nn.functional.mse_loss(pred_noise, noise)
            loss_diff.backward()
            opt_diff.step()
            diff_losses.append(loss_diff.item())

        print(
            f"Epoch [{epoch+1}/{args.epochs}] - "
            f"Mean Loss: {np.mean(mean_losses):.4f} (L1: {loss_dict['l1_loss'].item():.3f}, "
            f"Agg: {loss_dict['agg_consistency_loss'].item():.3f}, "
            f"Spectral: {loss_dict['spectral_loss'].item():.3f}) | "
            f"Diff Loss: {np.mean(diff_losses):.4f}"
        )

    os.makedirs("models/checkpoints", exist_ok=True)
    save_path = "models/checkpoints/downscaler_latest.pt"
    torch.save(model.state_dict(), save_path)
    print(f"[+] Downscaler checkpoint successfully saved to {save_path}")


if __name__ == "__main__":
    main()
