"""
FastAPI REST Service for Extreme Weather Anomaly Tracking and Downscaled Alerts.
Exposes endpoints defined in architecture.md Section 9.1.
"""

import os
import torch
from contextlib import asynccontextmanager

from typing import List, Optional
from fastapi import FastAPI, HTTPException, Header, Query
from api.schemas import (
    HealthStatus,
    AnomalySummary,
    DownscaledResponse,
    AlertItem,
    AlertQueryRequest,
    Coordinates,
    TrajectoryPoint,
)
from src.models.tracker.gnn import SphericalAnomalyTrackerGNN
from src.models.downscaler.corrdiff import CorrDiffDownscaler

# Global instances
tracker_model = None
downscaler_model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global tracker_model, downscaler_model
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Initialize Models (using default config dimensions from infer.yaml)
    tracker_model = SphericalAnomalyTrackerGNN(
        in_channels=5, hidden_dim=64, num_processor_layers=4, negative_slope=0.2
    ).to(device)
    
    downscaler_model = CorrDiffDownscaler(
        in_channels=3, base_features=64, negative_slope=0.2
    ).to(device)
    
    # Load weights if available (as saved in Kaggle)
    tracker_weights = "models/checkpoints/tracker_latest.pt"
    downscaler_weights = "models/checkpoints/downscaler_latest.pt"
    
    if os.path.exists(tracker_weights):
        tracker_model.load_state_dict(torch.load(tracker_weights, map_location=device))
        print(f"Loaded tracker weights from {tracker_weights}")
    else:
        print(f"Warning: Tracker weights not found at {tracker_weights}")

    if os.path.exists(downscaler_weights):
        downscaler_model.load_state_dict(torch.load(downscaler_weights, map_location=device))
        print(f"Loaded downscaler weights from {downscaler_weights}")
    else:
        print(f"Warning: Downscaler weights not found at {downscaler_weights}")
        
    tracker_model.eval()
    downscaler_model.eval()
    
    yield
    # Cleanup if necessary


app = FastAPI(
    title="Extreme Weather Anomaly Tracking & Downscaling API",
    description="Operational decision-support API serving 5 km amplitude-preserving downscaled guidance and localized alerts.",
    version="0.1.0",
    lifespan=lifespan,
)

# In-memory store for serving precomputed cycle outputs
MOCK_CYCLES = ["2026-10-01T00Z", "2026-10-01T12Z", "2026-10-02T00Z"]

MOCK_ANOMALIES = [
    AnomalySummary(
        track_id="TRK-001",
        hazard_type="cyclone_heavy_rain",
        start_lead_hours=72,
        end_lead_hours=168,
        max_confidence=0.92,
        trajectory=[
            TrajectoryPoint(lead_time_hours=72, lat=14.8, lon=85.2, peak_prob=0.88),
            TrajectoryPoint(lead_time_hours=96, lat=16.3, lon=86.1, peak_prob=0.92),
            TrajectoryPoint(lead_time_hours=120, lat=18.1, lon=86.9, peak_prob=0.91),
            TrajectoryPoint(lead_time_hours=144, lat=19.9, lon=87.4, peak_prob=0.89),
        ],
        bbox_with_margin=[13.0, 83.0, 22.0, 89.0],
    )
]

