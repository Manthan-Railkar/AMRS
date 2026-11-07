"""Unit tests for the strategy registry, selector, prerequisites, cost estimation, and budgeting (ML-2)."""

from pathlib import Path

import pytest
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from amrs.evaluation.evaluator import HoldoutIsolatedContext
from amrs.models.adapter import ModelAdapter
from amrs.models.registry import build
from amrs.recovery.base import (
    Applicability,
    CostEstimate,
    RecoveryContext,
    RecoveryStrategy,
    StrategyResult,
)
from amrs.schemas import (
    DiagnosisItem,
    DiagnosisReport,
    SelectorConfig,
)
from amrs.selector.selector import (
    DIAGNOSIS_TO_STRATEGIES,
    StrategyRegistry,
    StrategySelector,
)


def _make_dummy_loader(
    n_samples: int = 100, in_features: int = 16, num_classes: int = 10
) -> DataLoader:
    x = torch.randn(n_samples, 1, in_features, in_features)
    y = torch.randint(0, num_classes, (n_samples,))
    return DataLoader(TensorDataset(x, y), batch_size=32, shuffle=False)


def _make_dummy_report(label: str, confidence: float = 0.9) -> DiagnosisReport:
    if label == "healthy":
        return DiagnosisReport(
            primary_label="healthy",
            is_healthy=True,
            diagnoses=[DiagnosisItem(label="healthy", confidence=1.0, rank=1)],
        )
    return DiagnosisReport(
        primary_label=label,
        is_healthy=False,
        diagnoses=[DiagnosisItem(label=label, confidence=confidence, rank=1)],
    )


class HeadlessNet(nn.Module):
    """Network with no identifiable Linear classification head."""

    def __init__(self) -> None:
        super().__init__()
        self.conv = nn.Conv2d(1, 4, 3)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.conv(x)


class NonBnNet(nn.Module):
    """Network with Linear head but no BatchNorm layers."""

    def __init__(self) -> None:
        super().__init__()
        self.fc1 = nn.Linear(16, 16)
        self.fc = nn.Linear(16, 10)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x.flatten(1)
        x = torch.relu(self.fc1(x))
        return self.fc(x)


@pytest.fixture
def standard_setup(tmp_path: Path):
    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    loader = _make_dummy_loader(100)

    # Create dummy checkpoints
    ckpt1 = tmp_path / "ckpt_epoch001.pt"
    ckpt2 = tmp_path / "ckpt_epoch002.pt"
    ckpt3 = tmp_path / "ckpt_epoch003.pt"
    for ckpt in (ckpt1, ckpt2, ckpt3):
        torch.save(model.state_dict(), ckpt)

    context = RecoveryContext(
        model=model,
        train_loader=loader,
        val_loader=loader,
        target_loader=loader,
        checkpoints=[ckpt1, ckpt2, ckpt3],
    )
    selector = StrategySelector()
    return model, context, selector


# ---------------------------------------------------------------------------
# Section 2.9 Table-Driven Tests
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "diagnosis_label, expected_strategies, expected_primary_metric",
    [
        ("miscalibration", ["temperature_scaling"], "ece"),
        ("bn_drift", ["bn_recalibration", "last_layer_finetune"], "accuracy"),
        (
            "instability",
            ["checkpoint_reversion", "checkpoint_averaging", "selective_finetune_l2sp"],
            "accuracy",
        ),
        (
            "overfitting",
            [
                "checkpoint_reversion",
                "checkpoint_averaging",
                "selective_finetune_l2sp",
                "weight_interpolation",
            ],
            "accuracy",
        ),
        ("head_degradation", ["last_layer_finetune", "selective_finetune_l2sp"], "accuracy"),
    ],
)
def test_section_2_9_mapping_all_diagnoses(
    standard_setup,
    diagnosis_label: str,
    expected_strategies: list[str],
    expected_primary_metric: str,
):
    model, context, selector = standard_setup
    report = _make_dummy_report(diagnosis_label)

    selection = selector.select(report, model, context)

    # 1. Candidate strategies match Section 2.9 table exactly
    scheduled_names = [c.strategy for c in selection.candidates]
    assert scheduled_names == expected_strategies, (
        f"For diagnosis '{diagnosis_label}', expected {expected_strategies} but got {scheduled_names}"
    )

    # 2. Priorities are sequentially assigned 1, 2, ...
    assert [c.priority for c in selection.candidates] == list(
        range(1, len(expected_strategies) + 1)
    )

    # 3. Eligible for contains the diagnosis
    for c in selection.candidates:
        assert diagnosis_label in c.eligible_for
        assert c.primary_metric == expected_primary_metric

    # 4. Costs are strictly in ascending order
    costs = [c.estimated_cost for c in selection.candidates]
    assert costs == sorted(costs), f"Costs {costs} are not in ascending order"


