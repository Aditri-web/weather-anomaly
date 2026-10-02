"""
Integration tests for Alert Engine and FastAPI REST endpoints.
"""

import pytest
import numpy as np
from fastapi.testclient import TestClient
from api.main import app
from src.alerts.engine import AlertEngine


@pytest.fixture
def client():
    return TestClient(app)


def test_alert_engine_rules():
    engine = AlertEngine(
        base_threshold_mm=30.0,
        high_threshold_mm=60.0,
        extreme_threshold_mm=100.0,
    )
    lats = np.linspace(15.0, 16.0, 10)
    lons = np.linspace(85.0, 86.0, 10)

    # Severe case: peak = 140 mm/day
    mean_map = np.ones((10, 10)) * 50.0
    mean_map[5, 5] = 120.0
    peak_map = np.ones((10, 10)) * 60.0
    peak_map[5, 5] = 140.0
    prob_map = np.ones((10, 10)) * 0.75

    alert = engine.generate_alerts_for_anomaly(
        anomaly_id="TRK-999",
        hazard_type="cyclone_heavy_rain",
        lead_time_hours=96,
        valid_from="2026-10-06T00:00Z",
        valid_to="2026-10-06T12:00Z",
        downscaled_mean=mean_map,
        downscaled_peak=peak_map,
        exceedance_prob_map=prob_map,
        lats=lats,
        lons=lons,
        efi_value=0.85,
    )

    assert alert is not None
    assert alert["category"] == "severe"
    assert alert["radius_km"] == 5.0
    assert alert["geometry"]["type"] == "Polygon"
    assert len(alert["geometry"]["coordinates"][0]) == 32


def test_api_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_api_anomalies(client):
    res = client.get("/v1/anomalies")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    t_id = data[0]["track_id"]

    res_detail = client.get(f"/v1/anomalies/{t_id}")
    assert res_detail.status_code == 200
    assert res_detail.json()["track_id"] == t_id


def test_api_alerts_and_query(client):
    res = client.get("/v1/alerts")
    assert res.status_code == 200
    alerts = res.json()
    assert len(alerts) > 0

    # Query with radius filter
    query_payload = {
        "point": {"lat": 16.3, "lon": 86.1},
        "radius_km": 50.0,
        "category": "severe",
    }
    res_query = client.post("/v1/alerts/query", json=query_payload)
    assert res_query.status_code == 200
    matched = res_query.json()
    assert len(matched) >= 1
