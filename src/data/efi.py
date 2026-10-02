"""
Extreme Forecast Index (EFI) and Shift of Tails (SOT) deterministic transforms.
Adheres strictly to ECMWF formulation:
EFI = (2 / π) * ∫₀¹ (p - F_f(Q_c(p))) / sqrt(p * (1 - p)) dp

Uses trigonometric substitution p = sin²(π/2 * u), u ∈ [0, 1]:
dp / sqrt(p * (1 - p)) = π du
EFI = 2 * ∫₀¹ (sin²(π/2 * u) - F_f(Q_c(p(u)))) du
This eliminates endpoint singularities at 0 and 1, achieving exact integration in [-1.0, 1.0].
"""

import numpy as np
from typing import Tuple


def compute_efi(
    ensemble_values: np.ndarray,
    climatology_quantiles: np.ndarray,
    num_p_steps: int = 100,
) -> np.ndarray:
    """
    Compute Extreme Forecast Index (EFI) comparing ensemble distribution against climatology.
    
    Args:
        ensemble_values: Array of shape (n_members, ...) representing ensemble forecasts.
        climatology_quantiles: Array of shape (n_quantiles, ...) representing climatological
                               percentiles (e.g. 100 quantiles from p=0.01 to 0.99).
        num_p_steps: Number of integration steps (default: 100).
        
    Returns:
        efi: Array of shape (...) with values strictly bounded in [-1.0, 1.0].
    """
    n_members = ensemble_values.shape[0]
    spatial_shape = ensemble_values.shape[1:]

    # Integration variable u ∈ [0, 1]
    u_grid = np.linspace(0.005, 0.995, num_p_steps)
    du = 1.0 / num_p_steps

    # p(u) = sin²(π/2 * u)
    theta = 0.5 * np.pi * u_grid
    p_grid = np.sin(theta) ** 2

    n_c_quantiles = climatology_quantiles.shape[0]
    q_indices = np.clip(
        np.floor(p_grid * n_c_quantiles).astype(int), 0, n_c_quantiles - 1
    )

    # Accumulator for the integral
    integral = np.zeros(spatial_shape, dtype=np.float64)

    for i, p in enumerate(p_grid):
        q_idx = q_indices[i]
        q_thresh = climatology_quantiles[q_idx]  # shape (...)

        # Proportion of ensemble members <= climatological quantile Q_c(p)
        f_f = np.mean(ensemble_values <= q_thresh, axis=0)

        # Integrand: 2 * (p - F_f) * du
        integrand = 2.0 * (p - f_f) * du
        integral += integrand

    return np.clip(integral, -1.0, 1.0)


def compute_sot(
    ensemble_values: np.ndarray,
    climatology_quantiles: np.ndarray,
    p_tail: float = 0.90,
    p_extreme: float = 0.99,
) -> np.ndarray:
    """
    Compute Shift of Tails (SOT) index:
    SOT measures how far the extreme forecast tail extends beyond the climatological extreme.
    
    SOT = (Q_f(p_tail) - Q_c(p_extreme)) / (Q_c(p_extreme) - Q_c(p_tail) + eps)
    """
    q_f_tail = np.percentile(ensemble_values, p_tail * 100.0, axis=0)

    n_quantiles = climatology_quantiles.shape[0]
    idx_tail = int(np.clip(p_tail * n_quantiles, 0, n_quantiles - 1))
    idx_extreme = int(np.clip(p_extreme * n_quantiles, 0, n_quantiles - 1))

    q_c_tail = climatology_quantiles[idx_tail]
    q_c_extreme = climatology_quantiles[idx_extreme]

    denom = np.maximum(q_c_extreme - q_c_tail, 1e-4)
    sot = (q_f_tail - q_c_extreme) / denom
    return sot
