"""AMRS Hugging Face PEFT/LoRA transformer classifier recovery extension (ML-10)."""

from amrs.transformer.adapter import TransformerModelAdapter
from amrs.transformer.allowlist import (
    ArchitectureNotSupportedError,
    SUPPORTED_ARCHITECTURES,
    TargetModuleNotAllowedError,
    UntrustedSourceError,
    is_architecture_supported,
    normalize_architecture_name,
    validate_loading_security,
    validate_target_modules,
)
from amrs.transformer.config import TransformerLoRAConfig
from amrs.transformer.lora import TransformerLoRAStrategy
from amrs.transformer.metadata import TransformerMetadata, compute_config_hash, compute_state_dict_sha256
from amrs.transformer.scenario import (
    build_tiny_transformer_classifier,
    create_tiny_transformer_data,
    create_transformer_scenario,
)

__all__ = [
    "ArchitectureNotSupportedError",
    "SUPPORTED_ARCHITECTURES",
    "TargetModuleNotAllowedError",
    "TransformerLoRAConfig",
    "TransformerLoRAStrategy",
    "TransformerMetadata",
    "TransformerModelAdapter",
    "UntrustedSourceError",
    "build_tiny_transformer_classifier",
    "compute_config_hash",
    "compute_state_dict_sha256",
    "create_tiny_transformer_data",
    "create_transformer_scenario",
    "is_architecture_supported",
    "normalize_architecture_name",
    "validate_loading_security",
    "validate_target_modules",
]