MOCK_ALERTS = [
    AlertItem(
        alert_id="ALT-TRK-001-LT096",
        anomaly_id="TRK-001",
        type="cyclone_heavy_rain",
        category="severe",
        lead_time_hours=96,
        valid_from="2026-10-05T00:00Z",
        valid_to="2026-10-05T12:00Z",
        core=Coordinates(lat=16.3, lon=86.1),
        radius_km=5.0,
        geometry={
            "type": "Polygon",
            "coordinates": [[[86.05, 16.25], [86.15, 16.25], [86.15, 16.35], [86.05, 16.35], [86.05, 16.25]]],
        },
        peak_value=164.5,
        unit="mm/day",
        exceedance_prob=0.82,
        disclaimer="Decision support for forecasters; thresholds subject to domain agreement.",
    ),
    AlertItem(
        alert_id="ALT-TRK-001-LT120",
        anomaly_id="TRK-001",
        type="cyclone_heavy_rain",
        category="severe",
        lead_time_hours=120,
        valid_from="2026-10-06T00:00Z",
        valid_to="2026-10-06T12:00Z",
        core=Coordinates(lat=18.1, lon=86.9),
        radius_km=5.0,
        geometry={
            "type": "Polygon",
            "coordinates": [[[86.85, 18.05], [86.95, 18.05], [86.95, 18.15], [86.85, 18.15], [86.85, 18.05]]],
        },
        peak_value=192.0,
        unit="mm/day",
        exceedance_prob=0.89,
        disclaimer="Decision support for forecasters; thresholds subject to domain agreement.",
    ),
]


@app.get("/health")
def get_health():
    """Liveness check and system summary."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "last_cycle": MOCK_CYCLES[-1],
        "active_anomalies_count": len(MOCK_ANOMALIES),
        "active_alerts_count": len(MOCK_ALERTS),
        "tracker_model_loaded": tracker_model is not None,
        "downscaler_model_loaded": downscaler_model is not None
    }


@app.get("/v1/cycles", response_model=List[str])
def get_cycles():
    """List available forecast cycles."""
    return MOCK_CYCLES


@app.get("/v1/anomalies", response_model=List[AnomalySummary])
def get_anomalies(cycle: Optional[str] = None):
    """List active detected anomaly tracks for a cycle."""
    return MOCK_ANOMALIES


@app.get("/v1/anomalies/{anomaly_id}", response_model=AnomalySummary)
def get_anomaly_details(anomaly_id: str):
    """Get single anomaly track details across lead times."""
    for a in MOCK_ANOMALIES:
        if a.track_id == anomaly_id:
            return a
    raise HTTPException(status_code=404, detail=f"Anomaly track {anomaly_id} not found")


@app.get("/v1/anomalies/{anomaly_id}/downscaled", response_model=DownscaledResponse)
def get_downscaled_fields(anomaly_id: str, lead_time_hours: int = 96):
    """Retrieve 5 km downscaled impact field statistics for an anomaly region."""
    return DownscaledResponse(
        anomaly_id=anomaly_id,
        lead_time_hours=lead_time_hours,
        grid_resolution_km=5.0,
        variable="total_precipitation",
        unit="mm/day",
        mean_peak_value=142.0,
        max_peak_value=185.0,
        high_impact_area_sqkm=7850.0,
        exceedance_threshold_mm=50.0,
    )


@app.get("/v1/alerts", response_model=List[AlertItem])
def get_alerts(category: Optional[str] = None):
    """List all current alerts, optionally filtered by category (low, moderate, severe)."""
    if category:
        return [a for a in MOCK_ALERTS if a.category.lower() == category.lower()]
    return MOCK_ALERTS


@app.post("/v1/alerts/query", response_model=List[AlertItem])
def query_alerts(query: AlertQueryRequest):
    """Query alerts matching location, radius, or time window."""
    results = []
    for alert in MOCK_ALERTS:
        if query.category and alert.category.lower() != query.category.lower():
            continue
        if query.min_lead_time_hours and alert.lead_time_hours < query.min_lead_time_hours:
            continue
        if query.max_lead_time_hours and alert.lead_time_hours > query.max_lead_time_hours:
            continue
        if query.point:
            # Check Euclidean/geodesic distance in km
            d_lat = (alert.core.lat - query.point.lat) * 111.0
            d_lon = (alert.core.lon - query.point.lon) * 111.0 * 0.95
            dist = (d_lat**2 + d_lon**2) ** 0.5
            if dist > (query.radius_km or 25.0):
                continue
        results.append(alert)
    return results
