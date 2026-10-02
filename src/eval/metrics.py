"""
Meteorological and Probabilistic Verification Metrics.
Computes POD, FAR, CSI, Peak Error, Quantile Errors (95/99/99.9), CRPS, and Spectral Fidelity.
"""

from typing import Dict, Any, List
import numpy as np


def compute_contingency_metrics(
    pred_binary: np.ndarray,
    target_binary: np.ndarray,
) -> Dict[str, float]:
    """
    Compute 2x2 contingency table metrics: POD, FAR, CSI.
    """
    hits = np.sum((pred_binary == 1) & (target_binary == 1))
    false_alarms = np.sum((pred_binary == 1) & (target_binary == 0))
    misses = np.sum((pred_binary == 0) & (target_binary == 1))
    correct_negatives = np.sum((pred_binary == 0) & (target_binary == 0))

    pod = float(hits / (hits + misses + 1e-8))
    far = float(false_alarms / (hits + false_alarms + 1e-8))
    csi = float(hits / (hits + false_alarms + misses + 1e-8))

    return {
        "hits": int(hits),
        "false_alarms": int(false_alarms),
        "misses": int(misses),
        "correct_negatives": int(correct_negatives),
        "pod": pod,
        "far": far,
        "csi": csi,
    }


def compute_extreme_quantile_metrics(
    pred: np.ndarray,
    target: np.ndarray,
) -> Dict[str, float]:
    """
    Computes absolute and relative errors at the 95th, 99th, and 99.9th percentiles.
    """
    metrics = {}
    for q in [95.0, 99.0, 99.9]:
        q_pred = float(np.percentile(pred, q))
        q_target = float(np.percentile(target, q))
        metrics[f"p{q}_pred"] = q_pred
        metrics[f"p{q}_target"] = q_target
        metrics[f"p{q}_error"] = float(abs(q_pred - q_target))

    peak_pred = float(np.max(pred))
    peak_target = float(np.max(target))
    metrics["peak_pred"] = peak_pred
    metrics["peak_target"] = peak_target
    metrics["peak_error"] = float(abs(peak_pred - peak_target))
    return metrics


def compute_crps_ensemble(
    samples: np.ndarray,  # (N_samples, H, W)
    observation: np.ndarray,  # (H, W)
) -> float:
    """
    Compute Continuous Ranked Probability Score (CRPS) across ensemble/generative samples.
    CRPS(F, y) = E|X - y| - 0.5 * E|X - X'|
    """
    n_samples = samples.shape[0]
    # E|X - y|
    diff_obs = np.mean(np.abs(samples - observation), axis=0)

    # E|X - X'|
    diff_pairs = 0.0
    for i in range(n_samples):
        for j in range(n_samples):
            diff_pairs += np.abs(samples[i] - samples[j])
    diff_pairs = diff_pairs / (n_samples * n_samples)

    crps_map = diff_obs - 0.5 * diff_pairs
    return float(np.mean(crps_map))
