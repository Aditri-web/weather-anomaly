"""
Abstract interfaces for forecast data sources and high-resolution targets.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Tuple
import numpy as np


class DataSource(ABC):
    """Abstract interface for forecast / reanalysis coarse input datasets."""

    @abstractmethod
    def get_source_name(self) -> str:
        """Return standardized source identifier."""
        pass

    @abstractmethod
    def load_field(
        self,
        date_str: str,
        lead_time_hours: int = 0,
        bbox: Optional[Tuple[float, float, float, float]] = None,
    ) -> Dict[str, Any]:
        """
        Load meteorological forecast/reanalysis field.
        
        Args:
            date_str: Target date in YYYY-MM-DD format.
            lead_time_hours: Forecast lead time in hours.
            bbox: (min_lat, min_lon, max_lat, max_lon) in degrees.
            
        Returns:
            Dictionary containing:
                - 'data': np.ndarray of shape (channels/ensemble, lat, lon)
                - 'latitudes': 1D np.ndarray
                - 'longitudes': 1D np.ndarray
                - 'variable': str (e.g. 'total_precipitation')
                - 'units': str (e.g. 'mm/day' or 'm')
                - 'lead_time_hours': int
        """
        pass


class TargetSource(ABC):
    """Abstract interface for high-resolution ground-truth verification and targets."""

    @abstractmethod
    def get_source_name(self) -> str:
        """Return standardized target identifier."""
        pass

    @abstractmethod
    def load_target(
        self,
        date_str: str,
        bbox: Optional[Tuple[float, float, float, float]] = None,
    ) -> Dict[str, Any]:
        """
        Load high-resolution ground truth field.
        
        Args:
            date_str: Target date in YYYY-MM-DD format.
            bbox: (min_lat, min_lon, max_lat, max_lon) in degrees.
            
        Returns:
            Dictionary containing:
                - 'data': np.ndarray of shape (lat, lon)
                - 'latitudes': 1D np.ndarray
                - 'longitudes': 1D np.ndarray
                - 'variable': str
                - 'units': str
        """
        pass
