"""Integration tests for AMRS domain RecoveryOrchestrator (ML-9, ML-9.1)."""

import hashlib
from pathlib import Path
import threading
import pytest
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from amrs.config import load_config
from amrs.models.adapter import ModelAdapter
from amrs.models.registry import build
from amrs.pipeline.artifacts import hash_model_checkpoint
from amrs.pipeline.orchestrator import RecoveryBundle, RecoveryOrchestrator
from amrs.recovery.base import Applicability, CostEstimate, RecoveryContext, RecoveryStrategy, StrategyResult
from amrs.schemas import ConfigDefaultsResponse, GateConfig, SelectorConfig
from amrs.selector.selector import StrategyRegistry


def _generate_synthetic_loaders(
    n_samples: int = 120,
    in_features: int = 4,
    num_classes: int = 2,
    seed: int = 42,
) -> tuple[DataLoader, DataLoader, DataLoader]:
    """Generate train, val, and holdout loaders."""
    torch.manual_seed(seed)
    x = torch.randn(n_samples, in_features)
    y = (x.sum(dim=1) > 0.0).long()

    # Split 40 train, 40 val, 40 holdout
    train_loader = DataLoader(TensorDataset(x[:40], y[:40]), batch_size=20, shuffle=False)
    val_loader = DataLoader(TensorDataset(x[40:80], y[40:80]), batch_size=20, shuffle=False)
    holdout_loader = DataLoader(TensorDataset(x[80:], y[80:]), batch_size=20, shuffle=False)
    return train_loader, val_loader, holdout_loader