def test_healthy_diagnosis_produces_no_candidates(standard_setup):
    model, context, selector = standard_setup
    report = _make_dummy_report("healthy")

    selection = selector.select(report, model, context)
    assert selection.is_healthy is True
    assert len(selection.candidates) == 0
    assert len(selection.skipped) == 0


def test_force_mode_on_healthy(standard_setup):
    model, context, selector = standard_setup
    report = _make_dummy_report("healthy")

    selection = selector.select(report, model, context, force=True)
    # When forced, strategies are scheduled
    assert len(selection.candidates) > 0


# ---------------------------------------------------------------------------
# Multi-Label Deduplication and Reason Merging Tests
# ---------------------------------------------------------------------------


def test_multi_label_deduplication_overfitting_and_instability(standard_setup):
    model, context, selector = standard_setup
    report = DiagnosisReport(
        primary_label="instability",
        is_healthy=False,
        diagnoses=[
            DiagnosisItem(label="instability", confidence=0.85, rank=1),
            DiagnosisItem(label="overfitting", confidence=0.70, rank=2),
        ],
    )

    selection = selector.select(report, model, context)
    scheduled_names = [c.strategy for c in selection.candidates]

    # Deduplicated set of strategies
    expected = [
        "checkpoint_reversion",
        "checkpoint_averaging",
        "selective_finetune_l2sp",
        "weight_interpolation",
    ]
    assert scheduled_names == expected

    # Check reason merging
    by_name = {c.strategy: c for c in selection.candidates}
    assert set(by_name["checkpoint_reversion"].eligible_for) == {"instability", "overfitting"}
    assert set(by_name["checkpoint_averaging"].eligible_for) == {"instability", "overfitting"}
    assert set(by_name["selective_finetune_l2sp"].eligible_for) == {"instability", "overfitting"}
    assert set(by_name["weight_interpolation"].eligible_for) == {"overfitting"}


def test_multi_label_deduplication_bn_drift_and_head_degradation(standard_setup):
    model, context, selector = standard_setup
    report = DiagnosisReport(
        primary_label="bn_drift",
        is_healthy=False,
        diagnoses=[
            DiagnosisItem(label="bn_drift", confidence=0.9, rank=1),
            DiagnosisItem(label="head_degradation", confidence=0.8, rank=2),
        ],
    )

    selection = selector.select(report, model, context)
    scheduled_names = [c.strategy for c in selection.candidates]

    # bn_recalibration (from bn_drift), last_layer_finetune (both), selective_finetune_l2sp (head_deg)
    assert scheduled_names == ["bn_recalibration", "last_layer_finetune", "selective_finetune_l2sp"]

    by_name = {c.strategy: c for c in selection.candidates}
    assert set(by_name["last_layer_finetune"].eligible_for) == {"bn_drift", "head_degradation"}
    assert set(by_name["bn_recalibration"].eligible_for) == {"bn_drift"}
    assert set(by_name["selective_finetune_l2sp"].eligible_for) == {"head_degradation"}


# ---------------------------------------------------------------------------
# Missing Prerequisites Tests
# ---------------------------------------------------------------------------


def test_missing_prerequisites_no_history(tmp_path: Path):
    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    loader = _make_dummy_loader(100)

    # Empty checkpoints list
    context = RecoveryContext(
        model=model,
        train_loader=loader,
        val_loader=loader,
        checkpoints=[],
    )
    selector = StrategySelector()
    report = _make_dummy_report("instability")

    selection = selector.select(report, model, context)

    # Checkpoint reversion and averaging must be skipped with NO_HISTORY
    skipped_reasons = {s.strategy: s.reason for s in selection.skipped}
    assert skipped_reasons.get("checkpoint_reversion") == "NO_HISTORY"
    assert skipped_reasons.get("checkpoint_averaging") == "NO_HISTORY"

    # Selective fine-tuning does not require checkpoints and can still be scheduled
    scheduled_names = [c.strategy for c in selection.candidates]
    assert scheduled_names == ["selective_finetune_l2sp"]


