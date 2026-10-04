"""
Pydantic schemas for the Alerting and Downscaling REST API.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class Coordinates(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude in degrees")
    lon: float = Field(..., ge=-180.0, le=180.0, description="Longitude in degrees")


class TrajectoryPoint(BaseModel):
    lead_time_hours: int
    lat: float
    lon: float
    peak_prob: float


class AnomalySummary(BaseModel):
    track_id: str
    hazard_type: str = "cyclone_heavy_rain"
    start_lead_hours: int
    end_lead_hours: int
    max_confidence: float
    trajectory: List[TrajectoryPoint]
    bbox_with_margin: List[float]


class ComparisonData(BaseModel):
    diffusion_peak: float
    regression_blurred_peak: float
    coarse_12km_peak: float
    power_spectrum_ratio: float
    physics_conservation_score: float

class GridMatrixPreview(BaseModel):
    coarse: List[List[float]]
    downscaled: List[List[float]]
    lats: List[float]
    lons: List[float]

class DownscaledResponse(BaseModel):
    anomaly_id: str
    lead_time_hours: int
    grid_resolution_km: float = 5.0
    variable: str = "total_precipitation"
    unit: str = "mm/day"
    mean_peak_value: float
    max_peak_value: float
    high_impact_area_sqkm: float
    exceedance_threshold_mm: float = 50.0
    coarse_grid_size: List[int] = [8, 8]
    downscaled_grid_size: List[int] = [16, 16]
    comparison_data: Optional[ComparisonData] = None
    grid_matrix_preview: Optional[GridMatrixPreview] = None


class AlertQueryRequest(BaseModel):
    point: Optional[Coordinates] = None
    radius_km: Optional[float] = 25.0
    category: Optional[str] = None
    min_lead_time_hours: Optional[int] = 0
    max_lead_time_hours: Optional[int] = 240


class AlertItem(BaseModel):
    alert_id: str
    anomaly_id: str
    type: str
    category: str
    lead_time_hours: int
    valid_from: str
    valid_to: str
    core: Coordinates
    radius_km: float = 5.0
    geometry: Dict[str, Any]
    peak_value: float
    unit: str = "mm/day"
    exceedance_prob: float
    disclaimer: str


class HealthStatus(BaseModel):
    status: str
    version: str
    last_cycle: str
    active_anomalies_count: int
    active_alerts_count: int
