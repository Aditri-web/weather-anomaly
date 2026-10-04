"""
Deterministic Regression U-Net for predicting conditional mean at 5 km (Step 1 of CorrDiff).
Complies strictly with activation rules: LeakyReLU everywhere via make_activation().
"""

import torch
import torch.nn as nn
from src.utils.activations import make_activation


class ConvBlock(nn.Module):
    """Double convolution block using strictly LeakyReLU."""

    def __init__(self, in_ch: int, out_ch: int, negative_slope: float = 0.1):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_ch),
            make_activation(negative_slope),
            nn.Conv2d(out_ch, out_ch, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_ch),
            make_activation(negative_slope),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class RegressionMeanUNet(nn.Module):
    """
    Predicts the conditional mean at 5 km resolution from interpolated coarse and static fields.
    """

    def __init__(
        self,
        in_channels: int = 3,  # interpolated coarse + static fields (orography, land_sea)
        out_channels: int = 1,
        base_features: int = 32,
        negative_slope: float = 0.1,
    ):
        super().__init__()
        self.negative_slope = negative_slope

        self.inc = ConvBlock(in_channels, base_features, negative_slope)
        self.down1 = nn.Sequential(
            nn.MaxPool2d(2),
            ConvBlock(base_features, base_features * 2, negative_slope),
        )
        self.down2 = nn.Sequential(
            nn.MaxPool2d(2),
            ConvBlock(base_features * 2, base_features * 4, negative_slope),
        )

        self.up1 = nn.ConvTranspose2d(base_features * 4, base_features * 2, kernel_size=2, stride=2)
        self.conv_up1 = ConvBlock(base_features * 4, base_features * 2, negative_slope)

        self.up2 = nn.ConvTranspose2d(base_features * 2, base_features, kernel_size=2, stride=2)
        self.conv_up2 = ConvBlock(base_features * 2, base_features, negative_slope)

        # Output head: Linear projection (no activation for positivity; positivity handled by inverse log1p)
        self.outc = nn.Conv2d(base_features, out_channels, kernel_size=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x1 = self.inc(x)
        x2 = self.down1(x1)
        x3 = self.down2(x2)

        u1 = self.up1(x3)
        # Pad if odd dimensions
        if u1.shape[-2:] != x2.shape[-2:]:
            u1 = nn.functional.interpolate(u1, size=x2.shape[-2:], mode="bilinear", align_corners=False)
        x_u1 = self.conv_up1(torch.cat([u1, x2], dim=1))

        u2 = self.up2(x_u1)
        if u2.shape[-2:] != x1.shape[-2:]:
            u2 = nn.functional.interpolate(u2, size=x1.shape[-2:], mode="bilinear", align_corners=False)
        x_u2 = self.conv_up2(torch.cat([u2, x1], dim=1))

        return self.outc(x_u2)
