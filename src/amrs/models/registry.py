"""Model registry defining allowlisted architectures for AMRS.

Supported architectures:
1. `mlp_small`: Compact MLP (Flatten -> Linear -> ReLU -> Linear -> ReLU -> Linear).
2. `small_cnn`: 3 conv blocks with BatchNorm2d, ReLU, global pooling, and linear head `fc`.
3. `resnet18_cifar`: ResNet-18 adapted for 32x32 inputs (3x3 stem, identity maxpool, head `fc`).
"""

from __future__ import annotations

import math
from typing import Any, Callable, OrderedDict

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


class DynamicMLP(nn.Module):
    """Dynamically configured multi-layer perceptron adapting to checkpoint structure."""

    def __init__(self, state_dict: OrderedDict[str, torch.Tensor]) -> None:
        super().__init__()
        self._initializing = True
        self.flatten = nn.Flatten()
        self.layer_paths: list[str] = []
        weight_keys = [
            k for k in state_dict.keys() if k.endswith(".weight") and len(state_dict[k].shape) == 2
        ]
        for wk in weight_keys:
            path = wk.removesuffix(".weight")
            w = state_dict[wk]
            has_b = f"{path}.bias" in state_dict
            linear = nn.Linear(w.shape[1], w.shape[0], bias=has_b)
            parts = path.split(".")
            curr = self
            for part in parts[:-1]:
                if not hasattr(curr, part):
                    curr.add_module(part, nn.Sequential())
                curr = getattr(curr, part)
            curr.add_module(parts[-1], linear)
            self.layer_paths.append(path)
        self._initializing = False

    def __getattr__(self, name: str) -> Any:
        if name == "fc" and not self.__dict__.get("_initializing", True):
            if "_modules" in self.__dict__ and "fc" in self._modules:
                return self._modules["fc"]
            if "layer_paths" in self.__dict__ and self.layer_paths:
                parts = self.layer_paths[-1].split(".")
                curr: Any = self
                for p in parts:
                    curr = (
                        curr._modules[p]
                        if hasattr(curr, "_modules") and p in curr._modules
                        else getattr(curr, p)
                    )
                return curr
        return super().__getattr__(name)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.flatten(x)
        for i, path in enumerate(self.layer_paths):
            parts = path.split(".")
            curr: Any = self
            for p in parts:
                curr = getattr(curr, p)
            x = curr(x)
            if i < len(self.layer_paths) - 1:
                x = torch.relu(x)
        return x


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
def _build_resnet18_cifar(
    num_classes: int = 10, in_shape: tuple[int, ...] = (3, 32, 32)
) -> nn.Module:
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
