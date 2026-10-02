"""
Activation utilities adhering to project-wide non-negotiable rules.
Strictly uses LeakyReLU everywhere; no plain ReLU or alternatives allowed.
"""

from typing import Optional
import torch
import torch.nn as nn


def make_activation(negative_slope: float = 0.1) -> nn.Module:
    """
    Factory creating the project-standard activation module.
    
    Args:
        negative_slope: Slope of the negative quadrant (default: 0.1).
        
    Returns:
        torch.nn.LeakyReLU instance configured with negative_slope.
    """
    return nn.LeakyReLU(negative_slope=negative_slope)
