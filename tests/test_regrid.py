"""
Unit tests for spatial regridding: Bilinear and Conservative Remapping on integer and non-integer grids.
"""

import numpy as np
import pytest
from src.data.regrid import regrid_bilinear, regrid_conservative_2d


def test_bilinear_regrid_shapes():
    data = np.arange(16).reshape(4, 4).astype(np.float32)
    src_lats = np.linspace(10.0, 20.0, 4)
    src_lons = np.linspace(80.0, 90.0, 4)

    target_lats = np.linspace(10.0, 20.0, 8)
    target_lons = np.linspace(80.0, 90.0, 8)

    out = regrid_bilinear(data, src_lats, src_lons, target_lats, target_lons)
    assert out.shape == (8, 8)


def test_conservative_regrid_integer_scale():
    # 5x scaling: 0.25° to 0.05°
    data = np.random.uniform(10.0, 100.0, size=(10, 10))
    scale_factor = 5.0

    regridded = regrid_conservative_2d(data, scale_factor=scale_factor)
    assert regridded.shape == (50, 50)

    # Volume conservation under spatial upsampling:
    # Each coarse cell is divided into 25 fine cells.
    # Total precipitation volume: sum(fine) / (scale_factor^2) == sum(coarse)
    coarse_sum = np.sum(data)
    fine_sum_normalized = np.sum(regridded) / (scale_factor**2)
    np.testing.assert_allclose(fine_sum_normalized, coarse_sum, rtol=1e-3)


def test_conservative_regrid_non_integer_scale():
    # 2.4x scaling: 12 km (NEPS-G) to 5 km target grid
    data = np.random.uniform(5.0, 80.0, size=(15, 15))
    scale_factor = 2.4

    regridded = regrid_conservative_2d(data, scale_factor=scale_factor)
    expected_h = int(round(15 * 2.4))  # 36
    expected_w = int(round(15 * 2.4))  # 36
    assert regridded.shape == (expected_h, expected_w)

    coarse_sum = np.sum(data)
    fine_sum_normalized = np.sum(regridded) / (scale_factor**2)
    np.testing.assert_allclose(fine_sum_normalized, coarse_sum, rtol=1e-3)