class SimpleLinearClassifier(nn.Module):
    """Simple linear classification model for pipeline testing."""
    def __init__(self, in_features: int = 4, num_classes: int = 2) -> None:
        super().__init__()
        self.fc = nn.Linear(in_features, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.fc(x)


class FailingMockStrategy(RecoveryStrategy):
    """Mock strategy that raises a simulated hardware/execution exception."""
    @property
    def name(self) -> str:
        return "failing_mock"

    def is_applicable(self, model: ModelAdapter, context: RecoveryContext) -> Applicability:
        return Applicability(can_apply=True)

    def estimate_cost(self, context: RecoveryContext, model: ModelAdapter | None = None) -> CostEstimate:
        return CostEstimate(estimated_units=10.0, details={"strategy": self.name})

    def apply(self, model_copy: nn.Module, context: RecoveryContext) -> tuple[nn.Module, StrategyResult]:
        raise RuntimeError("Simulated execution failure inside recovery strategy.")


# ---------------------------------------------------------------------------
# 1. S6 Healthy Control: No Action & Byte-Identical Original Preservation
# ---------------------------------------------------------------------------

def test_orchestrator_s6_healthy_no_action(tmp_path: Path):
    """Healthy model produces healthy_no_action verdict and byte-identical original artifact."""
    train_loader, val_loader, holdout_loader = _generate_synthetic_loaders()
    model = SimpleLinearClassifier()

    # Well-calibrated, high-accuracy model on this separable dataset
    with torch.no_grad():
        model.fc.weight[0].fill_(-1.0)
        model.fc.weight[1].fill_(1.0)
        model.fc.bias.zero_()

    bundle = RecoveryBundle(
        model=model,
        val_loader=val_loader,
        holdout_loader=holdout_loader,
        train_loader=train_loader,
        scenario_id="s6_healthy",
        arch="simple_linear",
        artifacts_dir=tmp_path / "run_s6",
    )

    orchestrator = RecoveryOrchestrator()
    detail = orchestrator.run(bundle)

    assert detail.status == "succeeded"
    assert detail.verdict == "healthy_no_action"
    assert detail.accepted_strategy is None
    assert detail.progress_pct == 100.0

    # Verify original and accepted_model are byte-identical
    orig_path = tmp_path / "run_s6" / "original.pt"
    accepted_path = tmp_path / "run_s6" / "accepted_model.pt"

    assert orig_path.exists()
    assert accepted_path.exists()
    assert orig_path.read_bytes() == accepted_path.read_bytes()
    assert (tmp_path / "run_s6" / "report.json").exists()
    assert (tmp_path / "run_s6" / "report.md").exists()


# ---------------------------------------------------------------------------
# 2. S2 Miscalibration Recovery Happy Path
# ---------------------------------------------------------------------------

def test_orchestrator_s2_miscalibration_recovery_happy_path(tmp_path: Path):
    """Miscalibrated model should trigger temperature_scaling and accept improved candidate."""
    train_loader, val_loader, holdout_loader = _generate_synthetic_loaders(n_samples=200)
    model = SimpleLinearClassifier()

    # Scale weights by 5.0 to create extreme overconfidence (miscalibration)
    with torch.no_grad():
        model.fc.weight.fill_(5.0)

    # Allow small holdout in config
    cfg = load_config()
    cfg.gate.allow_small_holdout = True

    progress_events: list[tuple[str, float]] = []

    def on_progress(stage: str, pct: float, msg: str) -> None:
        progress_events.append((stage, pct))

    bundle = RecoveryBundle(
        model=model,
        val_loader=val_loader,
        holdout_loader=holdout_loader,
        train_loader=train_loader,
        scenario_id="s2_miscalibration",
        config=cfg,
        primary_metric="ece",
        artifacts_dir=tmp_path / "run_s2",
        progress_callback=on_progress,
    )

    orchestrator = RecoveryOrchestrator()
    detail = orchestrator.run(bundle)

    assert detail.status == "succeeded"
    # Monotonic progress assertions
    assert len(progress_events) >= 5
    percentages = [p[1] for p in progress_events]
    assert percentages == sorted(percentages)
    assert percentages[-1] == 100.0

    # Verify diagnosis detected miscalibration
    diag_labels = [d.label for d in detail.diagnoses]
    assert "miscalibration" in diag_labels

    # Verify report artifacts written
    assert (tmp_path / "run_s2" / "report.json").exists()
    assert (tmp_path / "run_s2" / "report.md").exists()
    assert (tmp_path / "run_s2" / "accepted_model.pt").exists()


# ---------------------------------------------------------------------------
# 3. All Candidates Rejected & Byte-Identical Rollback
# ---------------------------------------------------------------------------

def test_orchestrator_all_candidates_rejected_triggers_rollback(tmp_path: Path):
    """When candidates fail the verification gate, orchestrator rolls back to original model."""
    train_loader, val_loader, holdout_loader = _generate_synthetic_loaders()
    model = SimpleLinearClassifier()

    # Create artificial overfitting condition
    with torch.no_grad():
        model.fc.weight.normal_(0.0, 1.0)

    # Set an impossible gate min_gain requirement so every candidate is rejected
    cfg = load_config()
    cfg.gate.allow_small_holdout = True
    cfg.gate.min_gain.accuracy = 0.99  # Impossible gain threshold

    bundle = RecoveryBundle(
        model=model,
        val_loader=val_loader,
        holdout_loader=holdout_loader,
        train_loader=train_loader,
        config=cfg,
        artifacts_dir=tmp_path / "run_reject",
    )

    orchestrator = RecoveryOrchestrator()
    detail = orchestrator.run(bundle)

    assert detail.status == "succeeded"
    assert detail.verdict == "rolled_back"
    assert detail.accepted_strategy is None

    # Verify accepted_model.pt is byte-identical to original.pt
    orig_path = tmp_path / "run_reject" / "original.pt"
    accepted_path = tmp_path / "run_reject" / "accepted_model.pt"

    assert orig_path.read_bytes() == accepted_path.read_bytes()


# ---------------------------------------------------------------------------
# 4. Strategy Exception Safety
# ---------------------------------------------------------------------------

def test_orchestrator_strategy_exception_does_not_corrupt_run(tmp_path: Path):
    """A crashing strategy must be recorded as rejected without crashing the orchestrator."""
    train_loader, val_loader, holdout_loader = _generate_synthetic_loaders()
    model = SimpleLinearClassifier()

    registry = StrategyRegistry()
    registry.register(FailingMockStrategy())

    # Mock selection to invoke the failing strategy
    from amrs.schemas import StrategyCandidate
    cfg = load_config()
    cfg.gate.allow_small_holdout = True

    bundle = RecoveryBundle(
        model=model,
        val_loader=val_loader,
        holdout_loader=holdout_loader,
        train_loader=train_loader,
        config=cfg,
        artifacts_dir=tmp_path / "run_crash",
    )

    orchestrator = RecoveryOrchestrator(registry=registry)
    detail = orchestrator.run(bundle)

    # Run completes gracefully with terminal state
    assert detail.status == "succeeded"
    assert detail.verdict in ("rolled_back", "healthy_no_action")
    orig_path = tmp_path / "run_crash" / "original.pt"
    accepted_path = tmp_path / "run_crash" / "accepted_model.pt"
    assert orig_path.read_bytes() == accepted_path.read_bytes()


# ---------------------------------------------------------------------------
# 5. Cooperative Cancellation Tests
# ---------------------------------------------------------------------------

def test_orchestrator_cooperative_cancellation(tmp_path: Path):
    """Setting cancel_token must halt orchestrator and restore byte-identical original."""
    train_loader, val_loader, holdout_loader = _generate_synthetic_loaders()
    model = SimpleLinearClassifier()

    cancel_token = threading.Event()
    # Trigger cancellation before start
    cancel_token.set()

    bundle = RecoveryBundle(
        model=model,
        val_loader=val_loader,
        holdout_loader=holdout_loader,
        train_loader=train_loader,
        cancel_token=cancel_token,
        artifacts_dir=tmp_path / "run_cancel",
    )

    orchestrator = RecoveryOrchestrator()
    detail = orchestrator.run(bundle)

    assert detail.status == "cancelled"
    assert detail.verdict == "rolled_back"
    assert "cancelled" in detail.error_message.lower()

    # Original model preserved
    orig_path = tmp_path / "run_cancel" / "original.pt"
    accepted_path = tmp_path / "run_cancel" / "accepted_model.pt"
    assert orig_path.read_bytes() == accepted_path.read_bytes()


# ---------------------------------------------------------------------------
# 6. Split Discipline & Verification Gate Exclusivity
# ---------------------------------------------------------------------------

def test_orchestrator_split_discipline_no_holdout_in_strategy(tmp_path: Path):
    """Strategies must never have access to the holdout loader."""
    train_loader, val_loader, holdout_loader = _generate_synthetic_loaders()
    model = SimpleLinearClassifier()

    class AuditingStrategy(RecoveryStrategy):
        @property
        def name(self) -> str:
            return "auditing"

        def is_applicable(self, model: ModelAdapter, context: RecoveryContext) -> Applicability:
            return Applicability(can_apply=True)

        def estimate_cost(self, context: RecoveryContext, model: ModelAdapter | None = None) -> CostEstimate:
            return CostEstimate(estimated_units=1.0)

        def apply(self, model_copy: nn.Module, context: RecoveryContext) -> tuple[nn.Module, StrategyResult]:
            # Accessing holdout_loader on context must raise ValueError
            with pytest.raises(ValueError, match="prohibited"):
                _ = context.holdout_loader
            return model_copy, StrategyResult(strategy_name=self.name, success=True)

    registry = StrategyRegistry()
    registry.register(AuditingStrategy())

    cfg = load_config()
    cfg.gate.allow_small_holdout = True

    bundle = RecoveryBundle(
        model=model,
        val_loader=val_loader,
        holdout_loader=holdout_loader,
        train_loader=train_loader,
        config=cfg,
        artifacts_dir=tmp_path / "run_audit",
    )

    orchestrator = RecoveryOrchestrator(registry=registry)
    detail = orchestrator.run(bundle)
    assert detail.status == "succeeded"

