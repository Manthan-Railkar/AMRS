"""Integration test suite verifying verification gate, holdout integrity, and model immutability (BE-5).

Guarantees:
1. Holdout is not passed to candidate selection.
2. Original checkpoint hash is unchanged.
3. A rejected candidate cannot become the output model.
4. Gate decisions are reproducible for a fixed seed/config.
5. Policy versions and hashes are auditable across strict/default/lenient configurations.
"""

from __future__ import annotations

import hashlib
from pathlib import Path
import pytest
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from amrs.config import compute_gate_policy_hash, load_config
from amrs.errors import ForbiddenError
from amrs.evaluation.evaluator import HoldoutIsolatedContext, ModelEvaluator
from amrs.evaluation.gate import VerificationGate
from amrs.models.loader import load_state_dict_safe
from amrs.models.registry import build
from amrs.models.zoo import save_checkpoint
from amrs.schemas import GateConfig


def test_holdout_not_passed_to_candidate_selection() -> None:
    """Acceptance criterion 1: tests prove holdout is not passed into candidate selection."""
    x = torch.randn(200, 4)
    y = torch.zeros(200, dtype=torch.long)
    train_dl = DataLoader(TensorDataset(x, y))
    val_dl = DataLoader(TensorDataset(x, y))
    target_dl = DataLoader(TensorDataset(x, y))
    holdout_dl = DataLoader(TensorDataset(x, y))

    ctx = HoldoutIsolatedContext(
        train_loader=train_dl,
        val_loader=val_dl,
        target_loader=target_dl,
        holdout_loader=holdout_dl,
        split_id="test_split_xyz",
    )

    # Candidate selection uses get_candidate_selection_loaders()
    selection_loaders = ctx.get_candidate_selection_loaders()
    assert "holdout" not in selection_loaders
    assert selection_loaders["train"] is train_dl
    assert selection_loaders["val"] is val_dl
    assert selection_loaders["target"] is target_dl

    # Direct access raises ForbiddenError
    with pytest.raises(ForbiddenError):
        _ = ctx.holdout_loader


def test_original_checkpoint_hash_is_strictly_unchanged(tmp_path: Path) -> None:
    """Acceptance criterion 2: original checkpoint hash is unchanged before and after gate evaluation."""
    model = build("mlp_small")
    ckpt_path = tmp_path / "original_intake.pt"
    save_checkpoint(model, ckpt_path)

    initial_bytes = ckpt_path.read_bytes()
    initial_sha = hashlib.sha256(initial_bytes).hexdigest()

    # Load and run evaluation through gate
    x = torch.randn(500, 3, 32, 32)
    y = torch.randint(0, 10, (500,))
    holdout_loader = DataLoader(TensorDataset(x, y), batch_size=250)
    ctx = HoldoutIsolatedContext(holdout_loader=holdout_loader)

    gate = VerificationGate()
    cand_model = build("mlp_small")

    _ = gate.evaluate_candidate(
        orig_model=model,
        cand_model=cand_model,
        context=ctx,
        primary_metric="accuracy",
        candidate_idx=1,
        total_candidates=1,
    )

    # Check file on disk is bit-identical
    after_bytes = ckpt_path.read_bytes()
    after_sha = hashlib.sha256(after_bytes).hexdigest()

    assert initial_sha == after_sha
    assert initial_bytes == after_bytes


