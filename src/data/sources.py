"""
Concrete implementations of DataSource and TargetSource interfaces,
including real loaders, test/synthetic generators, and explicit stubs.
"""

from typing import Dict, Any, Optional, Tuple
import numpy as np
from src.data.interfaces import DataSource, TargetSource


class SyntheticForecastSource(DataSource):
    """
    Synthetic forecast generator producing physically plausible meteorological fields
    (cyclonic vortex, rainfall bands, ensemble spread) for testing without large downloads.
    """

    def __init__(
        self,
        grid_res_deg: float = 0.25,
        num_members: int = 10,
        seed: int = 42,
    ):
        self.grid_res_deg = grid_res_deg
        self.num_members = num_members
        self.seed = seed

    def get_source_name(self) -> str:
        return "synthetic_forecast"

    def load_field(
        self,
        date_str: str,
        lead_time_hours: int = 0,
        bbox: Optional[Tuple[float, float, float, float]] = None,
    ) -> Dict[str, Any]:
        min_lat, min_lon, max_lat, max_lon = bbox or (10.0, 80.0, 25.0, 95.0)
        lats = np.arange(min_lat, max_lat, self.grid_res_deg)
        lons = np.arange(min_lon, max_lon, self.grid_res_deg)
        lon_grid, lat_grid = np.meshgrid(lons, lats)

        rng = np.random.RandomState(
            abs(hash(f"{date_str}_{lead_time_hours}_{self.seed}")) % (2**31)
        )

        # Simulate a moving cyclone center
        center_lat = 15.0 + (lead_time_hours / 24.0) * 1.5
        center_lon = 85.0 + (lead_time_hours / 24.0) * 1.2

        # Distance from vortex center (degrees)
        dist = np.sqrt((lat_grid - center_lat) ** 2 + (lon_grid - center_lon) ** 2)

        # Base precipitation intensity (peak ~ 180 mm/day decaying radially)
        base_vortex = 180.0 * np.exp(-(dist**2) / (2.0 * (1.8**2)))
        # Background light rain
        bg = rng.exponential(scale=3.0, size=lat_grid.shape)

        ensemble = []
        for m in range(self.num_members):
            member_rng = np.random.RandomState(
                abs(hash(f"{date_str}_{lead_time_hours}_{m}")) % (2**31)
            )
            # Ensemble position perturbation (~0.3 deg) & intensity perturbation
            jitter_lat = member_rng.normal(0, 0.3)
            jitter_lon = member_rng.normal(0, 0.3)
            m_dist = np.sqrt(
                (lat_grid - (center_lat + jitter_lat)) ** 2
                + (lon_grid - (center_lon + jitter_lon)) ** 2
            )
            m_intensity = member_rng.uniform(0.85, 1.20)
            m_field = m_intensity * 180.0 * np.exp(-(m_dist**2) / (2.0 * (1.8**2)))
            m_noise = member_rng.gamma(shape=1.5, scale=2.0, size=lat_grid.shape)
            field = np.clip(m_field + bg + m_noise, 0.0, 450.0)
            ensemble.append(field)

        return {
            "data": np.stack(ensemble, axis=0),  # (members, n_lat, n_lon)
            "latitudes": lats,
            "longitudes": lons,
            "variable": "total_precipitation",
            "units": "mm/day",
            "lead_time_hours": lead_time_hours,
        }


class SyntheticTargetSource(TargetSource):
    """
    Synthetic high-resolution target generator (e.g. simulating 5 km CHIRPS ground truth).
    """

    def __init__(self, grid_res_deg: float = 0.05, seed: int = 42):
        self.grid_res_deg = grid_res_deg
        self.seed = seed

    def get_source_name(self) -> str:
        return "synthetic_target_5km"

    def load_target(
        self,
        date_str: str,
        bbox: Optional[Tuple[float, float, float, float]] = None,
    ) -> Dict[str, Any]:
        min_lat, min_lon, max_lat, max_lon = bbox or (10.0, 80.0, 25.0, 95.0)
        lats = np.arange(min_lat, max_lat, self.grid_res_deg)
        lons = np.arange(min_lon, max_lon, self.grid_res_deg)
        lon_grid, lat_grid = np.meshgrid(lons, lats)

        rng = np.random.RandomState(abs(hash(f"target_{date_str}_{self.seed}")) % (2**31))

        # Ground truth high-res vortex with fine-scale convective rainbands
        center_lat = 15.0
        center_lon = 85.0
        dist = np.sqrt((lat_grid - center_lat) ** 2 + (lon_grid - center_lon) ** 2)
        theta = np.arctan2(lat_grid - center_lat, lon_grid - center_lon)

        spiral_arm = np.sin(3.0 * theta - dist * 1.5)
        core_peak = 240.0 * np.exp(-(dist**2) / (2.0 * (1.5**2)))
        bands = 45.0 * np.maximum(spiral_arm, 0.0) * np.exp(-dist / 4.0)
        noise = rng.gamma(shape=1.2, scale=1.5, size=lat_grid.shape)

        target_field = np.clip(core_peak + bands + noise, 0.0, 500.0)

        return {
            "data": target_field,  # (n_lat, n_lon)
            "latitudes": lats,
            "longitudes": lons,
            "variable": "total_precipitation",
            "units": "mm/day",
        }


