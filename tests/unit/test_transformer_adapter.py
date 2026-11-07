"""Unit tests for AMRS Hugging Face PEFT/LoRA transformer extension (ML-10, ML-10.1)."""

import copy
from pathlib import Path

import pytest
import torch

from amrs.config import load_config
from amrs.evaluation.gate import VerificationGate
from amrs.pipeline.orchestrator import HoldoutIsolatedContext
from amrs.recovery.base import RecoveryContext
from amrs.transformer.adapter import PEFT_AVAILABLE, TransformerModelAdapter
from amrs.transformer.allowlist import (
    ArchitectureNotSupportedError,
    TargetModuleNotAllowedError,
    UntrustedSourceError,
    is_architecture_supported,
    normalize_architecture_name,
    validate_loading_security,
    validate_target_modules,
)
from amrs.transformer.config import TransformerLoRAConfig
from amrs.transformer.lora import TransformerLoRAStrategy
from amrs.transformer.metadata import compute_state_dict_sha256
from amrs.transformer.scenario import (
    TRANSFORMERS_AVAILABLE,
    build_tiny_transformer_classifier,
    create_transformer_scenario,
)

TRANSFORMERS_AND_PEFT_AVAILABLE = PEFT_AVAILABLE and TRANSFORMERS_AVAILABLE

# ---------------------------------------------------------------------------
# 1. Architecture Allowlist & Security Boundaries
# ---------------------------------------------------------------------------


def test_transformer_allowlist_recognition():
    """Vetted architectures are correctly recognized and normalized."""
    assert normalize_architecture_name("distilbert") == "distilbert"
    assert normalize_architecture_name("bert") == "bert"
    assert normalize_architecture_name("roberta") == "roberta"
    assert normalize_architecture_name("albert") == "albert"
    assert is_architecture_supported("bert-base-uncased") is True
    assert is_architecture_supported("distilbert-base-cased") is True


def test_transformer_unsupported_architecture_rejected():
    """Unvetted or unsupported architectures must raise ArchitectureNotSupportedError."""
    assert is_architecture_supported("resnet18") is False
    assert is_architecture_supported("arbitrary_unknown_model") is False
    with pytest.raises(ArchitectureNotSupportedError):
        normalize_architecture_name("unknown_transformer_v99")


def test_transformer_target_module_validation():
    """Target modules are validated against architecture allowlist."""
    # Valid target modules for bert
    validate_target_modules("bert", ["query", "value"])

    # Invalid target module for bert
    with pytest.raises(TargetModuleNotAllowedError):
        validate_target_modules("bert", ["conv1", "non_existent_module"])


def test_transformer_remote_code_security_enforcement():
    """Prohibit arbitrary remote code execution."""
    with pytest.raises(UntrustedSourceError):
        validate_loading_security(trust_remote_code=True)

    with pytest.raises(ValueError):
        TransformerLoRAConfig(trust_remote_code=True)


# ---------------------------------------------------------------------------
# 2. TransformerModelAdapter Contract & PEFT Parameter Freezing
# ---------------------------------------------------------------------------


@pytest.mark.skipif(not TRANSFORMERS_AND_PEFT_AVAILABLE, reason="transformers and peft required")
def test_transformer_adapter_contract_and_metadata():
    """TransformerModelAdapter captures metadata and audits parameter freezing."""
    model = build_tiny_transformer_classifier(seed=42)
    adapter = TransformerModelAdapter(model, base_model_name_or_path="tiny_bert")

    assert adapter.architecture == "bert"
    assert adapter.is_peft is False
    assert adapter.num_params() > 0
    assert adapter.trainable_params() == adapter.num_params()
    assert adapter.metadata.base_model_sha256 == compute_state_dict_sha256(model)
    assert len(adapter.metadata.config_hash) == 64
    assert "torch" in adapter.metadata.package_versions
    assert "peft" in adapter.metadata.package_versions


@pytest.mark.skipif(not TRANSFORMERS_AND_PEFT_AVAILABLE, reason="transformers and peft required")
def test_transformer_adapter_lora_wrapping_freezes_base_model():
    """Wrapping with LoRA must freeze all base parameters and unfreeze only adapter weights."""
    model = build_tiny_transformer_classifier(seed=42)
    adapter = TransformerModelAdapter(model, base_model_name_or_path="tiny_bert")

    config = TransformerLoRAConfig(r=4, lora_alpha=8, epochs=1)
    adapted = adapter.wrap_with_lora(config)

    assert adapted.is_peft is True

    # Base parameters must all have requires_grad == False
    base_params = adapted.base_parameters()
    assert len(base_params) > 0
    for name, p in base_params:
        assert not p.requires_grad, f"Base parameter {name} was not frozen!"

    # Adapter parameters must all have requires_grad == True
    adapter_params = adapted.adapter_parameters()
    assert len(adapter_params) > 0
    for name, p in adapter_params:
        assert p.requires_grad, f"Adapter parameter {name} was not trainable!"

    # Trainable parameter fraction should be small (< 15% on tiny model, < 2% on full)
    trainable_frac = adapted.trainable_params() / adapted.num_params()
    assert trainable_frac < 0.20


