"""
Loss functions for Stage 1 Spherical GNN Tracker.
Imbalanced mask segmentation (Focal + Dice) and Smooth L1 centroid localization.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class FocalLoss(nn.Module):
    """Focal Loss for addressing extreme foreground-background class imbalance."""

    def __init__(self, alpha: float = 0.8, gamma: float = 2.0):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma

    def forward(self, pred_probs: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        p = torch.clamp(pred_probs, 1e-6, 1.0 - 1e-6)
        pt = targets * p + (1.0 - targets) * (1.0 - p)
        alpha_t = targets * self.alpha + (1.0 - targets) * (1.0 - self.alpha)
        loss = -alpha_t * (1.0 - pt) ** self.gamma * torch.log(pt)
        return torch.mean(loss)


class DiceLoss(nn.Module):
    """Dice Loss for spatial overlap segmentation."""

    def __init__(self, smooth: float = 1e-5):
        super().__init__()
        self.smooth = smooth

    def forward(self, pred_probs: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        intersection = torch.sum(pred_probs * targets)
        cardinality = torch.sum(pred_probs) + torch.sum(targets)
        dice = (2.0 * intersection + self.smooth) / (cardinality + self.smooth)
        return 1.0 - dice


class TrackerCompositeLoss(nn.Module):
    """
    Combined loss for Stage 1:
    L = w_focal * L_focal + w_dice * L_dice + w_center * L_center
    """

    def __init__(
        self,
        w_focal: float = 1.0,
        w_dice: float = 1.0,
        w_center: float = 0.5,
    ):
        super().__init__()
        self.focal = FocalLoss()
        self.dice = DiceLoss()
        self.w_focal = w_focal
        self.w_dice = w_dice
        self.w_center = w_center

    def forward(
        self,
        pred_mask: torch.Tensor,
        target_mask: torch.Tensor,
        pred_center: torch.Tensor,
        target_center: torch.Tensor,
    ) -> torch.Tensor:
        l_focal = self.focal(pred_mask, target_mask)
        l_dice = self.dice(pred_mask, target_mask)
        l_center = F.smooth_l1_loss(pred_center[:, :2], target_center[:, :2])
        return self.w_focal * l_focal + self.w_dice * l_dice + self.w_center * l_center
