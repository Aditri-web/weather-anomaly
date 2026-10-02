"""
Tests enforcing zero data leakage: dataset split strictly by event and year.
"""

import pytest
from src.data.dataset import WeatherAnomalyDataset
import numpy as np


def test_strict_event_and_year_leakage():
    # Build synthetic sample records across multiple years and events
    samples = []
    events = [
        ("cyclone_hudhud_2014", 2014),
        ("cyclone_fani_2019", 2019),
        ("cyclone_amphan_2020", 2020),
    ]

    for event_id, year in events:
        for day in range(3):
            samples.append({
                "event_id": event_id,
                "year": year,
                "date": f"{year}-05-{10+day:02d}",
                "coarse_field": np.ones((1, 8, 8), dtype=np.float32),
                "static_fields": np.zeros((1, 16, 16), dtype=np.float32),
                "target_field": np.ones((1, 16, 16), dtype=np.float32),
                "center_coords": (15.0, 85.0),
                "anomaly_mask": np.ones((8, 8), dtype=np.float32),
            })

    # Partitions
    train_dataset = WeatherAnomalyDataset(samples, split="train", allowed_years=[2014])
    val_dataset = WeatherAnomalyDataset(samples, split="val", allowed_years=[2019])
    test_dataset = WeatherAnomalyDataset(samples, split="test", allowed_years=[2020])

    train_years = {s["year"] for s in train_dataset.samples}
    val_years = {s["year"] for s in val_dataset.samples}
    test_years = {s["year"] for s in test_dataset.samples}

    train_events = {s["event_id"] for s in train_dataset.samples}
    val_events = {s["event_id"] for s in val_dataset.samples}
    test_events = {s["event_id"] for s in test_dataset.samples}

    # Assert no overlap
    assert len(train_years.intersection(val_years)) == 0
    assert len(train_years.intersection(test_years)) == 0
    assert len(val_years.intersection(test_years)) == 0

    assert len(train_events.intersection(val_events)) == 0
    assert len(train_events.intersection(test_events)) == 0
    assert len(val_events.intersection(test_events)) == 0

    assert len(test_dataset) == 3
    assert "cyclone_amphan_2020" in test_events
