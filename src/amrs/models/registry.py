"""Model registry defining allowlisted architectures for AMRS.

Supported architectures:
1. `mlp_small`: Compact MLP (Flatten -> Linear -> ReLU -> Linear -> ReLU -> Linear).
2. `small_cnn`: 3 conv blocks with BatchNorm2d, ReLU, global pooling, and linear head `fc`.
3. `resnet18_cifar`: ResNet-18 adapted for 32x32 inputs (3x3 stem, identity maxpool, head `fc`).
"""

from __future__ import annotations

import math
from typing import Callable
import torch
import torch.nn as nn
import torchvision.models as tv_models

from amrs.errors import ValidationError

# Type for builder function: (num_classes: int, in_shape: tuple[int, ...]) -> nn.Module
ModelBuilder = Callable[[int, tuple[int, ...]], nn.Module]

_REGISTRY: dict[str, ModelBuilder] = {}


def register(name: str) -> Callable[[ModelBuilder], ModelBuilder]:
    """Decorator to register a model architecture builder in the allowlisted registry."""

    def decorator(fn: ModelBuilder) -> ModelBuilder:
        _REGISTRY[name] = fn
        return fn

    return decorator


def list_registered() -> list[str]:
    """Return sorted list of all allowlisted architecture names."""
    return sorted(_REGISTRY.keys())


def is_registered(name: str) -> bool:
    """Check if an architecture name is registered."""
    return name in _REGISTRY


# ---------------------------------------------------------------------------
# Architecture Implementations
# ---------------------------------------------------------------------------


class MLPSmall(nn.Module):
    """Compact multi-layer perceptron without BatchNorm."""

    def __init__(self, in_features: int, num_classes: int = 10) -> None:
        super().__init__()
        self.flatten = nn.Flatten()
        self.fc1 = nn.Linear(in_features, 128)
        self.relu1 = nn.ReLU(inplace=True)
        self.fc2 = nn.Linear(128, 64)
        self.relu2 = nn.ReLU(inplace=True)
        self.fc = nn.Linear(64, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.flatten(x)
        x = self.relu1(self.fc1(x))
        x = self.relu2(self.fc2(x))
        return self.fc(x)


class SmallCNN(nn.Module):
    """Three-block convolutional network with BatchNorm and global pooling."""

    def __init__(self, in_channels: int = 3, num_classes: int = 10) -> None:
        super().__init__()
        self.block1 = nn.Sequential(
            nn.Conv2d(in_channels, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
        )
        self.block2 = nn.Sequential(
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
        )
        self.block3 = nn.Sequential(
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((1, 1)),
        )
        self.flatten = nn.Flatten()
        self.fc = nn.Linear(128, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.block1(x)
        x = self.block2(x)
        x = self.block3(x)
        x = self.flatten(x)
        return self.fc(x)


@register("mlp_small")
def _build_mlp_small(num_classes: int = 10, in_shape: tuple[int, ...] = (3, 32, 32)) -> nn.Module:
    in_features = math.prod(in_shape)
    return MLPSmall(in_features=in_features, num_classes=num_classes)


@register("small_cnn")
def _build_small_cnn(num_classes: int = 10, in_shape: tuple[int, ...] = (3, 32, 32)) -> nn.Module:
    in_channels = in_shape[0] if len(in_shape) >= 1 else 3
    return SmallCNN(in_channels=in_channels, num_classes=num_classes)


@register("resnet18_cifar")
def _build_resnet18_cifar(num_classes: int = 10, in_shape: tuple[int, ...] = (3, 32, 32)) -> nn.Module:
    in_channels = in_shape[0] if len(in_shape) >= 1 else 3
    model = tv_models.resnet18(weights=None)
    # CIFAR stem: 3x3 conv, stride 1, no maxpool
    model.conv1 = nn.Conv2d(
        in_channels,
        64,
        kernel_size=3,
        stride=1,
        padding=1,
        bias=False,
    )
    model.maxpool = nn.Identity()
    model.fc = nn.Linear(512, num_classes)
    return model


def build(
    name: str,
    num_classes: int = 10,
    in_shape: tuple[int, ...] = (3, 32, 32),
) -> nn.Module:
    """Build a model instance from the allowlisted registry.

    Raises:
        ValidationError: If the architecture name is not registered.
    """
    if name not in _REGISTRY:
        raise ValidationError(
            message=f"Architecture '{name}' is not registered. Allowlisted: {list_registered()}",
            details={"requested_arch": name, "allowlisted_architectures": list_registered()},
        )
    return _REGISTRY[name](num_classes, in_shape)

