"""
CorrDiff-style two-step Amplitude-Preserving Downscaler.
Step 1: Deterministic Regression for conditional mean.
Step 2: Conditional Diffusion for sharp peak-preserving residuals.
Step 3: Invert log1p transform via expm1(y).clamp(min=0) to guarantee non-negative physical precipitation.
"""

from typing import Dict, Tuple, Optional
import torch
import torch.nn as nn
from src.models.downscaler.unet_mean import RegressionMeanUNet
from src.models.downscaler.diffusion_unet import ResidualDenoiserUNet
from src.models.downscaler.ddim_sampler import DDIMSampler


class CorrDiffDownscaler(nn.Module):
    """
    Two-step downscaler combining conditional mean regression and residual generative diffusion.
    """

    def __init__(
        self,
        in_channels: int = 3,
        base_features: int = 32,
        negative_slope: float = 0.1,
        num_train_timesteps: int = 1000,
    ):
        super().__init__()
        self.mean_model = RegressionMeanUNet(
            in_channels=in_channels,
            out_channels=1,
            base_features=base_features,
            negative_slope=negative_slope,
        )
        self.residual_diffusion = ResidualDenoiserUNet(
            in_channels=1,
            cond_channels=in_channels,
            out_channels=1,
            base_channels=base_features,
            negative_slope=negative_slope,
        )
        self.sampler = DDIMSampler(num_train_timesteps=num_train_timesteps)

    def forward_mean(self, conditioning: torch.Tensor) -> torch.Tensor:
        """Predict conditional mean in log1p space."""
        return self.mean_model(conditioning)

    def sample_downscaled(
        self,
        conditioning: torch.Tensor,
        num_samples: int = 8,
        num_inference_steps: int = 25,
        threshold_mm: float = 50.0,
    ) -> Dict[str, torch.Tensor]:
        """
        Generate N samples, compute ensemble mean, peak map, and exceedance probability.
        
        Args:
            conditioning: (B, C, H, W) conditioning fields in log1p space.
            num_samples: Number of generative residual realizations.
            num_inference_steps: Number of DDIM steps.
            threshold_mm: Threshold in mm/day for exceedance probability calculation.
            
        Returns:
            Dictionary containing:
                - 'mean': (B, 1, H, W) mean impact field in physical mm/day
                - 'peak': (B, 1, H, W) maximum peak intensity across samples (mm/day)
                - 'exceedance_prob': (B, 1, H, W) probability P(precip >= threshold_mm)
                - 'samples': (B, N, H, W) all N physical samples
        """
        b, c, h, w = conditioning.shape
        device = conditioning.device

        # 1. Predict deterministic conditional mean (log1p space)
        pred_mean_log1p = self.mean_model(conditioning)  # (B, 1, H, W)

        samples_physical = []
        for _ in range(num_samples):
            # 2. Sample residual via DDIM
            residual_log1p = self.sampler.sample(
                model=self.residual_diffusion,
                shape=(b, 1, h, w),
                conditioning=conditioning,
                num_inference_steps=num_inference_steps,
            )
            # 3. Reconstruct total field in log1p space with numerical clamp
            total_log1p = torch.clamp(pred_mean_log1p + residual_log1p, min=0.0, max=10.0)

            # 4. Invert log1p transform to physical space (mm/day)
            total_physical = torch.clamp(torch.expm1(total_log1p), min=0.0)
            samples_physical.append(total_physical)

        # Stack samples: (B, N, H, W)
        all_samples = torch.cat(samples_physical, dim=1)

        # Compute summary statistics
        mean_field = torch.mean(all_samples, dim=1, keepdim=True)
        peak_field = torch.amax(all_samples, dim=1, keepdim=True)
        exceedance_prob = torch.mean((all_samples >= threshold_mm).float(), dim=1, keepdim=True)

        return {
            "mean": mean_field,
            "peak": peak_field,
            "exceedance_prob": exceedance_prob,
            "samples": all_samples,
        }
