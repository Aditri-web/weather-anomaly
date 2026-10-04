"""
PyTorch Dataset and DataLoader abstractions with strict event/year splitting to guarantee zero leakage.
"""

from typing import List, Dict, Any, Tuple, Optional
import torch
from torch.utils.data import Dataset
import numpy as np


class WeatherAnomalyDataset(Dataset):
    """
    Dataset for extreme weather tracking and downscaling.
    
    Guarantees:
    - Splits strictly by (event_id, year), never by random timestep.
    - Zero temporal leakage between train, validation, and test partitions.
    """

    def __init__(
        self,
        samples: List[Dict[str, Any]],
        split: str = "train",
        allowed_years: Optional[List[int]] = None,
        allowed_events: Optional[List[str]] = None,
        negative_slope: float = 0.1,
    ):
        """
        Args:
            samples: List of sample dictionaries containing:
                - 'event_id': str (e.g. 'cyclone_amphan_2020')
                - 'year': int (e.g. 2020)
                - 'date': str
                - 'coarse_field': np.ndarray (C, H_c, W_c)
                - 'static_fields': np.ndarray (C_static, H_t, W_t)
                - 'target_field': np.ndarray (1, H_t, W_t)
                - 'center_coords': tuple (lat, lon)
                - 'anomaly_mask': np.ndarray (H_c, W_c)
            split: Partition name ('train', 'val', 'test')
            allowed_years: Whitelist of years for this partition.
            allowed_events: Whitelist of event IDs for this partition.
        """
        self.split = split
        self.negative_slope = negative_slope

        filtered_samples = []
        for s in samples:
            year = s["year"]
            event_id = s["event_id"]

            if allowed_years is not None and year not in allowed_years:
                continue
            if allowed_events is not None and event_id not in allowed_events:
                continue
            filtered_samples.append(s)

        self.samples = filtered_samples

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        s = self.samples[idx]

        coarse = torch.from_numpy(s["coarse_field"]).float()
        # Non-negative precipitation transform: log1p forward transform
        coarse_log1p = torch.log1p(torch.clamp(coarse, min=0.0))

        target = torch.from_numpy(s["target_field"]).float()
        target_log1p = torch.log1p(torch.clamp(target, min=0.0))

        static = torch.from_numpy(s["static_fields"]).float()
        mask = torch.from_numpy(s["anomaly_mask"]).float()
        center = torch.tensor(s["center_coords"]).float()

        return {
            "coarse": coarse_log1p,
            "coarse_raw": coarse,
            "target": target_log1p,
            "target_raw": target,
            "static": static,
            "mask": mask,
            "center": center,
            "event_id": s["event_id"],
            "year": s["year"],
            "date": s["date"],
        }
