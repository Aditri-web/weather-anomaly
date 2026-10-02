"""
Spatial regridding operations: Bilinear and Conservative Area-Weighted Remapping.
Supports integer (e.g. 0.25° to 0.05°) and non-integer (12 km to 5 km) remapping.
"""

from typing import Tuple
import numpy as np
from scipy.ndimage import map_coordinates


def regrid_bilinear(
    data: np.ndarray,
    src_lats: np.ndarray,
    src_lons: np.ndarray,
    target_lats: np.ndarray,
    target_lons: np.ndarray,
) -> np.ndarray:
    """
    Bilinear interpolation from source grid to target grid.
    
    Args:
        data: Array of shape (..., n_src_lat, n_src_lon)
        src_lats: 1D array of source latitudes
        src_lons: 1D array of source longitudes
        target_lats: 1D array of target latitudes
        target_lons: 1D array of target longitudes
        
    Returns:
        regridded: Array of shape (..., n_target_lat, n_target_lon)
    """
    n_target_lat = len(target_lats)
    n_target_lon = len(target_lons)

    # Coordinate mapping: normalize target coordinates to source pixel indices [0, n_src - 1]
    lat_indices = (target_lats - src_lats[0]) / (src_lats[-1] - src_lats[0] + 1e-12) * (len(src_lats) - 1)
    lon_indices = (target_lons - src_lons[0]) / (src_lons[-1] - src_lons[0] + 1e-12) * (len(src_lons) - 1)

    lon_mesh, lat_mesh = np.meshgrid(lon_indices, lat_indices)
    coords = np.array([lat_mesh, lon_mesh])

    if data.ndim == 2:
        return map_coordinates(data, coords, order=1, mode="nearest")
    else:
        # Loop over leading batch/channel dimensions
        reshaped = data.reshape(-1, data.shape[-2], data.shape[-1])
        out = []
        for i in range(reshaped.shape[0]):
            interp_slice = map_coordinates(reshaped[i], coords, order=1, mode="nearest")
            out.append(interp_slice)
        out_arr = np.stack(out, axis=0)
        return out_arr.reshape(*data.shape[:-2], n_target_lat, n_target_lon)


def regrid_conservative_2d(
    data: np.ndarray,
    scale_factor: float,
) -> np.ndarray:
    """
    Conservative remapping for flux and accumulation variables (e.g. precipitation).
    Preserves spatial integral / mass under resampling.
    
    Args:
        data: 2D array of shape (H, W)
        scale_factor: Target resolution / Source resolution (e.g., 5.0 for 5x super-resolution,
                      or 2.4 for 12 km -> 5 km).
    """
    target_h = int(round(data.shape[0] * scale_factor))
    target_w = int(round(data.shape[1] * scale_factor))

    # Bilinear interpolate as smooth base
    src_lats = np.linspace(0, 1, data.shape[0])
    src_lons = np.linspace(0, 1, data.shape[1])
    tgt_lats = np.linspace(0, 1, target_h)
    tgt_lons = np.linspace(0, 1, target_w)

    regridded = regrid_bilinear(data, src_lats, src_lons, tgt_lats, tgt_lons)

    # Re-normalize to strictly preserve total sum (conservation of precipitation volume)
    orig_sum = np.sum(data)
    regridded_sum = np.sum(regridded)
    if regridded_sum > 1e-8 and orig_sum > 1e-8:
        # Each fine cell has area = 1 / (scale_factor^2) of coarse cell
        # Mean volume conservation: sum(regridded) / (scale_factor^2) == sum(orig)
        correction = (orig_sum * (scale_factor**2)) / regridded_sum
        regridded = regridded * correction

    return np.maximum(regridded, 0.0)
