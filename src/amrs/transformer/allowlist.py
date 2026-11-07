"""Allowlist and security boundaries for Hugging Face transformer architectures and PEFT target modules (ML-10)."""

from __future__ import annotations

from typing import Any

# Allowed model families and their corresponding target modules
SUPPORTED_ARCHITECTURES: dict[str, dict[str, Any]] = {
    "distilbert": {
        "model_types": ["distilbert", "DistilBertForSequenceClassification"],
        "default_target_modules": ["q_lin", "v_lin"],
        "allowed_target_modules": ["q_lin", "k_lin", "v_lin", "out_lin"],
        "description": "DistilBERT sequence classification (Sanity/CPU friendly)",
    },
    "bert": {
        "model_types": ["bert", "BertForSequenceClassification"],
        "default_target_modules": ["query", "value"],
        "allowed_target_modules": ["query", "key", "value", "dense"],
        "description": "BERT sequence classification",
    },
    "roberta": {
        "model_types": ["roberta", "RobertaForSequenceClassification"],
        "default_target_modules": ["query", "value"],
        "allowed_target_modules": ["query", "key", "value", "dense"],
        "description": "RoBERTa sequence classification",
    },
    "albert": {
        "model_types": ["albert", "AlbertForSequenceClassification"],
        "default_target_modules": ["query", "value"],
        "allowed_target_modules": ["query", "key", "value", "dense"],
        "description": "ALBERT sequence classification",
    },
}


class ArchitectureNotSupportedError(ValueError):
    """Raised when an unvetted or untrusted transformer architecture is requested."""
    pass


class TargetModuleNotAllowedError(ValueError):
    """Raised when PEFT target modules violate the vetted architecture allowlist."""
    pass


class UntrustedSourceError(ValueError):
    """Raised when base model source or loading config violates security constraints."""
    pass


def normalize_architecture_name(arch_or_model: Any) -> str:
    """Normalize model class name or config model_type to canonical family key."""
    if hasattr(arch_or_model, "config") and hasattr(arch_or_model.config, "model_type"):
        raw_type = str(arch_or_model.config.model_type).lower()
    elif isinstance(arch_or_model, str):
        raw_type = arch_or_model.lower()
    else:
        raw_type = arch_or_model.__class__.__name__.lower()

    # Match longer canonical names first to prevent 'bert' matching inside 'roberta' or 'distilbert'
    sorted_canons = sorted(SUPPORTED_ARCHITECTURES.keys(), key=len, reverse=True)
    for canon in sorted_canons:
        info = SUPPORTED_ARCHITECTURES[canon]
        for mt in info["model_types"]:
            if mt.lower() in raw_type:
                return canon
        if canon in raw_type:
            return canon

    raise ArchitectureNotSupportedError(
        f"Transformer architecture '{raw_type}' is not in the vetted allowlist. "
        f"Supported architectures: {list(SUPPORTED_ARCHITECTURES.keys())}"
    )


def is_architecture_supported(arch_or_model: Any) -> bool:
    """Check if architecture or model instance is in the vetted allowlist."""
    try:
        normalize_architecture_name(arch_or_model)
        return True
    except ArchitectureNotSupportedError:
        return False


def get_default_target_modules(arch_or_model: Any) -> list[str]:
    """Return default PEFT LoRA target modules for the architecture."""
    canon = normalize_architecture_name(arch_or_model)
    return list(SUPPORTED_ARCHITECTURES[canon]["default_target_modules"])


def validate_target_modules(arch_or_model: Any, target_modules: list[str]) -> None:
    """Validate that requested PEFT target modules are permitted for this architecture."""
    canon = normalize_architecture_name(arch_or_model)
    allowed = set(SUPPORTED_ARCHITECTURES[canon]["allowed_target_modules"])
    for mod in target_modules:
        if mod not in allowed:
            raise TargetModuleNotAllowedError(
                f"Target module '{mod}' is not allowed for '{canon}'. "
                f"Allowed modules: {sorted(allowed)}"
            )


def validate_loading_security(
    trust_remote_code: bool = False,
    allow_custom_code: bool = False,
) -> None:
    """Ensure that arbitrary remote code execution is strictly prohibited."""
    if trust_remote_code or allow_custom_code:
        raise UntrustedSourceError(
            "Arbitrary remote code loading (`trust_remote_code=True`) is strictly prohibited in AMRS "
            "to prevent remote code execution vulnerabilities."
        )

