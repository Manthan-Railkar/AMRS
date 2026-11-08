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


class DynamicCNN(nn.Module):
    """Dynamically configured Convolutional Network adapting to checkpoint structure.

    Supports:
    - `features.*` and `classifier.*` sequential structures (torchvision / custom models).
    - Arbitrary input channels, filter depths, conv kernel sizes, and BatchNorm layers.
    - Adaptive spatial pooling ensuring linear classifier receives exactly expected input dim.
    - Automatic channel adaptation (grayscale 1-channel <-> RGB 3-channel).
    - `.fc` property pointing to the terminal classification linear layer.
    """

    def __init__(self, state_dict: OrderedDict[str, torch.Tensor]) -> None:
        super().__init__()
        self._initializing = True

        has_features = any(k.startswith("features.") for k in state_dict.keys())
        has_classifier = any(k.startswith("classifier.") for k in state_dict.keys())

        if has_features and has_classifier:
            feat_indices: set[int] = set()
            for k in state_dict.keys():
                if k.startswith("features."):
                    part = k.split(".")[1]
                    if part.isdigit():
                        feat_indices.add(int(part))

            class_indices: set[int] = set()
            for k in state_dict.keys():
                if k.startswith("classifier."):
                    part = k.split(".")[1]
                    if part.isdigit():
                        class_indices.add(int(part))

            max_feat = max(feat_indices) if feat_indices else 0
            max_class = max(class_indices) if class_indices else 0

            feat_modules: OrderedDict[str, nn.Module] = OrderedDict()
            last_conv_out_channels = 32
            first_in_channels = 3
            first_conv_found = False

            for i in range(max_feat + 1):
                prefix = f"features.{i}."
                w_key = f"{prefix}weight"
                if w_key in state_dict:
                    w = state_dict[w_key]
                    if len(w.shape) == 4:
                        out_ch, in_ch, kh, kw = w.shape
                        if not first_conv_found:
                            first_in_channels = in_ch
                            first_conv_found = True
                        has_b = f"{prefix}bias" in state_dict
                        feat_modules[str(i)] = nn.Conv2d(
                            in_ch, out_ch, (kh, kw), padding=kh // 2, bias=has_b
                        )
                        last_conv_out_channels = out_ch
                    elif len(w.shape) == 1:
                        feat_modules[str(i)] = nn.BatchNorm2d(w.shape[0])
                else:
                    prev_was_bn_or_conv = i - 1 in feat_indices
                    if prev_was_bn_or_conv:
                        feat_modules[str(i)] = nn.ReLU(inplace=True)
                    else:
                        feat_modules[str(i)] = nn.MaxPool2d(kernel_size=2, stride=2)

            self.features = nn.Sequential(feat_modules)
            self.in_channels = first_in_channels

            # Determine first linear in_features
            first_linear_in: int | None = None
            sorted_class = sorted(class_indices)
            for ci in sorted_class:
                w_key = f"classifier.{ci}.weight"
                if w_key in state_dict and len(state_dict[w_key].shape) == 2:
                    first_linear_in = state_dict[w_key].shape[1]
                    break

            if first_linear_in is not None and last_conv_out_channels > 0:
                spatial_area = max(1, first_linear_in // last_conv_out_channels)
                spatial_dim = max(1, math.isqrt(spatial_area))
                self.adaptive_pool = nn.AdaptiveAvgPool2d((spatial_dim, spatial_dim))
            else:
                self.adaptive_pool = nn.AdaptiveAvgPool2d((1, 1))

            self.flatten = nn.Flatten()

            class_modules: OrderedDict[str, nn.Module] = OrderedDict()
            for i in range(max_class + 1):
                prefix = f"classifier.{i}."
                w_key = f"{prefix}weight"
                if w_key in state_dict:
                    w = state_dict[w_key]
                    has_b = f"{prefix}bias" in state_dict
                    class_modules[str(i)] = nn.Linear(w.shape[1], w.shape[0], bias=has_b)
                else:
                    if i < min(class_indices, default=0):
                        class_modules[str(i)] = nn.Identity()
                    elif i == max_class - 1:
                        class_modules[str(i)] = nn.Dropout(0.5)
                    else:
                        class_modules[str(i)] = nn.ReLU(inplace=True)

            self.classifier = nn.Sequential(class_modules)
        else:
            self.features = nn.Sequential()
            self.adaptive_pool = nn.AdaptiveAvgPool2d((1, 1))
            self.flatten = nn.Flatten()
            self.classifier = nn.Sequential()
            self.in_channels = 3

        self._initializing = False

    @property
    def fc(self) -> nn.Linear | None:
        if hasattr(self, "classifier"):
            for m in reversed(self.classifier):
                if isinstance(m, nn.Linear):
                    return m
        return None

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if x.dim() == 4 and hasattr(self, "in_channels"):
            if x.shape[1] == 1 and self.in_channels == 3:
                x = x.repeat(1, 3, 1, 1)
            elif x.shape[1] == 3 and self.in_channels == 1:
                x = x.mean(dim=1, keepdim=True)

        x = self.features(x)
        x = self.adaptive_pool(x)
        x = self.flatten(x)
        x = self.classifier(x)
        return x


def build_dynamic_resnet(state_dict: OrderedDict[str, torch.Tensor]) -> nn.Module:
    """Build a torchvision ResNet matching the exact depth, stem, channels, and classes of state_dict."""
    from torchvision.models.resnet import BasicBlock, Bottleneck, ResNet

    # Detect num classes from fc.weight
    fc_w = state_dict.get("fc.weight")
    num_classes = fc_w.shape[0] if fc_w is not None else 10

    # Detect in_channels and stem kernel size from conv1.weight
    conv1_w = state_dict.get("conv1.weight")
    if conv1_w is not None:
        in_ch = conv1_w.shape[1]
        k_size = conv1_w.shape[2]
    else:
        in_ch = 3
        k_size = 3

    # Detect block type (BasicBlock for ResNet-18/34, Bottleneck for ResNet-50/101/152)
    is_bottleneck = any("conv3.weight" in k for k in state_dict.keys() if "layer" in k)
    block = Bottleneck if is_bottleneck else BasicBlock

    # Detect layers count for layer1..layer4
    layers: list[int] = []
    for layer_idx in (1, 2, 3, 4):
        prefix = f"layer{layer_idx}."
        block_indices: set[int] = set()
        for k in state_dict.keys():
            if k.startswith(prefix):
                parts = k[len(prefix) :].split(".")
                if parts[0].isdigit():
                    block_indices.add(int(parts[0]))
        layers.append(max(block_indices) + 1 if block_indices else 2)

    model = ResNet(block, layers, num_classes=num_classes)
    if k_size == 3:
        # CIFAR / compact stem (3x3 conv, stride 1, no maxpool)
        model.conv1 = nn.Conv2d(in_ch, 64, kernel_size=3, stride=1, padding=1, bias=False)
        model.maxpool = nn.Identity()
    else:
        # Standard ImageNet stem (7x7 conv)
        if in_ch != 3:
            model.conv1 = nn.Conv2d(in_ch, 64, kernel_size=7, stride=2, padding=3, bias=False)

    return model


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
