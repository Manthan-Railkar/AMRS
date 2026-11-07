"""Unit tests for AMRS model registry (BE-4 / DM-3.1)."""

import pytest
import torch
import torch.nn as nn

from amrs.errors import ValidationError
from amrs.models.registry import (
    build,
    is_registered,
    list_registered,
    register,
)


def test_registry_listing_and_membership() -> None:
    registered = list_registered()
    assert "mlp_small" in registered
    assert "small_cnn" in registered
    assert "resnet18_cifar" in registered

    assert is_registered("mlp_small")
    assert is_registered("small_cnn")
    assert is_registered("resnet18_cifar")
    assert not is_registered("vgg16_unknown")


def test_build_unknown_arch_raises_validation_error() -> None:
    with pytest.raises(ValidationError) as exc_info:
        build("unknown_model_arch")
    assert "not registered" in str(exc_info.value.message)
    assert exc_info.value.status_code == 422


def test_mlp_small_forward_pass() -> None:
    model = build("mlp_small", num_classes=10, in_shape=(3, 32, 32))
    assert isinstance(model, nn.Module)

    x = torch.randn(4, 3, 32, 32)
    out = model(x)
    assert out.shape == (4, 10)


def test_small_cnn_forward_pass() -> None:
    model = build("small_cnn", num_classes=10, in_shape=(3, 32, 32))
    assert isinstance(model, nn.Module)

    x = torch.randn(4, 3, 32, 32)
    out = model(x)
    assert out.shape == (4, 10)


def test_resnet18_cifar_forward_pass() -> None:
    model = build("resnet18_cifar", num_classes=10, in_shape=(3, 32, 32))
    assert isinstance(model, nn.Module)

    # Check CIFAR modifications: 3x3 conv1 with stride 1, identity maxpool, fc head
    assert model.conv1.kernel_size == (3, 3)
    assert model.conv1.stride == (1, 1)
    assert isinstance(model.maxpool, nn.Identity)
    assert isinstance(model.fc, nn.Linear)
    assert model.fc.out_features == 10

    x = torch.randn(2, 3, 32, 32)
    out = model(x)
    assert out.shape == (2, 10)


def test_custom_registration_decorator() -> None:
    @register("test_dummy_model")
    def _dummy_builder(num_classes: int = 10, in_shape: tuple[int, ...] = (3, 32, 32)) -> nn.Module:
        return nn.Linear(10, num_classes)

    assert is_registered("test_dummy_model")
    model = build("test_dummy_model", num_classes=5)
    assert isinstance(model, nn.Linear)
    assert model.out_features == 5
