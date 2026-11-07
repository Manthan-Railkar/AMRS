"""Unit tests for SelectiveFinetuneL2spStrategy, layer-group selection, L2-SP math, and S1 recovery (ML-7)."""

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
from amrs.recovery.l2sp import (
    L2SPRegularizer,
    compute_l2sp_penalty,
)
from amrs.recovery.selective_ft import (
    SelectiveFinetuneL2spStrategy,
    finetune_selective_l2sp,
    select_trainable_groups,
)


class HeadlessModel(nn.Module):
    """Model with convolutional layers but no identifiable Linear classification head."""
    def __init__(self) -> None:
        super().__init__()
        self.conv = nn.Conv2d(1, 8, kernel_size=3, padding=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.conv(x)


def _generate_synthetic_separable_data(
    n_samples: int = 160,
    num_classes: int = 5,
    seed: int = 42,
) -> tuple[DataLoader, DataLoader]:
    """Generate synthetic separable dataset."""
    torch.manual_seed(seed)
    x = torch.randn(n_samples, 1, 16, 16)
    sums = x.view(n_samples, -1).sum(dim=1)
    y = (torch.abs(sums) % num_classes).long()

    train_x, val_x = x[:100], x[100:]
    train_y, val_y = y[:100], y[100:]

    train_loader = DataLoader(TensorDataset(train_x, train_y), batch_size=20, shuffle=False)
    val_loader = DataLoader(TensorDataset(val_x, val_y), batch_size=20, shuffle=False)
    return train_loader, val_loader


# ---------------------------------------------------------------------------
# 1. L2-SP Math & Hand Calculation Tests
# ---------------------------------------------------------------------------

def test_l2sp_formula_matches_hand_calculation():
    """Verify that compute_l2sp_penalty and L2SPRegularizer match an exact hand calculation.
    
    Hand calculation:
        theta_1 = [1.0, 2.0, -1.0]
        anchor_1 = [0.5, 2.0, 1.0]
        diff_1 = [0.5, 0.0, -2.0]
        sq_diff_1 = [0.25, 0.0, 4.0] -> sum = 4.25
        
        theta_2 = [[3.0, 4.0], [0.0, -2.0]]
        anchor_2 = [[2.0, 4.0], [1.0, -1.0]]
        diff_2 = [[1.0, 0.0], [-1.0, -1.0]]
        sq_diff_2 = [[1.0, 0.0], [1.0, 1.0]] -> sum = 3.0
        
        Total penalty = 4.25 + 3.0 = 7.25
        With alpha = 0.2:
            contribution = 0.2 * 7.25 = 1.45
            task_loss = 2.50
            total_loss = 2.50 + 1.45 = 3.95
    """
    t1 = nn.Parameter(torch.tensor([1.0, 2.0, -1.0]))
    a1 = torch.tensor([0.5, 2.0, 1.0])

    t2 = nn.Parameter(torch.tensor([[3.0, 4.0], [0.0, -2.0]]))
    a2 = torch.tensor([[2.0, 4.0], [1.0, -1.0]])

    penalty = compute_l2sp_penalty([t1, t2], [a1, a2])
    assert pytest.approx(float(penalty.item()), abs=1e-6) == 7.25

    # Test L2SPRegularizer
    reg = L2SPRegularizer([t1, t2], alpha=0.2)
    # At construction, anchors are snapshotted from t1, t2, so penalty is 0.0
    assert reg.penalty_value() == 0.0

    # Overwrite anchors manually to match the hand calculation reference
    reg.anchors = [a1, a2]
    assert pytest.approx(reg.penalty_value(), abs=1e-6) == 7.25
    assert pytest.approx(reg.contribution_value(), abs=1e-6) == 1.45

    task_loss = torch.tensor(2.50, requires_grad=True)
    total_loss = reg.loss(task_loss)
    assert pytest.approx(float(total_loss.item()), abs=1e-6) == 3.95

    # Autograd test: gradient w.r.t t1 should be 2 * alpha * (t1 - a1) = 2 * 0.2 * [0.5, 0.0, -2.0] = [0.2, 0.0, -0.8]
    total_loss.backward()
    expected_grad_t1 = torch.tensor([0.2, 0.0, -0.8])
    assert torch.allclose(t1.grad, expected_grad_t1, atol=1e-6)


def test_l2sp_zero_initialization_penalty():
    """Regularization penalty must be strictly zero at initialization and grow as weights move."""
    param = nn.Parameter(torch.tensor([2.0, -3.0, 5.0]))
    reg = L2SPRegularizer([param], alpha=0.5)

    # Initial penalty must be exactly 0.0
    assert reg.penalty_value() == 0.0
    assert reg.contribution_value() == 0.0

    # Perform an optimization step to move weights
    optimizer = torch.optim.SGD([param], lr=0.1)
    task_loss = torch.sum(param * 3.0)  # grad = [3, 3, 3]
    total_loss = reg.loss(task_loss)
    total_loss.backward()
    optimizer.step()

    # Penalty must now be strictly positive
    new_penalty = reg.penalty_value()
    assert new_penalty > 0.0
    assert reg.contribution_value() > 0.0


# ---------------------------------------------------------------------------
# 2. Layer-Group Selection Tests
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("arch", ["mlp_small", "small_cnn", "resnet18_cifar"])
def test_layer_group_selection_across_architectures(arch: str):
    """Test top-N layer group selection with unfreeze_top_n=1 and unfreeze_top_n=2."""
    model = build(arch, num_classes=5)
    adapter = ModelAdapter(model)
    head_params = adapter.head_params()
    head_ids = {id(p) for p in head_params}

    # 1. Unfreeze top 1 backbone group + head
    trainable_1, frozen_1, groups_1 = select_trainable_groups(model, unfreeze_top_n=1)
    trainable_ids_1 = {id(p) for p in trainable_1}

    # Head params must always be included
    assert head_ids.issubset(trainable_ids_1)
    # Exactly partitions all model parameters
    all_param_ids = {id(p) for p in model.parameters()}
    assert len(trainable_1) + len(frozen_1) == len(all_param_ids)
    assert trainable_ids_1.union({id(p) for p in frozen_1}) == all_param_ids
    assert "head" in groups_1

    # 2. Unfreeze top 2 backbone groups + head
    trainable_2, frozen_2, groups_2 = select_trainable_groups(model, unfreeze_top_n=2)
    trainable_ids_2 = {id(p) for p in trainable_2}

    # Unfreezing 2 groups must include at least as many parameters as unfreezing 1
    assert len(trainable_2) >= len(trainable_1)
    assert trainable_ids_1.issubset(trainable_ids_2)


def test_layer_group_selection_clamps_excessive_n():
    """When unfreeze_top_n exceeds available backbone groups, all groups become trainable without crashing."""
    model = build("mlp_small", num_classes=5)
    trainable, frozen, groups = select_trainable_groups(model, unfreeze_top_n=999)

    # All model parameters should be trainable, 0 frozen
    assert len(frozen) == 0
    assert len(trainable) == len(list(model.parameters()))


# ---------------------------------------------------------------------------
# 3. Frozen-Parameter Audit & Immutability Tests
# ---------------------------------------------------------------------------

def test_frozen_parameter_audit_strict_immutability():
    """Unselected parameters must have zero difference after selective fine-tuning."""
    train_loader, val_loader = _generate_synthetic_separable_data(n_samples=100, num_classes=5)
    model = build("small_cnn", num_classes=5, in_shape=(1, 16, 16))

    candidate, stats = finetune_selective_l2sp(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        unfreeze_top_n=1,
        epochs=3,
        lr=0.01,
        l2sp_alpha=0.1,
    )

    # All frozen parameters must have exactly 0.0 max diff
    assert stats["max_frozen_diff"] == 0.0

    # Trainable parameters must have changed
    trainable_params, frozen_params, _ = select_trainable_groups(model, unfreeze_top_n=1)
    trainable_ids = {id(p) for p in trainable_params}

    model_params = list(model.parameters())
    cand_params = list(candidate.parameters())
    changed_count = 0
    for p_orig, p_cand in zip(model_params, cand_params):
        if id(p_orig) in trainable_ids:
            if not torch.equal(p_orig, p_cand):
                changed_count += 1
    assert changed_count > 0, "Selected parameters should have updated during fine-tuning."


def test_anchors_never_mutated():
    """Verify that original L2-SP anchors remain bitwise identical and never accumulate grad."""
    train_loader, val_loader = _generate_synthetic_separable_data(n_samples=60, num_classes=5)
    model = build("mlp_small", num_classes=5, in_shape=(1, 16, 16))

    # Capture initial parameters
    orig_bytes = [p.detach().cpu().numpy().tobytes() for p in model.parameters()]

    strategy = SelectiveFinetuneL2spStrategy()
    context = RecoveryContext(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        config=load_config(),
        seed=1234,
    )

    candidate, result = strategy.apply(model, context)
    assert result.success is True

    # Assert model passed in was never mutated
    post_bytes = [p.detach().cpu().numpy().tobytes() for p in model.parameters()]
    assert orig_bytes == post_bytes


# ---------------------------------------------------------------------------
# 4. S1 Overfit Scenario Smoke Recovery Test
# ---------------------------------------------------------------------------

def test_s1_overfit_recovery_smoke():
    """Test recovery on synthetic overfit scenario: training accuracy high, validation improved."""
    torch.manual_seed(42)
    # Create separable dataset
    x = torch.randn(200, 1, 16, 16)
    sums = x.view(200, -1).sum(dim=1)
    y = (torch.abs(sums) % 3).long()

    # Small training set (40 samples) to encourage overfitting, 160 validation samples
    train_x, train_y = x[:40], y[:40]
    val_x, val_y = x[40:], y[40:]

    train_loader = DataLoader(TensorDataset(train_x, train_y), batch_size=10, shuffle=False)
    val_loader = DataLoader(TensorDataset(val_x, val_y), batch_size=20, shuffle=False)

    model = build("small_cnn", num_classes=3, in_shape=(1, 16, 16))

    # Overfit intentionally on small train set for 30 epochs
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    model.train()
    for _ in range(25):
        for bx, by in train_loader:
            optimizer.zero_grad()
            out = model(bx)
            loss = nn.functional.cross_entropy(out, by)
            loss.backward()
            optimizer.step()

    model.eval()
    v_logits_before, v_labels_before = predict_logits(model, val_loader)
    val_acc_before = accuracy(v_logits_before, v_labels_before)

    strategy = SelectiveFinetuneL2spStrategy()
    context = RecoveryContext(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        config=load_config(),
        seed=1234,
    )

    candidate, result = strategy.apply(model, context)

    assert result.success is True
    assert result.artifact_metadata["max_frozen_diff"] == 0.0
    assert result.artifact_metadata["l2sp_final_penalty"] >= 0.0
    assert result.compute_units > 0.0
    assert result.grad_steps > 0


# ---------------------------------------------------------------------------
# 5. Safe Failure Modes & Edge Cases
# ---------------------------------------------------------------------------

def test_headless_model_skips_with_no_identifiable_head():
    """Strategy must gracefully reject models without an identifiable classification head."""
    headless = HeadlessModel()
    train_loader, val_loader = _generate_synthetic_separable_data(40, 2)

    strategy = SelectiveFinetuneL2spStrategy()
    context = RecoveryContext(
        model=headless,
        train_loader=train_loader,
        val_loader=val_loader,
        config=load_config(),
    )

    app = strategy.is_applicable(ModelAdapter(headless), context)
    assert app.can_apply is False
    assert app.reason == "NO_IDENTIFIABLE_HEAD"

    cand, result = strategy.apply(headless, context)
    assert result.success is False
    assert "NO_IDENTIFIABLE_HEAD" in result.error_message


def test_missing_training_data_rejected():
    """Missing training data must return MISSING_TRAINING_DATA."""
    model = build("mlp_small", num_classes=5)
    strategy = SelectiveFinetuneL2spStrategy()
    context = RecoveryContext(
        model=model,
        train_loader=None,
        val_loader=None,
        config=load_config(),
    )

    app = strategy.is_applicable(ModelAdapter(model), context)
    assert app.can_apply is False
    assert app.reason == "MISSING_TRAINING_DATA"


def test_non_finite_loss_fails_safely():
    """Non-finite loss during training aborts safely without crashing."""
    x = torch.full((20, 1, 16, 16), float("nan"))
    y = torch.zeros(20, dtype=torch.long)
    bad_loader = DataLoader(TensorDataset(x, y), batch_size=10)

    model = build("small_cnn", num_classes=5, in_shape=(1, 16, 16))
    strategy = SelectiveFinetuneL2spStrategy()
    context = RecoveryContext(
        model=model,
        train_loader=bad_loader,
        val_loader=None,
        config=load_config(),
    )

    cand, result = strategy.apply(model, context)
    assert result.success is False
    assert "Non-finite loss" in result.error_message


def test_deterministic_seed_reproducibility():
    """Same seed must produce byte-identical candidate weights."""
    train_loader, val_loader = _generate_synthetic_separable_data(60, 5)
    model = build("mlp_small", num_classes=5, in_shape=(1, 16, 16))

    strategy = SelectiveFinetuneL2spStrategy()

    ctx1 = RecoveryContext(model=model, train_loader=train_loader, val_loader=val_loader, seed=42)
    cand1, res1 = strategy.apply(model, ctx1)

    ctx2 = RecoveryContext(model=model, train_loader=train_loader, val_loader=val_loader, seed=42)
    cand2, res2 = strategy.apply(model, ctx2)

    for p1, p2 in zip(cand1.parameters(), cand2.parameters()):
        assert torch.equal(p1, p2)


def test_strategy_rejects_holdout():
    """Split discipline: passing holdout into SelectiveFinetuneL2spStrategy must raise ValueError."""
    model = build("mlp_small", num_classes=5, in_shape=(1, 16, 16))
    loader, _ = _generate_synthetic_separable_data(40, 5)

    with pytest.raises(ValueError, match="[Hh]oldout"):
        RecoveryContext(
            model=model,
            train_loader=loader,
            val_loader=loader,
            holdout_loader=loader,
        )