@pytest.mark.skipif(not TRANSFORMERS_AND_PEFT_AVAILABLE, reason="transformers and peft required")
def test_transformer_adapter_save_and_provenance(tmp_path: Path):
    """Saving adapted model persists PEFT weights and AMRS metadata JSON."""
    model = build_tiny_transformer_classifier(seed=42)
    adapter = TransformerModelAdapter(model, base_model_name_or_path="tiny_bert")
    adapted = adapter.wrap_with_lora(TransformerLoRAConfig(r=4, lora_alpha=8))

    save_dir = tmp_path / "lora_adapter"
    out_path = adapted.save_adapter(save_dir)

    assert out_path.exists()
    assert (save_dir / "amrs_transformer_meta.json").exists()
    assert (save_dir / "adapter_config.json").exists()


# ---------------------------------------------------------------------------
# 3. TransformerLoRAStrategy Execution & Base Immutability Audit
# ---------------------------------------------------------------------------


@pytest.mark.skipif(not TRANSFORMERS_AND_PEFT_AVAILABLE, reason="transformers and peft required")
def test_transformer_lora_strategy_trains_adapter_only():
    """TransformerLoRAStrategy updates adapter parameters while preserving base weights."""
    model, train_loader, val_loader, holdout_loader = create_transformer_scenario(
        seed=42, degrade_base=True
    )

    strategy = TransformerLoRAStrategy(
        TransformerLoRAConfig(r=4, lora_alpha=8, epochs=2, learning_rate=5e-3)
    )

    iso_ctx = HoldoutIsolatedContext(
        train_loader=train_loader,
        val_loader=val_loader,
        holdout_loader=holdout_loader,
    )
    recovery_ctx = RecoveryContext.from_isolated_context(iso_ctx, model=model)

    # Check applicability
    app = strategy.is_applicable(model, recovery_ctx)
    assert app.can_apply is True

    # Cost estimate
    cost = strategy.estimate_cost(recovery_ctx, model)
    assert cost.estimated_units > 0.0

    # Capture base model state before strategy execution
    model_copy = copy.deepcopy(model)
    base_state_before = {
        name: p.detach().clone()
        for name, p in model_copy.named_parameters()
        if "classifier" not in name
    }

    # Apply recovery strategy
    cand_model, result = strategy.apply(model_copy, recovery_ctx)

    assert result.success is True
    assert result.compute_units > 0.0
    assert result.elapsed_wall_s > 0.0

    # Immutability assertion: base transformer encoder weights must not change by even 1 bit
    for name, p in cand_model.named_parameters():
        clean_name = name.replace("base_model.model.", "")
        if clean_name in base_state_before:
            assert torch.equal(p, base_state_before[clean_name]), (
                f"Base parameter {name} was unexpectedly modified during LoRA adaptation!"
            )


# ---------------------------------------------------------------------------
# 4. Verification Gate & Rollback Compatibility
# ---------------------------------------------------------------------------


@pytest.mark.skipif(not TRANSFORMERS_AND_PEFT_AVAILABLE, reason="transformers and peft required")
def test_transformer_verification_gate_end_to_end():
    """Adapted transformer candidate can be evaluated and verified by VerificationGate."""
    model, train_loader, val_loader, holdout_loader = create_transformer_scenario(
        seed=42, degrade_base=True
    )

    strategy = TransformerLoRAStrategy(
        TransformerLoRAConfig(r=4, lora_alpha=8, epochs=2, learning_rate=1e-2)
    )

    iso_ctx = HoldoutIsolatedContext(
        train_loader=train_loader,
        val_loader=val_loader,
        holdout_loader=holdout_loader,
    )
    recovery_ctx = RecoveryContext.from_isolated_context(iso_ctx, model=model)

    cand_model, result = strategy.apply(copy.deepcopy(model), recovery_ctx)
    assert result.success is True

    # Allow small holdout in GateConfig for the tiny test scenario
    gate_cfg = load_config().gate
    gate_cfg.allow_small_holdout = True

    gate = VerificationGate(config=gate_cfg)
    decision = gate.evaluate(
        orig_model=model,
        cand_model=cand_model,
        context=iso_ctx,
        primary_metric="accuracy",
        candidate_idx=1,
        total_candidates=1,
        compute_units=result.compute_units,
        seed=42,
    )

    # Gate decision is valid and populated with statistical metrics
    assert decision.decision in ("ACCEPT", "REJECT")
    assert decision.primary_metric == "accuracy"
    assert isinstance(decision.delta_primary, float)
    assert isinstance(decision.passed_all, bool)
    assert isinstance(decision.reasons, list)
    assert isinstance(decision.retained_correct_rate, float)
