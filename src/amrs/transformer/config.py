"""Configuration schemas for Transformer PEFT/LoRA recovery strategies (ML-10)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

from amrs.transformer.allowlist import validate_loading_security


class TransformerLoRAConfig(BaseModel):
    """Configuration for PEFT LoRA adapter recovery on transformer classifiers."""

    r: int = Field(default=8, ge=1, le=128, description="LoRA attention dimension / rank.")
    lora_alpha: int = Field(default=16, ge=1, le=256, description="LoRA scaling parameter.")
    lora_dropout: float = Field(default=0.05, ge=0.0, lt=1.0, description="LoRA dropout rate.")
    target_modules: list[str] | None = Field(
        default=None,
        description="Target module names to apply LoRA. If None, architecture default is used.",
    )
    bias: Literal["none", "all", "lora_only"] = Field(
        default="none", description="Bias type for LoRA ('none', 'all', 'lora_only')."
    )
    task_type: str = Field(default="SEQ_CLS", description="PEFT task type.")

    # Optimization
    learning_rate: float = Field(default=1e-3, gt=0.0, description="Optimizer learning rate.")
    weight_decay: float = Field(default=0.01, ge=0.0, description="Optimizer weight decay.")
    epochs: int = Field(default=3, ge=1, description="Training epochs for adapter fine-tuning.")
    batch_size: int = Field(default=16, ge=1, description="Batch size for adapter fine-tuning.")
    early_stopping: bool = Field(default=True, description="Enable validation early stopping.")
    patience: int = Field(default=2, ge=1, description="Early stopping patience.")
    max_grad_norm: float = Field(default=1.0, ge=0.0, description="Gradient clipping norm.")

    # Provenance and Security
    base_model_name_or_path: str = Field(
        default="", description="Identifier or path of base transformer model."
    )
    base_model_revision: str | None = Field(
        default=None, description="Specific git commit or revision tag of base model."
    )
    trust_remote_code: bool = Field(
        default=False, description="Strictly False: remote code execution is prohibited."
    )

    @model_validator(mode="after")
    def verify_security_constraints(self) -> TransformerLoRAConfig:
        validate_loading_security(
            trust_remote_code=self.trust_remote_code,
            allow_custom_code=False,
        )
        return self
