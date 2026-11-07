"""Shared recovery strategy interface, context, and result structures (ML shared contract)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import torch.nn as nn

from amrs.models.adapter import ModelAdapter
from amrs.schemas import Applicability, CostEstimate, StrategyResult

__all__ = [
    "Applicability",
    "CostEstimate",
    "StrategyResult",
    "RecoveryContext",
    "RecoveryStrategy",
]


class RecoveryContext:
    """Execution and prerequisite context for recovery strategies.

    Split isolation invariant: Under no circumstances may holdout data be stored or
    accessed here. Holdout is reserved exclusively for the verification gate.
    """

    def __init__(
        self,
        model: ModelAdapter | nn.Module | None = None,
        train_loader: Any = None,
        val_loader: Any = None,
        target_loader: Any = None,
        checkpoints: Sequence[Path | str] | None = None,
        history: list[dict[str, Any]] | None = None,
        config: Any = None,
        seed: int = 1234,
        device: str = "cpu",
        **kwargs: Any,
    ) -> None:
        # Check holdout isolation invariant
        if "holdout" in kwargs or "holdout_loader" in kwargs or "_holdout_loader" in kwargs:
            raise ValueError(
                "Holdout data must never enter RecoveryContext. Split isolation invariant violated."
            )

        if isinstance(model, ModelAdapter):
            self.adapter: ModelAdapter | None = model
            self.model: nn.Module | None = model.model
        elif isinstance(model, nn.Module):
            self.adapter = ModelAdapter(model)
            self.model = model
        else:
            self.adapter = None
            self.model = None

        self.train_loader = train_loader
        self.val_loader = val_loader
        self.target_loader = target_loader

        parsed_checkpoints: list[Path] = []
        if checkpoints:
            for ckpt in checkpoints:
                parsed_checkpoints.append(Path(ckpt) if isinstance(ckpt, str) else ckpt)
        self.checkpoints: list[Path] = parsed_checkpoints

        self.history: list[dict[str, Any]] = history or []
        self.config = config
        self.seed = seed
        self.device = device
        self.extra: dict[str, Any] = kwargs

    @property
    def holdout_loader(self) -> Any:
        """Holdout loader is strictly prohibited in recovery context."""
        raise ValueError(
            "Direct access to holdout split is prohibited in RecoveryContext (BR2 split discipline)."
        )

    @classmethod
    def from_isolated_context(
        cls,
        isolated_ctx: Any,
        model: ModelAdapter | nn.Module | None = None,
        checkpoints: Sequence[Path | str] | None = None,
        history: list[dict[str, Any]] | None = None,
        config: Any = None,
        seed: int = 1234,
        device: str = "cpu",
    ) -> RecoveryContext:
        """Safely create a RecoveryContext extracting only permitted loaders."""
        if hasattr(isolated_ctx, "get_candidate_selection_loaders"):
            loaders = isolated_ctx.get_candidate_selection_loaders()
            return cls(
                model=model,
                train_loader=loaders.get("train"),
                val_loader=loaders.get("val"),
                target_loader=loaders.get("target"),
                checkpoints=checkpoints,
                history=history,
                config=config,
                seed=seed,
                device=device,
            )
        return cls(
            model=model,
            train_loader=getattr(isolated_ctx, "train_loader", None),
            val_loader=getattr(isolated_ctx, "val_loader", None),
            target_loader=getattr(isolated_ctx, "target_loader", None),
            checkpoints=checkpoints,
            history=history,
            config=config,
            seed=seed,
            device=device,
        )


class RecoveryStrategy(ABC):
    """Common interface for all AMRS recovery strategies."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Canonical name identifying this recovery strategy."""
        ...

    @abstractmethod
    def is_applicable(self, model: ModelAdapter, context: RecoveryContext) -> Applicability:
        """Check prerequisites to determine if strategy can run."""
        ...

    @abstractmethod
    def estimate_cost(
        self, context: RecoveryContext, model: ModelAdapter | None = None
    ) -> CostEstimate:
        """Estimate compute units required to apply this recovery strategy."""
        ...

    @abstractmethod
    def apply(
        self, model_copy: nn.Module, context: RecoveryContext
    ) -> tuple[nn.Module, StrategyResult]:
        """Apply recovery method to model copy and return adapted model and execution result."""
        ...
