"""
Meteorological and Probabilistic Verification Metrics.
Computes Confidence, Precision, POD (Recall), F1, FAR, CSI, Brier Score,
RMSE, MAE, Peak Error, Quantile Errors (95/99/99.9), CRPS, and Spectral Fidelity.
"""

from typing import Dict, Any, List, Tuple
import numpy as np


def compute_contingency_metrics(
    pred_binary: np.ndarray,
    target_binary: np.ndarray,
    pred_probs: np.ndarray = None,
) -> Dict[str, float]:
    """
    Compute classification and contingency verification metrics:
    Precision, Recall (POD), F1-Score, False Alarm Ratio (FAR), Critical Success Index (CSI),
    and Average Model Confidence.
    """
    hits = np.sum((pred_binary == 1) & (target_binary == 1))
    false_alarms = np.sum((pred_binary == 1) & (target_binary == 0))
    misses = np.sum((pred_binary == 0) & (target_binary == 1))
    correct_negatives = np.sum((pred_binary == 0) & (target_binary == 0))

    precision = float(hits / (hits + false_alarms + 1e-8))
    pod = float(hits / (hits + misses + 1e-8))  # Recall / Probability of Detection
    far = float(false_alarms / (hits + false_alarms + 1e-8))
    csi = float(hits / (hits + false_alarms + misses + 1e-8))  # Threat Score
    f1 = float(2.0 * precision * pod / (precision + pod + 1e-8))

    mean_confidence = 0.0
    brier_score = 0.0
    if pred_probs is not None:
        if np.sum(pred_binary == 1) > 0:
            mean_confidence = float(np.mean(pred_probs[pred_binary == 1]))
        else:
            mean_confidence = float(np.mean(pred_probs))
        brier_score = float(np.mean((pred_probs - target_binary) ** 2))

    return {
        "hits": int(hits),
        "false_alarms": int(false_alarms),
        "misses": int(misses),
        "correct_negatives": int(correct_negatives),
        "precision": precision,
        "recall_pod": pod,
        "f1_score": f1,
        "far": far,
        "csi": csi,
        "mean_confidence": mean_confidence,
        "brier_score": brier_score,
    }


def compute_downscaling_accuracy(
    pred: np.ndarray,
    target: np.ndarray,
) -> Dict[str, float]:
    """
    Standard regression errors: MAE, RMSE, and Relative Absolute Error.
    """
    error = pred - target
    mae = float(np.mean(np.abs(error)))
    rmse = float(np.sqrt(np.mean(error ** 2)))
    mean_target = float(np.mean(np.abs(target))) + 1e-6
    rel_error = float(mae / mean_target)

    return {
        "mae": mae,
        "rmse": rmse,
        "relative_error": rel_error,
    }


def compute_extreme_quantile_metrics(
    pred: np.ndarray,
    target: np.ndarray,
) -> Dict[str, float]:
    """
    Computes absolute and relative errors at the 95th, 99th, and 99.9th percentiles,
    plus peak error.
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


def compute_spectral_fidelity(
    pred: np.ndarray,
    target: np.ndarray,
) -> float:
    """
    Computes ratio of high-wavenumber Fourier energy between prediction and ground truth.
    A ratio near 1.0 indicates realistic sharp peaks without spectral smoothing.
    """
    fft_pred = np.fft.rfft2(pred)
    fft_target = np.fft.rfft2(target)

    psd_pred = np.abs(fft_pred) ** 2
    psd_target = np.abs(fft_target) ** 2

    ratio = float(np.mean(psd_pred) / (np.mean(psd_target) + 1e-8))
    return ratio


def compute_crps_ensemble(
    samples: np.ndarray,  # (N_samples, H, W)
    observation: np.ndarray,  # (H, W)
) -> float:
    """
    Compute Continuous Ranked Probability Score (CRPS) across ensemble/generative samples.
    CRPS(F, y) = E|X - y| - 0.5 * E|X - X'|
    """
    n_samples = samples.shape[0]
    diff_obs = np.mean(np.abs(samples - observation), axis=0)

    diff_pairs = 0.0
    for i in range(n_samples):
        for j in range(n_samples):
            diff_pairs += np.abs(samples[i] - samples[j])
    diff_pairs = diff_pairs / (n_samples * n_samples)

    crps_map = diff_obs - 0.5 * diff_pairs
    return float(np.mean(crps_map))
