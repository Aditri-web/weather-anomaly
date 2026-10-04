"""
Conditional Residual Denoising U-Net for Diffusion Downscaling.
Predicts noise/residual on high-resolution fields conditioned on coarse & static fields.
Strictly adheres to: LeakyReLU everywhere via make_activation(), including in timestep embedding!
"""

import math
import torch
import torch.nn as nn
from src.utils.activations import make_activation


class SinusoidalTimeEmbedding(nn.Module):
    """Sinusoidal position embedding for diffusion timesteps."""

    def __init__(self, embed_dim: int):
        super().__init__()
        self.embed_dim = embed_dim

    def forward(self, timesteps: torch.Tensor) -> torch.Tensor:
        half_dim = self.embed_dim // 2
        emb_scale = math.log(10000.0) / (half_dim - 1)
        freqs = torch.exp(torch.arange(half_dim, dtype=torch.float32, device=timesteps.device) * -emb_scale)
        args = timesteps.unsqueeze(1).float() * freqs.unsqueeze(0)
        embedding = torch.cat([torch.sin(args), torch.cos(args)], dim=-1)
        if self.embed_dim % 2 == 1:
            embedding = torch.cat([embedding, torch.zeros_like(embedding[:, :1])], dim=-1)
        return embedding


class ResidualDenoiserUNet(nn.Module):
    """
    U-Net Denoiser predicting residual noise epsilon_theta(x_t, t, conditioning).
    All activations via make_activation(negative_slope).
    """

    def __init__(
        self,
        in_channels: int = 1,  # noisy residual channel
        cond_channels: int = 3,  # interpolated coarse + static channels
        out_channels: int = 1,
        time_dim: int = 64,
        base_channels: int = 32,
        negative_slope: float = 0.1,
    ):
        super().__init__()
        self.time_dim = time_dim
        self.negative_slope = negative_slope

        # Timestep MLP with LeakyReLU
        self.time_embed = SinusoidalTimeEmbedding(time_dim)
        self.time_mlp = nn.Sequential(
            nn.Linear(time_dim, time_dim),
            make_activation(negative_slope),
            nn.Linear(time_dim, time_dim),
            make_activation(negative_slope),
        )

        total_in_channels = in_channels + cond_channels

        # Encoder
        self.init_conv = nn.Conv2d(total_in_channels, base_channels, kernel_size=3, padding=1)
        self.down1_conv = nn.Sequential(
            nn.Conv2d(base_channels, base_channels, kernel_size=3, padding=1),
            make_activation(negative_slope),
        )
        self.down1_time = nn.Linear(time_dim, base_channels)

        self.pool1 = nn.MaxPool2d(2)
        self.down2_proj = nn.Conv2d(base_channels, base_channels * 2, kernel_size=3, padding=1)
        self.down2_conv = nn.Sequential(
            make_activation(negative_slope),
            nn.Conv2d(base_channels * 2, base_channels * 2, kernel_size=3, padding=1),
            make_activation(negative_slope),
        )
        self.down2_time = nn.Linear(time_dim, base_channels * 2)

        # Bottleneck
        self.bottleneck = nn.Sequential(
            nn.Conv2d(base_channels * 2, base_channels * 2, kernel_size=3, padding=1),
            make_activation(negative_slope),
            nn.Conv2d(base_channels * 2, base_channels * 2, kernel_size=3, padding=1),
            make_activation(negative_slope),
        )

        # Decoder
        self.up2 = nn.ConvTranspose2d(base_channels * 2, base_channels, kernel_size=2, stride=2)
        self.up2_conv = nn.Sequential(
            nn.Conv2d(base_channels * 2, base_channels, kernel_size=3, padding=1),
            make_activation(negative_slope),
        )

        self.final_conv = nn.Sequential(
            nn.Conv2d(base_channels, base_channels, kernel_size=3, padding=1),
            make_activation(negative_slope),
            nn.Conv2d(base_channels, out_channels, kernel_size=1),
        )

    def forward(
        self,
        x_noisy: torch.Tensor,
        timesteps: torch.Tensor,
        conditioning: torch.Tensor,
    ) -> torch.Tensor:
        """
        Args:
            x_noisy: (B, 1, H, W) noisy residual
            timesteps: (B,) integer or float diffusion steps
            conditioning: (B, cond_channels, H, W)
        """
        # Time embedding
        t_emb = self.time_embed(timesteps)
        t_vec = self.time_mlp(t_emb)

        # Concat condition and noisy residual
        x = torch.cat([x_noisy, conditioning], dim=1)
        h0 = self.init_conv(x)

        # Level 1
        t1 = self.down1_time(t_vec).unsqueeze(-1).unsqueeze(-1)
        h1 = self.down1_conv(h0 + t1)

        # Level 2
        p1 = self.pool1(h1)
        h2_proj = self.down2_proj(p1)
        t2 = self.down2_time(t_vec).unsqueeze(-1).unsqueeze(-1)
        h2 = self.down2_conv(h2_proj + t2)

        # Bottleneck
        b = self.bottleneck(h2)

        # Up 2
        u2 = self.up2(b)
        if u2.shape[-2:] != h1.shape[-2:]:
            u2 = nn.functional.interpolate(u2, size=h1.shape[-2:], mode="bilinear", align_corners=False)
        h_up2 = self.up2_conv(torch.cat([u2, h1], dim=1))

        # Output noise prediction
        out_noise = self.final_conv(h_up2)
        return out_noise
