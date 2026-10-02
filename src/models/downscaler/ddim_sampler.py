"""
DDIM (Denoising Diffusion Implicit Models) fast sampler for residual diffusion downscaling.
Supports 20 to 50 sampling steps with deterministic or stochastic noise paths.
"""

from typing import Tuple, Optional
import torch
import torch.nn as nn
import numpy as np


class DDIMSampler(nn.Module):
    """
    DDIM Sampler implementing linear or cosine beta schedules.
    Inherits nn.Module so buffers move with the parent model to GPU/CPU.
    """

    def __init__(
        self,
        num_train_timesteps: int = 1000,
        beta_start: float = 0.0001,
        beta_end: float = 0.02,
        device: str = "cpu",
    ):
        super().__init__()
        self.num_train_timesteps = num_train_timesteps

        betas = torch.linspace(beta_start, beta_end, num_train_timesteps, dtype=torch.float32)
        alphas = 1.0 - betas
        alphas_cumprod = torch.cumprod(alphas, dim=0)

        self.register_buffer("betas", betas)
        self.register_buffer("alphas", alphas)
        self.register_buffer("alphas_cumprod", alphas_cumprod)
        self.register_buffer("sqrt_alphas_cumprod", torch.sqrt(alphas_cumprod))
        self.register_buffer("sqrt_one_minus_alphas_cumprod", torch.sqrt(1.0 - alphas_cumprod))

    def sample(
        self,
        model: nn.Module,
        shape: Tuple[int, int, int, int],
        conditioning: torch.Tensor,
        num_inference_steps: int = 25,
        eta: float = 0.0,
    ) -> torch.Tensor:
        """
        Generate samples from pure Gaussian noise using DDIM reverse steps.
        
        Args:
            model: ResidualDenoiserUNet instance
            shape: (B, C, H, W)
            conditioning: (B, cond_C, H, W)
            num_inference_steps: Number of sampling steps (e.g. 20-50)
            eta: 0.0 for deterministic DDIM, 1.0 for standard DDPM
        """
        device = conditioning.device
        b, c, h, w = shape

        # Initial pure Gaussian noise
        x_t = torch.randn(shape, device=device)

        # Timestep grid: equally spaced sub-sequence of training timesteps
        step_ratio = self.num_train_timesteps // num_inference_steps
        timesteps = (
            torch.arange(0, num_inference_steps, device=device) * step_ratio
        ).flip(0)

        for i, t in enumerate(timesteps):
            t_batch = torch.full((b,), t, device=device, dtype=torch.long)
            # Predict noise
            with torch.no_grad():
                pred_noise = model(x_t, t_batch, conditioning)

            alpha_t = self.alphas_cumprod[t].to(device)
            t_prev = timesteps[i + 1] if i < len(timesteps) - 1 else -1
            alpha_prev = self.alphas_cumprod[t_prev].to(device) if t_prev >= 0 else torch.tensor(1.0, device=device)

            # Predict clean x0
            pred_x0 = (x_t - torch.sqrt(torch.clamp(1.0 - alpha_t, min=1e-8)) * pred_noise) / torch.sqrt(torch.clamp(alpha_t, min=1e-8))

            # DDIM step: sigma_t is 0 for deterministic sampling (eta=0)
            if eta > 0.0 and t_prev >= 0:
                sigma_t = eta * torch.sqrt(
                    torch.clamp(
                        (1.0 - alpha_prev) / (1.0 - alpha_t + 1e-8) * (1.0 - alpha_t / (alpha_prev + 1e-8)),
                        min=0.0,
                    )
                )
                noise = torch.randn_like(x_t)
            else:
                sigma_t = 0.0
                noise = 0.0

            dir_xt = torch.sqrt(torch.clamp(1.0 - alpha_prev - sigma_t**2, min=0.0)) * pred_noise
            x_t = torch.sqrt(alpha_prev) * pred_x0 + dir_xt + sigma_t * noise

        return x_t
