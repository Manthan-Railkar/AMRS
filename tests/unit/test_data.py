"""Unit and property tests for DM-2.1 Data Contract, splitters, loaders, shifts, and synthetic data."""

from __future__ import annotations

import warnings

import numpy as np
import pytest
import torch
import torch.nn as nn
from hypothesis import given, settings
from hypothesis import strategies as st

from amrs.data.loaders import make_loader
from amrs.data.shifts import apply_shift
from amrs.data.splits import make_bundle
from amrs.data.synthetic import IdentifiedTensorDataset, make_synthetic_images
from amrs.errors import HoldoutTooSmallError
from amrs.schemas import ConfigDefaultsResponse


class DummyTinyModel(nn.Module):
    """Tiny linear classifier used to test synthetic dataset learnability and shift impact."""

    def __init__(self, in_features: int = 64, num_classes: int = 4) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Flatten(),
            nn.Linear(in_features, 32),
            nn.ReLU(),
            nn.Linear(32, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


# ---------------------------------------------------------------------------
# Criterion 1 & 2: Pairwise Disjoint IDs & Determinism Across Seeds
# ---------------------------------------------------------------------------


def test_bundle_pairwise_disjoint_ids_case_explicit_holdout() -> None:
    """Explicit train, val, and holdout datasets have pairwise-disjoint IDs."""
    train_ds = make_synthetic_images(1000, num_classes=4, seed=1)
    val_ds = make_synthetic_images(300, num_classes=4, seed=2)
    holdout_ds = make_synthetic_images(300, num_classes=4, seed=3)

    bundle = make_bundle(train_ds, val_ds=val_ds, holdout_ds=holdout_ds, seed=42)

    train_ids = set(bundle.train.ids)
    val_ids = set(bundle.val.ids)
    holdout_ids = set(bundle.holdout.ids)

    assert train_ids.isdisjoint(val_ids)
    assert train_ids.isdisjoint(holdout_ids)
    assert val_ids.isdisjoint(holdout_ids)


def test_bundle_pairwise_disjoint_ids_case_holdout_from_val() -> None:
    """When val is given, 50/50 split creates disjoint val and holdout sets."""
    train_ds = make_synthetic_images(1000, num_classes=4, seed=10)
    val_ds = make_synthetic_images(600, num_classes=4, seed=20)

    bundle = make_bundle(train_ds, val_ds=val_ds, seed=42)

    train_ids = set(bundle.train.ids)
    val_ids = set(bundle.val.ids)
    holdout_ids = set(bundle.holdout.ids)

    assert train_ids.isdisjoint(val_ids)
    assert train_ids.isdisjoint(holdout_ids)
    assert val_ids.isdisjoint(holdout_ids)
    assert len(bundle.val) + len(bundle.holdout) == len(val_ds)
    assert len(bundle.holdout) == 300


def test_bundle_pairwise_disjoint_ids_case_carve_from_train() -> None:
    """When only train is given, 70/15/15 carve creates disjoint sets and emits warning."""
    train_ds = make_synthetic_images(2000, num_classes=4, seed=100)

    with pytest.warns(UserWarning, match="LEAKAGE_RISK"):
        bundle = make_bundle(train_ds, seed=42)

    train_ids = set(bundle.train.ids)
    val_ids = set(bundle.val.ids)
    holdout_ids = set(bundle.holdout.ids)

    assert train_ids.isdisjoint(val_ids)
    assert train_ids.isdisjoint(holdout_ids)
    assert val_ids.isdisjoint(holdout_ids)
    assert len(bundle.train) + len(bundle.val) + len(bundle.holdout) == len(train_ds)


def test_bundle_determinism_per_seed_and_difference_across_seeds() -> None:
    """make_bundle is strictly deterministic for fixed seed and differs across different seeds."""
    ds = make_synthetic_images(2000, num_classes=4, seed=1)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        b1 = make_bundle(ds, seed=42)
        b2 = make_bundle(ds, seed=42)
        b3 = make_bundle(ds, seed=999)

    assert b1.train.ids == b2.train.ids
    assert b1.val.ids == b2.val.ids
    assert b1.holdout.ids == b2.holdout.ids

    assert b1.holdout.ids != b3.holdout.ids


# ---------------------------------------------------------------------------
# Criterion 3: Stratification Keeps Proportions within 2 Percentage Points
# ---------------------------------------------------------------------------


def test_stratification_preserves_class_proportions() -> None:
    """Stratified splitting maintains class proportions within ±2 percentage points."""
    # Create unbalanced dataset: 50% class 0, 30% class 1, 20% class 2
    n = 2000
    labels = np.array([0] * 1000 + [1] * 600 + [2] * 400, dtype=np.int64)
    images = torch.randn(n, 1, 8, 8)
    ds = IdentifiedTensorDataset(images, torch.from_numpy(labels))

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        bundle = make_bundle(ds, seed=123)

    for split_ds in (bundle.train, bundle.val, bundle.holdout):
        lbls = [int(ds[i][1]) for i in split_ds.indices]  # type: ignore[attr-defined]
        total = len(lbls)
        p0 = lbls.count(0) / total
        p1 = lbls.count(1) / total
        p2 = lbls.count(2) / total

        assert abs(p0 - 0.50) <= 0.02, f"Class 0 proportion deviation: {abs(p0 - 0.50)}"
        assert abs(p1 - 0.30) <= 0.02, f"Class 1 proportion deviation: {abs(p1 - 0.30)}"
        assert abs(p2 - 0.20) <= 0.02, f"Class 2 proportion deviation: {abs(p2 - 0.20)}"


# ---------------------------------------------------------------------------
# Criterion 4: HOLDOUT_TOO_SMALL (< 200) and Warning (< 500)
# ---------------------------------------------------------------------------


def test_holdout_too_small_raised_for_150_samples() -> None:
    """HoldoutTooSmallError must be raised when holdout size is below 200."""
    train_ds = make_synthetic_images(500, num_classes=4, seed=1)
    holdout_ds = make_synthetic_images(150, num_classes=4, seed=2)

    with pytest.raises(HoldoutTooSmallError) as exc_info:
        make_bundle(train_ds, holdout_ds=holdout_ds, seed=42)

    assert exc_info.value.code == "HOLDOUT_TOO_SMALL"
    assert exc_info.value.details["holdout_size"] == 150


def test_allow_small_holdout_suppresses_exception() -> None:
    """allow_small_holdout=True allows holdout < 200 with a warning."""
    train_ds = make_synthetic_images(500, num_classes=4, seed=1)
    holdout_ds = make_synthetic_images(150, num_classes=4, seed=2)

    cfg = ConfigDefaultsResponse()
    cfg.gate.allow_small_holdout = True

    with pytest.warns(UserWarning, match="HOLDOUT_SIZE_WARNING"):
        bundle = make_bundle(train_ds, holdout_ds=holdout_ds, cfg=cfg, seed=42)

    assert len(bundle.holdout) == 150


def test_holdout_size_warning_emitted_for_300_samples() -> None:
    """Warning is emitted when holdout size is between 200 and 499 samples."""
    train_ds = make_synthetic_images(500, num_classes=4, seed=1)
    holdout_ds = make_synthetic_images(300, num_classes=4, seed=2)

    with pytest.warns(UserWarning, match="HOLDOUT_SIZE_WARNING"):
        bundle = make_bundle(train_ds, holdout_ds=holdout_ds, seed=42)

    assert len(bundle.holdout) == 300


# ---------------------------------------------------------------------------
# Criterion 5 & Learnability: Synthetic Learnable > 90% and Shift Lowers Acc >= 10%
# ---------------------------------------------------------------------------


def test_synthetic_data_learnability_and_severe_shift_accuracy_drop() -> None:
    """Synthetic dataset reaches > 90% accuracy, and severe shift drops accuracy by >= 10 points."""
    torch.manual_seed(42)
    train_ds = make_synthetic_images(800, num_classes=4, shape=(1, 8, 8), seed=42)
    test_ds = make_synthetic_images(250, num_classes=4, shape=(1, 8, 8), seed=43)

    train_loader = make_loader(train_ds, batch_size=32, shuffle=True, seed=42)
    test_loader = make_loader(test_ds, batch_size=64, shuffle=False)

    model = DummyTinyModel(in_features=64, num_classes=4)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    criterion = nn.CrossEntropyLoss()

    # Fast 8-epoch training on synthetic data (takes < 1 second on CPU)
    model.train()
    for _ in range(8):
        for x, y in train_loader:
            optimizer.zero_grad()
            out = model(x)
            loss = criterion(out, y)
            loss.backward()
            optimizer.step()

    # Evaluate on clean test set
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for x, y in test_loader:
            preds = model(x).argmax(dim=-1)
            correct += (preds == y).sum().item()
            total += len(y)
    clean_acc = correct / total
    assert clean_acc >= 0.90, f"Clean synthetic accuracy {clean_acc:.2%} < 90%"

    # Apply severe covariate shift
    shifted_ds = apply_shift(test_ds, preset="severe", seed=42)
    shifted_loader = make_loader(shifted_ds, batch_size=64, shuffle=False)

    shifted_correct = 0
    with torch.no_grad():
        for x, y in shifted_loader:
            preds = model(x).argmax(dim=-1)
            shifted_correct += (preds == y).sum().item()
    shifted_acc = shifted_correct / total

    acc_drop = clean_acc - shifted_acc
    assert acc_drop >= 0.10, f"Severe shift drop {acc_drop:.2%} was less than required 10 points"


# ---------------------------------------------------------------------------
# Criterion 6: Byte-Identical Synthetic Data Across Runs
# ---------------------------------------------------------------------------


def test_synthetic_data_byte_identical_across_runs() -> None:
    """Synthetic data with same seed produces identical bytes across distinct generations."""
    ds1 = make_synthetic_images(300, num_classes=4, shape=(1, 8, 8), seed=777)
    ds2 = make_synthetic_images(300, num_classes=4, shape=(1, 8, 8), seed=777)

    assert torch.equal(ds1.images, ds2.images)
    assert torch.equal(ds1.labels, ds2.labels)
    assert ds1.ids == ds2.ids


# ---------------------------------------------------------------------------
# Missing Class Failure Path Test
# ---------------------------------------------------------------------------


def test_missing_class_in_holdout_emits_warning() -> None:
    """Warns when a class present in training data is missing from holdout data."""
    train_ds = make_synthetic_images(500, num_classes=4, seed=1)

    # Hand-craft holdout with only classes 0, 1, 2 (class 3 missing)
    images = torch.randn(300, 1, 8, 8)
    labels = torch.tensor([0, 1, 2] * 100, dtype=torch.long)
    holdout_ds = IdentifiedTensorDataset(images, labels)

    with pytest.warns(UserWarning, match="MISSING_CLASS_WARNING"):
        bundle = make_bundle(train_ds, holdout_ds=holdout_ds, seed=42)

    assert "MISSING_CLASS_WARNING" in bundle.provenance["warnings"]


# ---------------------------------------------------------------------------
# Hypothesis Property Test for Disjointness Over Random Sizes
# ---------------------------------------------------------------------------


@settings(max_examples=15, deadline=None)
@given(
    n_train=st.integers(min_value=300, max_value=800),
    n_val=st.integers(min_value=250, max_value=500),
    seed=st.integers(min_value=1, max_value=10000),
)
def test_hypothesis_disjointness(n_train: int, n_val: int, seed: int) -> None:
    """Property test asserting disjoint IDs across arbitrary sizes under holdout_from_val."""
    train_ds = make_synthetic_images(n_train, num_classes=4, seed=seed)
    val_ds = make_synthetic_images(n_val, num_classes=4, seed=seed + 1)

    cfg = ConfigDefaultsResponse()
    cfg.gate.allow_small_holdout = True

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        bundle = make_bundle(train_ds, val_ds=val_ds, cfg=cfg, seed=seed)

    t_ids = set(bundle.train.ids)
    v_ids = set(bundle.val.ids)
    h_ids = set(bundle.holdout.ids)

    assert t_ids.isdisjoint(v_ids)
    assert t_ids.isdisjoint(h_ids)
    assert v_ids.isdisjoint(h_ids)