def test_missing_prerequisites_single_checkpoint_allows_reversion_skips_averaging(tmp_path: Path):
    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    loader = _make_dummy_loader(100)

    ckpt1 = tmp_path / "ckpt_epoch001.pt"
    torch.save(model.state_dict(), ckpt1)

    context = RecoveryContext(
        model=model,
        train_loader=loader,
        val_loader=loader,
        checkpoints=[ckpt1],
    )
    selector = StrategySelector()
    report = _make_dummy_report("instability")

    selection = selector.select(report, model, context)

    # 1 checkpoint is sufficient for reversion, but averaging requires >= 2
    scheduled_names = [c.strategy for c in selection.candidates]
    assert "checkpoint_reversion" in scheduled_names
    assert "checkpoint_averaging" not in scheduled_names

    skipped_reasons = {s.strategy: s.reason for s in selection.skipped}
    assert skipped_reasons.get("checkpoint_averaging") == "NO_HISTORY"


def test_missing_prerequisites_no_bn_layers():
    model = NonBnNet()
    loader = _make_dummy_loader(100)
    context = RecoveryContext(
        model=model,
        train_loader=loader,
        val_loader=loader,
        target_loader=loader,
    )
    selector = StrategySelector()
    report = _make_dummy_report("bn_drift")

    selection = selector.select(report, model, context)

    # bn_recalibration must be skipped with NO_BN_LAYERS
    skipped_reasons = {s.strategy: s.reason for s in selection.skipped}
    assert skipped_reasons.get("bn_recalibration") == "NO_BN_LAYERS"

    # last_layer_finetune can still run
    scheduled_names = [c.strategy for c in selection.candidates]
    assert scheduled_names == ["last_layer_finetune"]


def test_missing_prerequisites_no_identifiable_head():
    model = HeadlessNet()
    loader = _make_dummy_loader(100)
    context = RecoveryContext(
        model=model,
        train_loader=loader,
        val_loader=loader,
    )
    selector = StrategySelector()
    report = _make_dummy_report("head_degradation")

    selection = selector.select(report, model, context)

    # Both last_layer_finetune and selective_finetune_l2sp require identifiable head
    skipped_reasons = {s.strategy: s.reason for s in selection.skipped}
    assert skipped_reasons.get("last_layer_finetune") == "NO_IDENTIFIABLE_HEAD"
    assert skipped_reasons.get("selective_finetune_l2sp") == "NO_IDENTIFIABLE_HEAD"
    assert len(selection.candidates) == 0


def test_missing_prerequisites_missing_target():
    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    # No target_loader and no val_loader
    context = RecoveryContext(
        model=model,
        train_loader=_make_dummy_loader(100),
        val_loader=None,
        target_loader=None,
    )
    selector = StrategySelector()
    report = _make_dummy_report("bn_drift")

    selection = selector.select(report, model, context)

    skipped_reasons = {s.strategy: s.reason for s in selection.skipped}
    assert skipped_reasons.get("bn_recalibration") == "MISSING_TARGET"


# ---------------------------------------------------------------------------
# Deterministic Ordering and Tie-Break Tests
# ---------------------------------------------------------------------------


class DummyStrategyA(RecoveryStrategy):
    @property
    def name(self) -> str:
        return "alpha_strat"

    def is_applicable(self, model: ModelAdapter, context: RecoveryContext) -> Applicability:
        return Applicability(can_apply=True)

    def estimate_cost(
        self, context: RecoveryContext, model: ModelAdapter | None = None
    ) -> CostEstimate:
        return CostEstimate(estimated_units=500.0)

    def apply(
        self, model_copy: nn.Module, context: RecoveryContext
    ) -> tuple[nn.Module, StrategyResult]:
        raise NotImplementedError()


class DummyStrategyB(RecoveryStrategy):
    @property
    def name(self) -> str:
        return "beta_strat"

    def is_applicable(self, model: ModelAdapter, context: RecoveryContext) -> Applicability:
        return Applicability(can_apply=True)

    def estimate_cost(
        self, context: RecoveryContext, model: ModelAdapter | None = None
    ) -> CostEstimate:
        return CostEstimate(estimated_units=500.0)

    def apply(
        self, model_copy: nn.Module, context: RecoveryContext
    ) -> tuple[nn.Module, StrategyResult]:
        raise NotImplementedError()


