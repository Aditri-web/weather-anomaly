"""
Alert Engine for hyper-local extreme weather early warning.
Implements core point localization, geodesic 5 km radius buffers, and tiered categorization.
"""

from typing import List, Dict, Any, Tuple, Optional
import numpy as np


class AlertEngine:
    """
    Categorizes localized hazards and builds 5 km radius impact circles around anomaly cores.
    """

    def __init__(
        self,
        base_threshold_mm: float = 35.0,     # Alert threshold for 'low' category (mm/day)
        high_threshold_mm: float = 70.0,     # Alert threshold for 'moderate' (mm/day)
        extreme_threshold_mm: float = 120.0, # Alert threshold for 'severe' (mm/day)
        prob_low: float = 0.30,
        prob_moderate: float = 0.40,
        prob_severe: float = 0.50,
    ):
        self.base_threshold_mm = base_threshold_mm
        self.high_threshold_mm = high_threshold_mm
        self.extreme_threshold_mm = extreme_threshold_mm
        self.prob_low = prob_low
        self.prob_moderate = prob_moderate
        self.prob_severe = prob_severe

    def generate_alerts_for_anomaly(
        self,
        anomaly_id: str,
        hazard_type: str,
        lead_time_hours: int,
        valid_from: str,
        valid_to: str,
        downscaled_mean: np.ndarray,
        downscaled_peak: np.ndarray,
        exceedance_prob_map: np.ndarray,
        lats: np.ndarray,
        lons: np.ndarray,
        efi_value: float = 0.0,
    ) -> Optional[Dict[str, Any]]:
        """
        Produce a categorized alert for an anomaly time slice.
        """
        # 1. Find Core Point (peak of ensemble-mean impact field)
        peak_idx = np.unravel_index(np.argmax(downscaled_mean), downscaled_mean.shape)
        core_lat = float(lats[peak_idx[0]])
        core_lon = float(lons[peak_idx[1]])

        core_peak_val = float(downscaled_peak[peak_idx])
        core_prob = float(exceedance_prob_map[peak_idx])

        # 2. Categorization Rules
        category = None
        if core_prob >= self.prob_severe or core_peak_val >= self.extreme_threshold_mm:
            category = "severe"
        elif core_prob >= self.prob_moderate or efi_value >= 0.70 or core_peak_val >= self.high_threshold_mm:
            category = "moderate"
        elif core_prob >= self.prob_low or core_peak_val >= self.base_threshold_mm:
            category = "low"

        if category is None:
            return None  # Below warning criteria

        # 3. Geodesic 5 km circle approximation in Lat/Lon coordinates
        # 1 deg latitude ~ 111 km -> 5 km radius ~ 5.0 / 111.0 deg
        lat_radius_deg = 5.0 / 111.0
        lon_radius_deg = 5.0 / (111.0 * np.cos(np.radians(core_lat)) + 1e-6)

        num_points = 32
        angles = np.linspace(0, 2 * np.pi, num_points, endpoint=True)
        circle_coords = [
            [
                float(core_lon + lon_radius_deg * np.cos(a)),
                float(core_lat + lat_radius_deg * np.sin(a)),
            ]
            for a in angles
        ]

        geometry = {
            "type": "Polygon",
            "coordinates": [circle_coords],
        }

        return {
            "alert_id": f"ALT-{anomaly_id}-LT{lead_time_hours:03d}",
            "anomaly_id": anomaly_id,
            "type": hazard_type,
            "category": category,
            "lead_time_hours": lead_time_hours,
            "valid_from": valid_from,
            "valid_to": valid_to,
            "core": {
                "lat": round(core_lat, 4),
                "lon": round(core_lon, 4),
            },
            "radius_km": 5.0,
            "geometry": geometry,
            "peak_value": round(core_peak_val, 1),
            "unit": "mm/day",
            "exceedance_prob": round(core_prob, 3),
            "efi_reference": round(efi_value, 3),
            "disclaimer": "Decision support for trained forecasters; thresholds subject to domain agreement.",
        }