class ERA5Source(DataSource):
    """ERA5 Reanalysis loader via local file cache or Copernicus CDS API."""

    def __init__(self, cache_dir: str = "data/raw/era5"):
        self.cache_dir = cache_dir

    def get_source_name(self) -> str:
        return "era5_reanalysis"

    def load_field(
        self,
        date_str: str,
        lead_time_hours: int = 0,
        bbox: Optional[Tuple[float, float, float, float]] = None,
    ) -> Dict[str, Any]:
        # If cache exists on disk, load it; otherwise notify user of CDS requirements
        import os

        cached_file = os.path.join(self.cache_dir, f"era5_{date_str}.npy")
        if os.path.exists(cached_file):
            data = np.load(cached_file, allow_pickle=True).item()
            return data
        raise FileNotFoundError(
            f"ERA5 file for {date_str} not found in {self.cache_dir}. "
            "Please configure ~/.cdsapirc and run scripts/download_data.py --source era5 "
            "or use SyntheticForecastSource for offline testing."
        )


class ChirpsSource(TargetSource):
    """CHIRPS 0.05° daily precipitation loader."""

    def __init__(self, cache_dir: str = "data/raw/chirps"):
        self.cache_dir = cache_dir

    def get_source_name(self) -> str:
        return "chirps_daily_0.05deg"

    def load_target(
        self,
        date_str: str,
        bbox: Optional[Tuple[float, float, float, float]] = None,
    ) -> Dict[str, Any]:
        import os

        cached_file = os.path.join(self.cache_dir, f"chirps_{date_str}.npy")
        if os.path.exists(cached_file):
            data = np.load(cached_file, allow_pickle=True).item()
            return data
        raise FileNotFoundError(
            f"CHIRPS file for {date_str} not found in {self.cache_dir}. "
            "Please run scripts/download_data.py --source chirps "
            "or use SyntheticTargetSource for offline testing."
        )


# --- Honest Stubs for unsupplied datasets ---


class NepsGSource(DataSource):
    """Stub for NCMRWF Global Ensemble Prediction System (NEPS-G 12 km)."""

    def get_source_name(self) -> str:
        return "neps_g_12km"

    def load_field(
        self,
        date_str: str,
        lead_time_hours: int = 0,
        bbox: Optional[Tuple[float, float, float, float]] = None,
    ) -> Dict[str, Any]:
        raise NotImplementedError(
            "NEPS-G 12 km forecast archive access is pending official NCMRWF data agreement. "
            "Use ERA5Source or SyntheticForecastSource in the interim. "
            "See docs/NEPSG_INTEGRATION.md for details."
        )


class NcumSource(DataSource):
    """Stub for NCUM deterministic 12 km model."""

    def get_source_name(self) -> str:
        return "ncum_12km"

    def load_field(
        self,
        date_str: str,
        lead_time_hours: int = 0,
        bbox: Optional[Tuple[float, float, float, float]] = None,
    ) -> Dict[str, Any]:
        raise NotImplementedError(
            "NCUM deterministic archive not yet provided. See docs/DATA_LIMITATIONS.md."
        )


class ImdaaSource(DataSource):
    """Stub for IMDAA 12 km regional reanalysis."""

    def get_source_name(self) -> str:
        return "imdaa_12km"

    def load_field(
        self,
        date_str: str,
        lead_time_hours: int = 0,
        bbox: Optional[Tuple[float, float, float, float]] = None,
    ) -> Dict[str, Any]:
        raise NotImplementedError(
            "IMDAA reanalysis archive not yet configured. See docs/DATA_LIMITATIONS.md."
        )


class RadarSource(TargetSource):
    """Stub for IMD Doppler Weather Radar (DWR) quantitative precipitation estimates."""

    def get_source_name(self) -> str:
        return "imd_dwr_radar"

    def load_target(
        self,
        date_str: str,
        bbox: Optional[Tuple[float, float, float, float]] = None,
    ) -> Dict[str, Any]:
        raise NotImplementedError(
            "IMD Doppler Weather Radar archive not configured. Use ChirpsSource for MVP."
        )
