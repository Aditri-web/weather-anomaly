"""
Integration smoke tests for Stage 1 (Tracker GNN), Stage 2 (CorrDiff Downscaler),
DDIM sampler, and Physics Loss terms.
"""

import pytest
import torch
import numpy as np
from src.mesh.icosahedron import build_icosahedral_mesh, build_bipartite_mapping
from src.models.tracker.gnn import SphericalAnomalyTrackerGNN
from src.models.tracker.losses import TrackerCompositeLoss
from src.tracking.tracker import AnomalyTracker
from src.models.downscaler.corrdiff import CorrDiffDownscaler
from src.physics.losses import PhysicsCompositeLoss, check_hallucination_guard


def test_stage1_tracker_forward_and_loss():
    mesh = build_icosahedral_mesh(refinement_level=1)  # 42 nodes
    lats = np.linspace(10.0, 20.0, 8)
    lons = np.linspace(80.0, 90.0, 8)
    g2m_idx, g2m_w = build_bipartite_mapping(lats, lons, mesh["lats_deg"], mesh["lons_deg"])
    mesh_edge_index = torch.tensor(mesh["edge_index"], dtype=torch.long)

    model = SphericalAnomalyTrackerGNN(
        in_channels=4,
        hidden_dim=16,
        num_processor_layers=2,
        negative_slope=0.1,
    )

    criterion = TrackerCompositeLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

    # Synthetic batch: B=2, C=4, H=8, W=8
    x = torch.randn(2, 4, 8, 8)
    target_mask = torch.randint(0, 2, (2, 1, 8, 8)).float()
    target_center = torch.tensor([[15.0, 85.0, 100.0], [18.0, 88.0, 120.0]])

    optimizer.zero_grad()
    out = model(
        grid_features=x,
        grid_to_mesh_idx=g2m_idx,
        grid_to_mesh_weights=g2m_w,
        mesh_edge_index=mesh_edge_index,
        n_mesh_nodes=mesh["num_nodes"],
        grid_shape=(8, 8),
    )

    assert out["anomaly_mask"].shape == (2, 1, 8, 8)
    assert out["center_intensity"].shape == (2, 3)

    loss = criterion(out["anomaly_mask"], target_mask, out["center_intensity"], target_center)
    loss.backward()
    optimizer.step()
    assert loss.item() > 0.0


def test_anomaly_tracker_linking():
    tracker = AnomalyTracker(prob_threshold=0.5, min_area_pixels=2)
    lats = np.linspace(10.0, 20.0, 10)
    lons = np.linspace(80.0, 90.0, 10)

    # Lead time 0: blob around (12, 82)
    map0 = np.zeros((10, 10))
    map0[1:3, 1:3] = 0.8

    # Lead time 24: moved blob to (14, 84)
    map24 = np.zeros((10, 10))
    map24[3:5, 3:5] = 0.85

    dets0 = tracker.extract_detections_from_map(map0, lats, lons, lead_time_hours=0)
    dets24 = tracker.extract_detections_from_map(map24, lats, lons, lead_time_hours=24)

    assert len(dets0) == 1
    assert len(dets24) == 1

    tracks = tracker.link_trajectories({0: dets0, 24: dets24})
    assert len(tracks) == 1
    assert len(tracks[0]["trajectory"]) == 2
    assert tracks[0]["start_lead_hours"] == 0
    assert tracks[0]["end_lead_hours"] == 24


def test_stage2_corrdiff_downscaler():
    model = CorrDiffDownscaler(
        in_channels=3,
        base_features=16,
        negative_slope=0.1,
        num_train_timesteps=100,
    )

    # Conditioning: (B=1, C=3, H=32, W=32)
    cond = torch.randn(1, 3, 32, 32)
    res = model.sample_downscaled(
        conditioning=cond,
        num_samples=2,
        num_inference_steps=5,
        threshold_mm=30.0,
    )

    assert res["mean"].shape == (1, 1, 32, 32)
    assert res["peak"].shape == (1, 1, 32, 32)
    assert res["exceedance_prob"].shape == (1, 1, 32, 32)
    assert res["samples"].shape == (1, 2, 32, 32)

    # Enforce non-negativity (physical precipitation >= 0)
    assert torch.all(res["mean"] >= 0.0)
    assert torch.all(res["peak"] >= 0.0)
    assert torch.all((res["exceedance_prob"] >= 0.0) & (res["exceedance_prob"] <= 1.0))


def test_physics_loss_and_hallucination_guard():
    crit = PhysicsCompositeLoss(scale_factor=2)
    pred_high = torch.ones(1, 1, 16, 16) * 10.0
    target_high = torch.ones(1, 1, 16, 16) * 12.0
    coarse_in = torch.ones(1, 1, 8, 8) * 10.0

    loss_dict = crit(pred_high, target_high, coarse_in)
    assert "total_loss" in loss_dict
    assert "agg_consistency_loss" in loss_dict
    assert "spectral_loss" in loss_dict
    assert "extreme_quantile_loss" in loss_dict
    assert loss_dict["agg_consistency_loss"].item() < 1e-4

    # Test hallucination guard
    flagged, rel_err = check_hallucination_guard(pred_high, coarse_in, scale_factor=2)
    assert not flagged

    # Extreme discrepancy triggers hallucination flag
    hallucinated = torch.ones(1, 1, 16, 16) * 100.0
    flagged_bad, rel_err_bad = check_hallucination_guard(hallucinated, coarse_in, scale_factor=2)
    assert flagged_bad
    assert rel_err_bad > 0.5