def test_equal_cost_deterministic_name_tie_break():
    registry = StrategyRegistry()
    registry.register(DummyStrategyA())
    registry.register(DummyStrategyB())

    # Map a test diagnosis
    DIAGNOSIS_TO_STRATEGIES["test_equal_cost"] = ["beta_strat", "alpha_strat"]

    selector = StrategySelector(registry=registry)
    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    context = RecoveryContext(model=model)
    report = _make_dummy_report("test_equal_cost")

    selection = selector.select(report, model, context)
    # alpha_strat should be first due to alphabetical tie break
    scheduled_names = [c.strategy for c in selection.candidates]
    assert scheduled_names == ["alpha_strat", "beta_strat"]

    # Verify identical order on repeated runs
    selection2 = selector.select(report, model, context)
    assert [c.strategy for c in selection2.candidates] == ["alpha_strat", "beta_strat"]


# ---------------------------------------------------------------------------
# Budget Enforcement Tests (Candidate Count & Compute Ratio)
# ---------------------------------------------------------------------------


def test_max_candidates_budget_enforcement(standard_setup):
    model, context, selector = standard_setup
    report = _make_dummy_report("overfitting")  # 4 eligible strategies

    config = SelectorConfig(max_candidates=2, max_compute_ratio_vs_retrain=1.0)
    selection = selector.select(report, model, context, config=config)

    # Exactly 2 candidates scheduled
    assert len(selection.candidates) == 2
    assert [c.strategy for c in selection.candidates] == [
        "checkpoint_reversion",
        "checkpoint_averaging",
    ]

    # Remaining 2 skipped with BUDGET_EXCEEDED
    skipped_reasons = {s.strategy: s.reason for s in selection.skipped}
    assert skipped_reasons.get("selective_finetune_l2sp") == "BUDGET_EXCEEDED"
    assert skipped_reasons.get("weight_interpolation") == "BUDGET_EXCEEDED"


def test_compute_budget_ratio_enforcement(standard_setup):
    model, context, selector = standard_setup
    report = _make_dummy_report("overfitting")

    # Set compute ratio small so only cheapest candidate (checkpoint_reversion at 100 units) can fit
    # Retrain cost is set to 10,000 units.
    # At ratio 0.011, budget is 110 units.
    # checkpoint_reversion is 100 units <= 110, so it fits.
    # checkpoint_averaging is 125 units > 110, so it exceeds budget.
    config = SelectorConfig(
        max_candidates=10,
        max_compute_ratio_vs_retrain=0.011,
        retrain_reference_units="10000.0",
    )
    selection = selector.select(report, model, context, config=config)

    assert len(selection.candidates) == 1
    assert selection.candidates[0].strategy == "checkpoint_reversion"

    # All others exceed budget
    skipped_reasons = {s.strategy: s.reason for s in selection.skipped}
    assert skipped_reasons.get("checkpoint_averaging") == "BUDGET_EXCEEDED"
    assert skipped_reasons.get("selective_finetune_l2sp") == "BUDGET_EXCEEDED"


# ---------------------------------------------------------------------------
# Split Discipline and Holdout Isolation Tests
# ---------------------------------------------------------------------------


def test_holdout_isolation_rejection_in_context():
    loader = _make_dummy_loader(100)
    with pytest.raises(ValueError) as exc:
        RecoveryContext(
            train_loader=loader,
            holdout_loader=loader,
        )
    assert "Holdout data must never enter RecoveryContext" in str(exc.value)


def test_holdout_isolated_context_conversion_does_not_access_holdout():
    loader = _make_dummy_loader(100)
    isolated_ctx = HoldoutIsolatedContext(
        train_loader=loader,
        val_loader=loader,
        target_loader=loader,
        holdout_loader=loader,
    )

    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    selector = StrategySelector()
    report = _make_dummy_report("miscalibration")

    selection = selector.select(report, model, isolated_ctx)
    assert len(selection.candidates) == 1
    assert selection.candidates[0].strategy == "temperature_scaling"

    # Holdout evaluation count on isolated context must remain 0
    assert isolated_ctx._holdout_eval_count == 0


# ---------------------------------------------------------------------------
# Serialization and Consistency Tests
# ---------------------------------------------------------------------------


def test_selection_report_serialization(standard_setup):
    model, context, selector = standard_setup
    report = _make_dummy_report("bn_drift")

    selection = selector.select(report, model, context)
    dumped = selection.model_dump()

    assert "candidates" in dumped
    assert "skipped" in dumped
    assert "total_estimated_cost" in dumped
    assert "compute_budget" in dumped
    assert "retrain_reference_units" in dumped
    assert dumped["primary_label"] == "bn_drift"
    assert len(dumped["candidates"]) == 2
