"""
Physics-informed loss terms and anti-hallucination constraints for downscaling.
Includes:
- Aggregation consistency loss (coarse conservation under downsampling)
- Radially averaged power spectrum loss (high-frequency spectral fidelity)
- Tail-weighted / extreme quantile loss (95th, 99th, 99.9th percentiles)
- Hallucination detection guard
"""

from typing import Tuple, Dict, Any
import torch
import torch.nn as nn
import torch.nn.functional as F


class AggregationConsistencyLoss(nn.Module):
    """
    Guards against generative hallucination by penalizing deviations between
    the spatial average of the downscaled field and the corresponding coarse-grid input:
    L_agg = || AvgPool(y_hat) - x_coarse ||_1
    """

    def __init__(self, scale_factor: int = 5):
        super().__init__()
        self.scale_factor = scale_factor
        self.pool = nn.AvgPool2d(kernel_size=scale_factor, stride=scale_factor)

    def forward(self, pred_high_res: torch.Tensor, coarse_input: torch.Tensor) -> torch.Tensor:
        pooled = self.pool(pred_high_res)
        # Ensure spatial matching
        if pooled.shape[-2:] != coarse_input.shape[-2:]:
            pooled = F.interpolate(pooled, size=coarse_input.shape[-2:], mode="bilinear", align_corners=False)
        return F.l1_loss(pooled, coarse_input)


class RadiallyAveragedSpectralLoss(nn.Module):
    """
    Penalizes spectral smoothing by enforcing fidelity in the 2D Fourier power spectrum.
    Preserves high-wavenumber energy corresponding to localized convective rain peaks.
    """

    def __init__(self):
        super().__init__()

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        # Compute 2D FFT
        fft_pred = torch.fft.rfft2(pred, norm="ortho")
        fft_target = torch.fft.rfft2(target, norm="ortho")

        # Power spectral density
        psd_pred = torch.abs(fft_pred) ** 2
        psd_target = torch.abs(fft_target) ** 2

        # Log-spectral distance
        log_diff = torch.log(psd_pred + 1e-6) - torch.log(psd_target + 1e-6)
        return torch.mean(torch.abs(log_diff))


class ExtremeQuantileLoss(nn.Module):
    """
    Tail-weighted loss focusing on extreme upper percentiles (e.g. 95th, 99th, 99.9th).
    Ensures that generative sampling does not underestimate extreme disaster-scale peaks.
    """

    def __init__(self, quantiles=(0.95, 0.99, 0.999)):
        super().__init__()
        self.quantiles = quantiles

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        total_loss = 0.0
        for q in self.quantiles:
            error = target - pred
            # Pinball loss: max(q * e, (q - 1) * e)
            loss_q = torch.maximum(q * error, (q - 1.0) * error)
            total_loss += torch.mean(loss_q)
        return total_loss / len(self.quantiles)


class PhysicsCompositeLoss(nn.Module):
    """
    Composite loss combining standard regression, aggregation consistency,
    spectral fidelity, and extreme quantile penalties.
    """

    def __init__(
        self,
        w_l1: float = 1.0,
        w_agg: float = 0.5,
        w_spectral: float = 0.2,
        w_quantile: float = 0.3,
        scale_factor: int = 5,
    ):
        super().__init__()
        self.w_l1 = w_l1
        self.w_agg = w_agg
        self.w_spectral = w_spectral
        self.w_quantile = w_quantile

        self.agg_loss = AggregationConsistencyLoss(scale_factor=scale_factor)
        self.spectral_loss = RadiallyAveragedSpectralLoss()
        self.quantile_loss = ExtremeQuantileLoss()

    def forward(
        self,
        pred_high_res: torch.Tensor,
        target_high_res: torch.Tensor,
        coarse_input: torch.Tensor,
    ) -> Dict[str, torch.Tensor]:
        l1 = F.l1_loss(pred_high_res, target_high_res)
        l_agg = self.agg_loss(pred_high_res, coarse_input)
        l_spec = self.spectral_loss(pred_high_res, target_high_res)
        l_quant = self.quantile_loss(pred_high_res, target_high_res)

        total = (
            self.w_l1 * l1
            + self.w_agg * l_agg
            + self.w_spectral * l_spec
            + self.w_quantile * l_quant
        )

        return {
            "total_loss": total,
            "l1_loss": l1,
            "agg_consistency_loss": l_agg,
            "spectral_loss": l_spec,
            "extreme_quantile_loss": l_quant,
        }


def check_hallucination_guard(
    sample_high_res: torch.Tensor,
    coarse_input: torch.Tensor,
    scale_factor: int = 5,
    relative_tolerance: float = 0.35,
) -> Tuple[bool, float]:
    """
    Flags whether a generated downscaled sample deviates from the coarse input beyond tolerance.
    Returns:
        (is_flagged, relative_error)
    """
    pooled = F.avg_pool2d(sample_high_res, kernel_size=scale_factor, stride=scale_factor)
    if pooled.shape[-2:] != coarse_input.shape[-2:]:
        pooled = F.interpolate(pooled, size=coarse_input.shape[-2:], mode="bilinear", align_corners=False)

    coarse_mass = torch.sum(torch.abs(coarse_input)).item() + 1e-6
    mass_diff = torch.sum(torch.abs(pooled - coarse_input)).item()
    rel_error = mass_diff / coarse_mass

    is_flagged = bool(rel_error > relative_tolerance)
    return is_flagged, float(rel_error)
