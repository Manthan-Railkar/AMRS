"""Unit tests for AMRS ModelAdapter (BE-4 / DM-3.1)."""

import pytest
import torch
import torch.nn as nn

from amrs.models.adapter import ModelAdapter
from amrs.models.registry import build


def test_adapter_head_module_resolution() -> None:
    resnet = build("resnet18_cifar")
    res_adapter = ModelAdapter(resnet)
    assert res_adapter.head_module() is resnet.fc

    mlp = build("mlp_small")
    mlp_adapter = ModelAdapter(mlp)
    assert mlp_adapter.head_module() is mlp.fc


def test_adapter_bn_layers_inspection() -> None:
    # mlp_small must have NO BatchNorm layers
    mlp = build("mlp_small")
    mlp_adapter = ModelAdapter(mlp)
    assert len(mlp_adapter.bn_layers()) == 0
    assert not mlp_adapter.supports_bn()

    # small_cnn must have BatchNorm layers
    cnn = build("small_cnn")
    cnn_adapter = ModelAdapter(cnn)
    assert len(cnn_adapter.bn_layers()) > 0
    assert cnn_adapter.supports_bn()

    # resnet18_cifar must have BatchNorm layers
    resnet = build("resnet18_cifar")
    res_adapter = ModelAdapter(resnet)
    assert len(res_adapter.bn_layers()) > 0
    assert res_adapter.supports_bn()


def test_adapter_backbone_and_head_params_partition() -> None:
    for arch in ["mlp_small", "small_cnn", "resnet18_cifar"]:
        model = build(arch)
        adapter = ModelAdapter(model)

        all_params = list(model.parameters())
        backbone_p = adapter.backbone_params()
        head_p = adapter.head_params()

        # Check total count matches
        assert len(all_params) == len(backbone_p) + len(head_p)
        assert adapter.num_params() == sum(p.numel() for p in all_params)

        # Ensure no overlap
        backbone_ids = {id(p) for p in backbone_p}
        head_ids = {id(p) for p in head_p}
        assert backbone_ids.isdisjoint(head_ids)


def test_adapter_features_reproduces_model_output_within_tolerance() -> None:
    """Verifies that head_module()(features(x)) reproduces model(x) within 1e-6 tolerance."""
    for arch in ["mlp_small", "small_cnn", "resnet18_cifar"]:
        model = build(arch)
        model.eval()
        adapter = ModelAdapter(model)

        x = torch.randn(2, 3, 32, 32)
        with torch.no_grad():
            full_out = model(x)
            feats = adapter.features(x)
            head = adapter.head_module()
            reconstructed_out = head(feats)

        assert torch.allclose(full_out, reconstructed_out, atol=1e-6), (
            f"Failed feature reconstruction for {arch}"
        )


def test_adapter_layer_groups_covers_every_parameter_exactly_once() -> None:
    """Verifies that layer_groups covers every parameter in model.parameters() exactly once."""
    for arch in ["mlp_small", "small_cnn", "resnet18_cifar"]:
        model = build(arch)
        adapter = ModelAdapter(model)

        groups = adapter.layer_groups()
        assert len(groups) > 1, f"Expected multiple layer groups for {arch}"

        all_model_param_ids = [id(p) for p in model.parameters()]
        grouped_param_ids: list[int] = []
        for g in groups:
            for p in g:
                grouped_param_ids.append(id(p))

        # Check no duplicates
        assert len(grouped_param_ids) == len(set(grouped_param_ids)), (
            f"Duplicate parameters found in layer_groups for {arch}"
        )

        # Check exact cover
        assert set(grouped_param_ids) == set(all_model_param_ids), (
            f"layer_groups does not cover all parameters for {arch}"
        )

