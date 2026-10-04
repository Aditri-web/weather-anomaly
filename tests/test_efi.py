"""
Unit tests for the Extreme Forecast Index (EFI) deterministic transform.
"""

import numpy as np
import pytest
from src.data.efi import compute_efi, compute_sot


def test_efi_boundaries_and_shapes():
    n_members = 20
    h, w = 10, 10
    n_quantiles = 100

    # 1. Extreme high anomaly: All ensemble members exceed the 99th percentile of climatology
    clim_q = np.linspace(0.0, 100.0, n_quantiles)[:, None, None] * np.ones((n_quantiles, h, w))
    extreme_ens = np.ones((n_members, h, w)) * 250.0  # Much higher than max climatology (100.0)

    efi_high = compute_efi(extreme_ens, clim_q)
    assert efi_high.shape == (h, w)
    # When ensemble exceeds all climatology quantiles, F_f(Q_c(p)) = 0 for all p.
    # Integral = ∫₀¹ p / sqrt(p(1-p)) dp = π/2
    # EFI = (2/π) * (π/2) = 1.0
    np.testing.assert_allclose(efi_high, 1.0, atol=0.05)

    # 2. Extreme low anomaly: All ensemble members below the 1st percentile of climatology
    low_ens = np.ones((n_members, h, w)) * -50.0
    efi_low = compute_efi(low_ens, clim_q)
    # F_f(Q_c(p)) = 1 for all p -> Integral = -π/2 -> EFI = -1.0
    np.testing.assert_allclose(efi_low, -1.0, atol=0.05)

    # 3. Median climatological forecast: Ensemble matches climatological median
    med_ens = np.random.uniform(0.0, 100.0, size=(100, h, w))
    efi_med = compute_efi(med_ens, clim_q)
    assert np.all(efi_med >= -1.0) and np.all(efi_med <= 1.0)
    assert abs(np.mean(efi_med)) < 0.25


def test_sot_computation():
    n_members = 20
    h, w = 4, 4
    clim_q = np.linspace(0.0, 100.0, 100)[:, None, None] * np.ones((100, h, w))
    ens = np.ones((n_members, h, w)) * 120.0  # 90th percentile is 120, extreme clim is 99.0

    sot = compute_sot(ens, clim_q, p_tail=0.90, p_extreme=0.99)
    assert sot.shape == (h, w)
    # sot > 0 indicates shift beyond the climatological extreme
    assert np.all(sot > 0.0)
