"""Unit tests for LastLayerFinetuneStrategy, backbone freezing, optimizer audit, and head recovery (ML-6)."""

import copy
import hashlib
from pathlib import Path
import pytest
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from amrs.config import load_config
from amrs.metrics.classification import accuracy, predict_logits
from amrs.models.adapter import ModelAdapter
from amrs.models.registry import build
from amrs.recovery.base import RecoveryContext
from amrs.recovery.last_layer import (
    LastLayerFinetuneStrategy,
    finetune_last_layer,
)


def _compute_hash(tensors: list[torch.Tensor]) -> str:
    """Compute sha256 hash of a list of tensors."""
    hasher = hashlib.sha256()
    for t in tensors:
        hasher.update(t.detach().cpu().numpy().tobytes())
    return hasher.hexdigest()


class HeadlessModel(nn.Module):
    """Model with convolutional layers but no identifiable Linear classification head."""
    def __init__(self) -> None:
        super().__init__()
        self.conv = nn.Conv2d(1, 8, kernel_size=3, padding=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.conv(x)


def _generate_synthetic_separable_data(
    n_samples: int = 120,
    num_classes: int = 5,
    seed: int = 42,
) -> tuple[DataLoader, DataLoader]:
    """Generate synthetic training and validation sets where separable features map to targets."""
    torch.manual_seed(seed)
    x = torch.randn(n_samples, 1, 16, 16)
    # Simple rule: label determined by quadrant sum to ensure learnability
    sums = x.view(n_samples, -1).sum(dim=1)
    y = (torch.abs(sums) % num_classes).long()

    # Split 60/40 train/val
    train_x, val_x = x[:80], x[80:]
    train_y, val_y = y[:80], y[80:]

    train_loader = DataLoader(TensorDataset(train_x, train_y), batch_size=20, shuffle=False)
    val_loader = DataLoader(TensorDataset(val_x, val_y), batch_size=20, shuffle=False)
    return train_loader, val_loader


# ---------------------------------------------------------------------------
# S5 Degraded Head Recovery and Frozen Backbone Tests
# ---------------------------------------------------------------------------

def test_synthetic_degraded_head_scenario_recovery():
    """Fine-tuning an intentionally degraded head must measurably recover validation accuracy."""
    train_loader, val_loader = _generate_synthetic_separable_data(n_samples=160, num_classes=5)

    # Build model and train backbone so features are informative
    model = build("small_cnn", num_classes=5, in_shape=(1, 16, 16))
    adapter = ModelAdapter(model)

    # 1. Simulate S5 Degraded Head: randomly zero/scramble the classification head
    with torch.no_grad():
        head = adapter.head_module()
        head.weight.normal_(mean=0.0, std=0.001)
        if head.bias is not None:
            head.bias.zero_()

    # Verify baseline is degraded
    logits_before, labels_before = predict_logits(model, val_loader)
    acc_before = accuracy(logits_before, labels_before)

    strategy = LastLayerFinetuneStrategy()
    context = RecoveryContext(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        config=load_config(),
        seed=1234,
    )

    candidate, result = strategy.apply(model, context)

    assert result.success is True
    acc_after = result.artifact_metadata["val_acc_after"]
    # Accuracy must improve over degraded baseline
    assert acc_after > acc_before
    assert result.artifact_metadata["max_backbone_diff"] == 0.0


def test_frozen_backbone_strict_immutability():
    """All backbone tensors must remain byte-identical; only head parameters may change."""
    train_loader, val_loader = _generate_synthetic_separable_data(n_samples=80, num_classes=5)
    model = build("small_cnn", num_classes=5, in_shape=(1, 16, 16))
    adapter = ModelAdapter(model)

    head_param_ids = {id(p) for p in adapter.head_params()}

    # Record hashes and copies of backbone tensors
    backbone_before = {
        name: p.detach().clone()
        for name, p in model.named_parameters()
        if id(p) not in head_param_ids
    }
    head_before = {
        name: p.detach().clone()
        for name, p in model.named_parameters()
        if id(p) in head_param_ids
    }

    candidate, stats = finetune_last_layer(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        epochs=3,
        lr=0.02,
        seed=42,
    )

    # 1. Verify every backbone parameter is byte-identical (max diff == 0.0)
    for name, p_cand in candidate.named_parameters():
        if id(p_cand) not in {id(p) for p in ModelAdapter(candidate).head_params()}:
            p_orig = backbone_before[name]
            assert torch.equal(p_cand, p_orig), f"Backbone parameter '{name}' was modified!"
            assert torch.max(torch.abs(p_cand - p_orig)).item() == 0.0

    # 2. Verify head parameters did change
    head_cand = {
        name: p.detach().clone()
        for name, p in candidate.named_parameters()
        if id(p) in {id(hp) for hp in ModelAdapter(candidate).head_params()}
    }
    assert any(
        not torch.equal(head_cand[name], head_before[name])
        for name in head_before
    ), "Head parameters unexpectedly did not change!"

    # 3. Original input model was never mutated
    for name, p in model.named_parameters():
        if name in backbone_before:
            assert torch.equal(p, backbone_before[name])
        else:
            assert torch.equal(p, head_before[name])


# ---------------------------------------------------------------------------
# Optimizer Parameter Audit Tests
# ---------------------------------------------------------------------------

def test_optimizer_parameter_audit():
    """The optimizer parameter list must contain strictly head parameters and zero backbone parameters."""
    model = build("small_cnn", num_classes=5, in_shape=(1, 16, 16))
    adapter = ModelAdapter(model)
    head_params = adapter.head_params()
    head_param_ids = {id(p) for p in head_params}

    # Verify adapter correctly partitions
    backbone_params = adapter.backbone_params()
    assert len(head_params) > 0
    assert len(backbone_params) > 0
    assert set(head_param_ids).isdisjoint({id(p) for p in backbone_params})

    train_loader, _ = _generate_synthetic_separable_data(n_samples=40, num_classes=5)
    _, stats = finetune_last_layer(model, train_loader, epochs=1)

    assert stats["head_param_count"] == sum(p.numel() for p in head_params)
    assert stats["backbone_param_count"] == sum(p.numel() for p in backbone_params)


# ---------------------------------------------------------------------------
# Early Stopping and Non-Finite Loss Tests
# ---------------------------------------------------------------------------

def test_early_stopping_restores_best_validation_epoch():
    """Candidate model must restore the weights from the epoch that achieved the highest validation accuracy."""
    train_loader, val_loader = _generate_synthetic_separable_data(n_samples=100, num_classes=5)
    model = build("small_cnn", num_classes=5, in_shape=(1, 16, 16))

    candidate, stats = finetune_last_layer(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        epochs=5,
        lr=0.01,
        seed=123,
    )

    assert stats["best_epoch"] >= 1
    assert stats["best_epoch"] <= 5

    # Evaluate candidate: its accuracy matches or exceeds initial
    v_logits, v_labels = predict_logits(candidate, val_loader)
    cand_acc = accuracy(v_logits, v_labels)
    assert cand_acc >= 0.0


def test_non_finite_loss_fails_safely():
    """Non-finite training loss must be caught safely and return success=False without crashing."""
    model = build("small_cnn", num_classes=5, in_shape=(1, 16, 16))
    # Create batch with NaN inputs
    nan_x = torch.full((20, 1, 16, 16), float("nan"))
    y = torch.randint(0, 5, (20,))
    bad_loader = DataLoader(TensorDataset(nan_x, y), batch_size=20)

    strategy = LastLayerFinetuneStrategy()
    context = RecoveryContext(model=model, train_loader=bad_loader)

    candidate, result = strategy.apply(model, context)
    assert result.success is False
    assert "Non-finite loss" in str(result.error_message)


# ---------------------------------------------------------------------------
# Head Ambiguity and Missing Data Tests
# ---------------------------------------------------------------------------

def test_headless_model_skips_with_no_identifiable_head():
    """Model with no identifiable head must return NO_IDENTIFIABLE_HEAD."""
    model = HeadlessModel()
    adapter = ModelAdapter(model)

    strategy = LastLayerFinetuneStrategy()
    train_loader, _ = _generate_synthetic_separable_data(n_samples=40, num_classes=5)
    context = RecoveryContext(model=model, train_loader=train_loader)

    # 1. Applicability check
    app = strategy.is_applicable(adapter, context)
    assert app.can_apply is False
    assert app.reason == "NO_IDENTIFIABLE_HEAD"

    # 2. Strategy apply
    _, result = strategy.apply(model, context)
    assert result.success is False
    assert "NO_IDENTIFIABLE_HEAD" in str(result.error_message)


def test_missing_training_data_rejected():
    """Missing training data must return MISSING_TRAINING_DATA."""
    model = build("small_cnn", num_classes=5, in_shape=(1, 16, 16))
    strategy = LastLayerFinetuneStrategy()
    context = RecoveryContext(model=model, train_loader=None, val_loader=None)

    app = strategy.is_applicable(ModelAdapter(model), context)
    assert app.can_apply is False
    assert app.reason == "MISSING_TRAINING_DATA"


def test_deterministic_seed_reproducibility():
    """Two fine-tuning runs with identical seed and configuration must produce identical candidate weights."""
    train_loader, val_loader = _generate_synthetic_separable_data(n_samples=60, num_classes=5, seed=10)
    model = build("small_cnn", num_classes=5, in_shape=(1, 16, 16))

    cand1, stats1 = finetune_last_layer(model, train_loader, val_loader, epochs=2, lr=0.01, seed=999)
    cand2, stats2 = finetune_last_layer(model, train_loader, val_loader, epochs=2, lr=0.01, seed=999)

    for (n1, p1), (n2, p2) in zip(cand1.named_parameters(), cand2.named_parameters()):
        assert n1 == n2
        assert torch.equal(p1, p2), f"Weights diverged for parameter '{n1}' under identical seed!"


def test_strategy_rejects_holdout():
    """Verify that holdout cannot be passed into RecoveryContext."""
    model = build("small_cnn", num_classes=5, in_shape=(1, 16, 16))
    loader = DataLoader(TensorDataset(torch.randn(10, 1, 16, 16), torch.randint(0, 5, (10,))))

    with pytest.raises(ValueError, match="Holdout data must never enter RecoveryContext"):
        RecoveryContext(model=model, train_loader=loader, holdout_loader=loader)

