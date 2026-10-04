"""
Strict regression tests enforcing the project non-negotiable activation rule:
LeakyReLU everywhere via make_activation(); NO plain ReLU, GELU, SiLU, Mish, ELU anywhere in src/.
"""

import os
import re
import pytest
import torch
import torch.nn as nn
from src.utils.activations import make_activation
from src.models.tracker.gnn import SphericalAnomalyTrackerGNN
from src.models.downscaler.unet_mean import RegressionMeanUNet
from src.models.downscaler.diffusion_unet import ResidualDenoiserUNet


def test_make_activation_configured_slope():
    act = make_activation(negative_slope=0.1)
    assert isinstance(act, nn.LeakyReLU)
    assert act.negative_slope == 0.1

    act2 = make_activation(negative_slope=0.25)
    assert act2.negative_slope == 0.25


def test_models_have_no_forbidden_activations():
    """Verify that every instantiated model module contains strictly LeakyReLU."""
    tracker = SphericalAnomalyTrackerGNN(in_channels=5, hidden_dim=32, num_processor_layers=2)
    mean_unet = RegressionMeanUNet(in_channels=3, out_channels=1, base_features=16)
    diff_unet = ResidualDenoiserUNet(in_channels=1, cond_channels=3, out_channels=1, base_channels=16)

    forbidden_classes = (nn.ReLU, nn.GELU, nn.SiLU, nn.Mish, nn.ELU, nn.PReLU)

    for model_name, model in [("Tracker", tracker), ("MeanUNet", mean_unet), ("DiffUNet", diff_unet)]:
        for name, module in model.named_modules():
            for forbidden in forbidden_classes:
                assert not isinstance(module, forbidden), (
                    f"Forbidden activation {forbidden.__name__} found in {model_name}.{name}"
                )
            if isinstance(module, nn.LeakyReLU):
                assert module.negative_slope == 0.1, (
                    f"LeakyReLU in {model_name}.{name} has incorrect slope {module.negative_slope}"
                )


def test_source_code_has_no_forbidden_activation_text():
    """Ensure no forbidden activation strings appear anywhere in the src/ codebase."""
    src_dir = "src"
    forbidden_patterns = [
        re.compile(r"\bnn\.ReLU\b"),
        re.compile(r"\bF\.relu\b"),
        re.compile(r"\btorch\.relu\b"),
        re.compile(r"\bnn\.GELU\b"),
        re.compile(r"\bnn\.SiLU\b"),
        re.compile(r"\bnn\.Mish\b"),
        re.compile(r"\bnn\.ELU\b"),
        re.compile(r'act_fn\s*=\s*["\']relu["\']'),
        re.compile(r'activation\s*=\s*["\']relu["\']'),
    ]

    for root, _, files in os.walk(src_dir):
        for f in files:
            if f.endswith(".py"):
                file_path = os.path.join(root, f)
                with open(file_path, "r", encoding="utf-8") as py_file:
                    content = py_file.read()
                    for pattern in forbidden_patterns:
                        match = pattern.search(content)
                        assert match is None, (
                            f"Forbidden pattern '{match.group(0)}' detected in {file_path}!"
                        )