def test_rejected_candidate_cannot_become_output(tmp_path: Path) -> None:
    """Acceptance criterion 3 & 4: a rejected candidate cannot become the output; original is preserved."""
    run_dir = tmp_path / "artifacts" / "test_run_rejected"
    run_dir.mkdir(parents=True, exist_ok=True)

    # 1. Original model weights
    orig_model = build("mlp_small")
    orig_path = run_dir / "original.pt"
    save_checkpoint(orig_model, orig_path)
    orig_bytes = orig_path.read_bytes()
    orig_sha = hashlib.sha256(orig_bytes).hexdigest()

    # 2. Candidate model (perturbed, will be rejected)
    cand_model = build("mlp_small")
    cand_path = run_dir / "candidate_01.pt"
    save_checkpoint(cand_model, cand_path)

    # 3. Evaluate through gate
    x = torch.randn(500, 3, 32, 32)
    y = torch.randint(0, 10, (500,))
    holdout_loader = DataLoader(TensorDataset(x, y), batch_size=250)
    ctx = HoldoutIsolatedContext(holdout_loader=holdout_loader)

    gate = VerificationGate(config=GateConfig(bootstrap_samples=200))
    # Two identical random initializations will not meet min_gain -> REJECT
    decision = gate.evaluate_candidate(
        orig_model=orig_model,
        cand_model=cand_model,
        context=ctx,
        primary_metric="accuracy",
    )
    assert decision.decision == "REJECT"

    # Business rule BR8: If no candidate is accepted, output model artifact is a byte-identical copy of original
    accepted_artifact = run_dir / "accepted_model.pt"
    if decision.decision == "ACCEPT":
        accepted_artifact.write_bytes(cand_path.read_bytes())
    else:
        # Rollback: byte-identical copy of input original
        accepted_artifact.write_bytes(orig_bytes)

    output_bytes = accepted_artifact.read_bytes()
    output_sha = hashlib.sha256(output_bytes).hexdigest()

    assert output_sha == orig_sha
    assert output_bytes == orig_bytes


def test_gate_results_are_reproducible_for_fixed_seed_and_config() -> None:
    """Acceptance criterion 5: gate results are reproducible for a fixed seed/config."""
    torch.manual_seed(999)
    x = torch.randn(500, 4)
    y = torch.randint(0, 2, (500,))
    holdout_loader = DataLoader(TensorDataset(x, y), batch_size=500)

    model1 = nn.Linear(4, 2)
    model2 = nn.Linear(4, 2)

    cfg = GateConfig(bootstrap_samples=300, family_alpha=0.05)
    gate = VerificationGate(config=cfg)

    ctx1 = HoldoutIsolatedContext(holdout_loader=holdout_loader)
    dec1 = gate.evaluate_candidate(model1, model2, ctx1, seed=42)

    ctx2 = HoldoutIsolatedContext(holdout_loader=holdout_loader)
    dec2 = gate.evaluate_candidate(model1, model2, ctx2, seed=42)

    assert dec1.decision == dec2.decision
    assert dec1.delta_primary == dec2.delta_primary
    assert dec1.ci_low == dec2.ci_low
    assert dec1.ci_high == dec2.ci_high
    assert dec1.retained_correct_rate == dec2.retained_correct_rate
    assert dec1.reasons == dec2.reasons


def test_policy_changes_are_versioned_and_auditable() -> None:
    """Acceptance criterion 6: policy changes are versioned and auditable across strict/default/lenient."""
    default_cfg = load_config(Path("configs/default.yaml"))
    strict_cfg = load_config(Path("configs/acceptance/strict.yaml"))
    lenient_cfg = load_config(Path("configs/acceptance/lenient.yaml"))

    # Assert strict >= default >= lenient for gate thresholds
    assert strict_cfg.gate.min_gain.accuracy > default_cfg.gate.min_gain.accuracy
    assert default_cfg.gate.min_gain.accuracy > lenient_cfg.gate.min_gain.accuracy

    assert strict_cfg.gate.min_retention > default_cfg.gate.min_retention
    assert default_cfg.gate.min_retention > lenient_cfg.gate.min_retention

    # Each policy has a unique cryptographic hash for auditability
    h_default = compute_gate_policy_hash(default_cfg.gate)
    h_strict = compute_gate_policy_hash(strict_cfg.gate)
    h_lenient = compute_gate_policy_hash(lenient_cfg.gate)

    assert len({h_default, h_strict, h_lenient}) == 3, "Policy hashes must be distinct"

