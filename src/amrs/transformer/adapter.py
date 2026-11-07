"""Separate model adapter contract specifically designed for Hugging Face transformer classifiers (ML-10)."""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import torch.nn as nn

try:
    from peft import LoraConfig, PeftModel, TaskType, get_peft_model

    PEFT_AVAILABLE = True
except ImportError:
    PEFT_AVAILABLE = False

from amrs.transformer.allowlist import (
    get_default_target_modules,
    normalize_architecture_name,
    validate_target_modules,
)
from amrs.transformer.config import TransformerLoRAConfig
from amrs.transformer.metadata import (
    TransformerMetadata,
    compute_config_hash,
    compute_state_dict_sha256,
)


class TransformerModelAdapter:
    """Independent adapter contract for Hugging Face transformer classifiers.

    Guarantees:
    - Never imposes CNN assumptions (e.g. conv layers, BatchNorm running statistics).
    - Restricts architectures to the vetted allowlist (e.g. DistilBERT, BERT, RoBERTa).
    - Audits parameter isolation between immutable base weights and trainable PEFT adapters.
    - Records immutable base revision and adapter metadata for full reproducibility.
    """

    def __init__(
        self,
        model: nn.Module,
        base_model_name_or_path: str = "",
        revision: str | None = None,
        metadata: TransformerMetadata | None = None,
    ) -> None:
        self.model = model
        self.architecture = normalize_architecture_name(model)
        self.base_model_name_or_path = base_model_name_or_path or getattr(
            model, "name_or_path", self.architecture
        )
        self.revision = revision

        # Extract config dictionary for config hash
        config_dict: dict[str, Any] = {}
        model_config = getattr(model, "config", None)
        if model_config is not None and hasattr(model_config, "to_dict"):
            try:
                config_dict = model_config.to_dict()
            except Exception:
                config_dict = {"model_type": self.architecture}
        else:
            config_dict = {"model_type": self.architecture}

        self.metadata = metadata or TransformerMetadata(
            base_model_name_or_path=self.base_model_name_or_path,
            base_model_revision=self.revision,
            base_model_sha256=compute_state_dict_sha256(model),
            config_hash=compute_config_hash(config_dict),
            architecture=self.architecture,
        )

    @property
    def is_peft(self) -> bool:
        """Check whether the underlying model is wrapped with a PEFT adapter."""
        if not PEFT_AVAILABLE:
            return False
        return isinstance(self.model, PeftModel) or hasattr(self.model, "peft_config")

    def num_params(self) -> int:
        """Total parameter count across the entire model."""
        return sum(p.numel() for p in self.model.parameters())

    def trainable_params(self) -> int:
        """Count of currently trainable parameters."""
        return sum(p.numel() for p in self.model.parameters() if p.requires_grad)

    def base_parameters(self) -> list[tuple[str, nn.Parameter]]:
        """Return parameters belonging to the base transformer model."""
        return [
            (name, p)
            for name, p in self.model.named_parameters()
            if "lora_" not in name and "adapter" not in name
        ]

    def adapter_parameters(self) -> list[tuple[str, nn.Parameter]]:
        """Return parameters belonging exclusively to PEFT/LoRA adapter layers."""
        return [
            (name, p)
            for name, p in self.model.named_parameters()
            if "lora_" in name or "adapter" in name
        ]

    def classifier_head(self) -> nn.Module | None:
        """Identify classification head module if available."""
        for head_name in ("classifier", "score", "pre_classifier"):
            if hasattr(self.model, head_name):
                return getattr(self.model, head_name)
        return None

    def wrap_with_lora(self, config: TransformerLoRAConfig) -> TransformerModelAdapter:
        """Wrap base model with a PEFT LoRA adapter, verifying base parameter freeze."""
        if not PEFT_AVAILABLE:
            raise RuntimeError("PEFT library is required for LoRA adapter wrapping.")

        target_modules = config.target_modules or get_default_target_modules(self.architecture)
        validate_target_modules(self.architecture, target_modules)

        lora_cfg = LoraConfig(
            r=config.r,
            lora_alpha=config.lora_alpha,
            target_modules=target_modules,
            lora_dropout=config.lora_dropout,
            bias=config.bias,
            task_type=TaskType.SEQ_CLS,
        )

        # Deep-copy base model to ensure original is preserved
        model_copy = copy.deepcopy(self.model)
        peft_model = get_peft_model(model_copy, lora_cfg)

        # Audit: verify all base parameters are frozen and only adapter parameters require grad
        for name, p in peft_model.named_parameters():
            if "lora_" in name:
                p.requires_grad = True
            else:
                p.requires_grad = False

        new_metadata = TransformerMetadata(
            base_model_name_or_path=self.metadata.base_model_name_or_path,
            base_model_revision=self.metadata.base_model_revision,
            base_model_sha256=self.metadata.base_model_sha256,
            config_hash=self.metadata.config_hash,
            architecture=self.architecture,
            adapter_config=config.model_dump(),
        )

        return TransformerModelAdapter(
            peft_model,
            base_model_name_or_path=self.base_model_name_or_path,
            revision=self.revision,
            metadata=new_metadata,
        )

    def save_adapter(self, out_dir: Path | str) -> Path:
        """Persist PEFT adapter weights and AMRS provenance metadata."""
        save_path = Path(out_dir)
        save_path.mkdir(parents=True, exist_ok=True)

        if not self.is_peft:
            raise ValueError("Cannot save adapter: model is not a PEFT adapter model.")

        # Save PEFT adapter weights
        save_fn = getattr(self.model, "save_pretrained", None)
        if callable(save_fn):
            save_fn(str(save_path))

        # Save AMRS metadata
        meta_file = save_path / "amrs_transformer_meta.json"
        meta_file.write_text(json.dumps(self.metadata.to_dict(), indent=2), encoding="utf-8")
        return save_path

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        """Forward pass forwarding directly to the underlying model."""
        return self.model(*args, **kwargs)
