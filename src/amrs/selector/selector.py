"""Strategy registry, prerequisite checking, cost estimation, and budget-enforcing selector (Section 2.9, ML-2)."""

from __future__ import annotations

from typing import Any
import torch.nn as nn

from amrs.config import load_config
from amrs.models.adapter import ModelAdapter
from amrs.recovery.base import (
    Applicability,
    CostEstimate,
    RecoveryContext,
    RecoveryStrategy,
    StrategyResult,
)
from amrs.recovery.bn_recal import BnRecalibrationStrategy
from amrs.recovery.checkpoints import (
    CheckpointAveragingStrategy,
    CheckpointReversionStrategy,
)
from amrs.recovery.last_layer import LastLayerFinetuneStrategy
from amrs.recovery.temperature import TemperatureScalingStrategy
from amrs.schemas import (
    ConfigDefaultsResponse,
    DiagnosisReport,
    SelectionReport,
    SelectorConfig,
    SkippedCandidate,
    StrategyCandidate,
)

# Authoritative Section 2.9 Mapping
DIAGNOSIS_TO_STRATEGIES: dict[str, list[str]] = {
    "miscalibration": ["temperature_scaling"],
    "bn_drift": ["bn_recalibration", "last_layer_finetune"],
    "instability": ["checkpoint_reversion", "checkpoint_averaging", "selective_finetune_l2sp"],
    "overfitting": [
        "checkpoint_reversion",
        "checkpoint_averaging",
        "selective_finetune_l2sp",
        "weight_interpolation",
    ],
    "head_degradation": ["last_layer_finetune", "selective_finetune_l2sp"],
}


def _has_identifiable_head(adapter: ModelAdapter | None) -> bool:
    """Check whether the model adapter can locate a valid classification head."""
    if adapter is None:
        return False
    try:
        adapter.head_module()
        return True
    except Exception:
        return False


def _get_sample_count(loader: Any, default: int) -> int:
    """Extract sample count from a DataLoader or return default."""
    if loader is None:
        return default
    if hasattr(loader, "dataset") and hasattr(loader.dataset, "__len__"):
        try:
            return len(loader.dataset)
        except Exception:
            pass
    if hasattr(loader, "__len__"):
        batch_size = getattr(loader, "batch_size", 32) or 32
        return len(loader) * batch_size
    return default


def _get_head_param_ratio(adapter: ModelAdapter | None) -> float:
    """Calculate the ratio of head parameters to total model parameters."""
    if adapter is None:
        return 0.05
    try:
        head_params = sum(p.numel() for p in adapter.head_params())
        total_params = max(1, adapter.num_params())
        return max(0.01, min(1.0, head_params / total_params))
    except Exception:
        return 0.05


def _get_unfrozen_param_ratio(adapter: ModelAdapter | None, unfreeze_top_n: int = 2) -> float:
    """Calculate the ratio of top unfrozen parameters to total model parameters."""
    if adapter is None:
        return 0.35
    try:
        groups = adapter.layer_groups()
        if not groups:
            return 0.35
        top_groups = groups[-unfreeze_top_n:]
        unfrozen_params = sum(p.numel() for grp in top_groups for p in grp)
        total_params = max(1, adapter.num_params())
        return max(0.05, min(1.0, unfrozen_params / total_params))
    except Exception:
        return 0.35


def estimate_retrain_cost(
    model: ModelAdapter | None,
    context: RecoveryContext,
    retrain_epochs: int = 25,
) -> float:
    """Estimate compute units for full model retraining (BR12).
    
    Formula: 4 * retrain_epochs * N_train (1 fwd + 3 bwd per sample).
    """
    n_train = _get_sample_count(context.train_loader, default=1000)
    return float(4.0 * retrain_epochs * n_train)


def resolve_primary_metric_for_candidate(
    eligible_for: list[str],
    primary_label: str | None = None,
) -> str:
    """Determine primary optimization metric according to BR4."""
    if primary_label == "miscalibration" or (
        len(eligible_for) == 1 and eligible_for[0] == "miscalibration"
    ):
        return "ece"
    return "accuracy"


# ---------------------------------------------------------------------------
# Built-in Strategy Implementations (ML-2 Specification)
# ---------------------------------------------------------------------------

class SelectiveFinetuneL2spStrategy(RecoveryStrategy):
    @property
    def name(self) -> str:
        return "selective_finetune_l2sp"

    def is_applicable(self, model: ModelAdapter, context: RecoveryContext) -> Applicability:
        if not _has_identifiable_head(model):
            return Applicability(
                can_apply=False,
                reason="NO_IDENTIFIABLE_HEAD",
                message="Model has no identifiable classification head for selective fine-tuning.",
            )
        if context.train_loader is None and context.val_loader is None:
            return Applicability(
                can_apply=False,
                reason="MISSING_TRAINING_DATA",
                message="Training data required for selective fine-tuning.",
            )
        return Applicability(can_apply=True)

    def estimate_cost(self, context: RecoveryContext, model: ModelAdapter | None = None) -> CostEstimate:
        adapter = model or context.adapter
        epochs = 8
        unfreeze_top_n = 2
        if context.config and hasattr(context.config, "strategies"):
            cfg = getattr(context.config.strategies, "selective_finetune_l2sp", None)
            if cfg:
                epochs = getattr(cfg, "epochs", 8)
                unfreeze_top_n = getattr(cfg, "unfreeze_top_n", 2)

        n_train = _get_sample_count(context.train_loader, default=1000)
        r_unfrozen = _get_unfrozen_param_ratio(adapter, unfreeze_top_n=unfreeze_top_n)

        fwd_samples = epochs * n_train
        bwd_samples = epochs * n_train * r_unfrozen
        units = round(fwd_samples + 3.0 * bwd_samples, 2)

        return CostEstimate(
            estimated_units=float(units),
            details={
                "epochs": epochs,
                "fwd_samples": fwd_samples,
                "bwd_samples": bwd_samples,
                "unfrozen_param_ratio": r_unfrozen,
                "strategy": self.name,
            },
        )

    def apply(self, model_copy: nn.Module, context: RecoveryContext) -> tuple[nn.Module, StrategyResult]:
        raise NotImplementedError("apply() execution is implemented in recovery modules (ML-7).")


class WeightInterpolationStrategy(RecoveryStrategy):
    @property
    def name(self) -> str:
        return "weight_interpolation"

    def is_applicable(self, model: ModelAdapter, context: RecoveryContext) -> Applicability:
        if not _has_identifiable_head(model):
            return Applicability(
                can_apply=False,
                reason="NO_IDENTIFIABLE_HEAD",
                message="Identifiable head required for fine-tuned candidate interpolation.",
            )
        if context.train_loader is None and context.val_loader is None:
            return Applicability(
                can_apply=False,
                reason="MISSING_TRAINING_DATA",
                message="Training data required to generate fine-tuned candidate for interpolation.",
            )
        return Applicability(can_apply=True)

    def estimate_cost(self, context: RecoveryContext, model: ModelAdapter | None = None) -> CostEstimate:
        adapter = model or context.adapter
        alphas = [0.25, 0.5, 0.75]
        if context.config and hasattr(context.config, "strategies"):
            cfg = getattr(context.config.strategies, "weight_interpolation", None)
            if cfg:
                alphas = getattr(cfg, "alphas", [0.25, 0.5, 0.75])

        # Cost accounts for fine-tuning candidate + alpha evaluation sweeps on val
        ft_strategy = SelectiveFinetuneL2spStrategy()
        base_cost = ft_strategy.estimate_cost(context, model=adapter).estimated_units
        n_val = _get_sample_count(context.val_loader, default=500)
        eval_cost = len(alphas) * n_val
        units = round(base_cost + eval_cost, 2)

        return CostEstimate(
            estimated_units=float(units),
            details={
                "base_finetune_units": base_cost,
                "alpha_eval_units": eval_cost,
                "alphas": alphas,
                "strategy": self.name,
            },
        )

    def apply(self, model_copy: nn.Module, context: RecoveryContext) -> tuple[nn.Module, StrategyResult]:
        raise NotImplementedError("apply() execution is implemented in recovery modules (ML-8).")


# ---------------------------------------------------------------------------
# Strategy Registry
# ---------------------------------------------------------------------------

class StrategyRegistry:
    """Registry maintaining available recovery strategies and their diagnosis mappings."""

    def __init__(self) -> None:
        self._strategies: dict[str, RecoveryStrategy] = {}
        self._register_defaults()

    def _register_defaults(self) -> None:
        defaults: list[RecoveryStrategy] = [
            TemperatureScalingStrategy(),
            BnRecalibrationStrategy(),
            CheckpointReversionStrategy(),
            CheckpointAveragingStrategy(),
            LastLayerFinetuneStrategy(),
            SelectiveFinetuneL2spStrategy(),
            WeightInterpolationStrategy(),
        ]
        for strat in defaults:
            self.register(strat)

    def register(self, strategy: RecoveryStrategy) -> None:
        """Register a recovery strategy."""
        self._strategies[strategy.name] = strategy

    def get(self, name: str) -> RecoveryStrategy:
        """Retrieve strategy by canonical name."""
        if name not in self._strategies:
            raise KeyError(f"Unknown recovery strategy: '{name}'")
        return self._strategies[name]

    def has(self, name: str) -> bool:
        """Check whether strategy is registered."""
        return name in self._strategies

    def list_strategies(self) -> list[str]:
        """List all registered strategy names."""
        return list(self._strategies.keys())

    def get_eligible_strategies(self, diagnosis_label: str) -> list[str]:
        """Return eligible strategies for diagnosis label according to Section 2.9."""
        return DIAGNOSIS_TO_STRATEGIES.get(diagnosis_label, []).copy()


# Global default registry instance
default_registry = StrategyRegistry()


# ---------------------------------------------------------------------------
# Strategy Selector
# ---------------------------------------------------------------------------

class StrategySelector:
    """Deterministically selects and budgets recovery strategies from diagnosis reports."""

    def __init__(
        self,
        registry: StrategyRegistry | None = None,
        config: SelectorConfig | ConfigDefaultsResponse | None = None,
    ) -> None:
        self.registry = registry or default_registry
        self.config = config

    def _extract_strategy_params(
        self,
        strategy_name: str,
        config: ConfigDefaultsResponse | None,
    ) -> dict[str, Any]:
        """Extract strategy-specific parameters from resolved configuration."""
        if config is None or not hasattr(config, "strategies"):
            return {}
        strat_cfg = getattr(config.strategies, strategy_name, None)
        if strat_cfg is not None and hasattr(strat_cfg, "model_dump"):
            return strat_cfg.model_dump()
        return {}

    def _resolve_context(
        self,
        model: ModelAdapter | nn.Module,
        context: RecoveryContext | Any,
        config: ConfigDefaultsResponse | None,
    ) -> tuple[ModelAdapter, RecoveryContext]:
        """Resolve and validate model adapter and recovery context, strictly protecting holdout."""
        if isinstance(context, RecoveryContext):
            rec_ctx = context
        elif hasattr(context, "get_candidate_selection_loaders"):
            # HoldoutIsolatedContext conversion
            rec_ctx = RecoveryContext.from_isolated_context(context, model=model, config=config)
        elif isinstance(context, dict):
            if "holdout" in context or "holdout_loader" in context or "_holdout_loader" in context:
                raise ValueError("Holdout data must never be passed to StrategySelector.")
            rec_ctx = RecoveryContext(model=model, config=config, **context)
        else:
            rec_ctx = RecoveryContext(model=model, config=config)

        if isinstance(model, ModelAdapter):
            adapter = model
        else:
            adapter = ModelAdapter(model)

        rec_ctx.adapter = adapter
        rec_ctx.model = adapter.model
        if config is not None and rec_ctx.config is None:
            rec_ctx.config = config

        return adapter, rec_ctx

    def select(
        self,
        diagnosis_report: DiagnosisReport,
        model: ModelAdapter | nn.Module,
        context: RecoveryContext | Any,
        config: SelectorConfig | ConfigDefaultsResponse | None = None,
        force: bool = False,
    ) -> SelectionReport:
        """Select, prioritize, and budget recovery candidates from a DiagnosisReport.
        
        Follows Section 2.9, BR6 (cheapest-first) and BR7 (budget bounds).
        """
        # Resolve configuration
        resolved_full_config: ConfigDefaultsResponse | None = None
        selector_cfg: SelectorConfig

        if isinstance(config, ConfigDefaultsResponse):
            resolved_full_config = config
            selector_cfg = config.selector
        elif isinstance(config, SelectorConfig):
            selector_cfg = config
        elif self.config is not None:
            if isinstance(self.config, ConfigDefaultsResponse):
                resolved_full_config = self.config
                selector_cfg = self.config.selector
            else:
                selector_cfg = self.config
        else:
            resolved_full_config = load_config()
            selector_cfg = resolved_full_config.selector

        adapter, rec_ctx = self._resolve_context(model, context, resolved_full_config)

        # Handle healthy report (BR9)
        if diagnosis_report.is_healthy and not force:
            return SelectionReport(
                candidates=[],
                skipped=[],
                total_estimated_cost=0.0,
                compute_budget=0.0,
                retrain_reference_units=0.0,
                max_candidates=selector_cfg.max_candidates,
                primary_label=diagnosis_report.primary_label,
                is_healthy=True,
                details={"reason": "healthy_no_action"},
            )

        # 1. Map diagnosis labels to eligible strategies and merge reasons
        strategy_reasons: dict[str, list[str]] = {}
        active_labels = [d.label for d in diagnosis_report.diagnoses if d.label != "healthy"]

        if not active_labels and force:
            # If force mode on healthy model, consider all registered strategies
            active_labels = list(DIAGNOSIS_TO_STRATEGIES.keys())

        for label in active_labels:
            eligible_names = self.registry.get_eligible_strategies(label)
            for strat_name in eligible_names:
                if strat_name not in strategy_reasons:
                    strategy_reasons[strat_name] = []
                if label not in strategy_reasons[strat_name]:
                    strategy_reasons[strat_name].append(label)

        # 2. Check prerequisites and estimate cost for applicable strategies
        applicable_candidates: list[StrategyCandidate] = []
        skipped_candidates: list[SkippedCandidate] = []

        for strat_name, reasons in strategy_reasons.items():
            if not self.registry.has(strat_name):
                skipped_candidates.append(
                    SkippedCandidate(
                        strategy=strat_name,
                        reason="UNREGISTERED_STRATEGY",
                        eligible_for=reasons,
                        message=f"Strategy '{strat_name}' is not registered in StrategyRegistry.",
                    )
                )
                continue

            strat_instance = self.registry.get(strat_name)
            applicability = strat_instance.is_applicable(adapter, rec_ctx)

            if not applicability.can_apply:
                skipped_candidates.append(
                    SkippedCandidate(
                        strategy=strat_name,
                        reason=applicability.reason or "NOT_APPLICABLE",
                        eligible_for=reasons,
                        message=applicability.message,
                    )
                )
            else:
                cost_est = strat_instance.estimate_cost(rec_ctx, model=adapter)
                strat_params = self._extract_strategy_params(strat_name, resolved_full_config)
                primary_metric = resolve_primary_metric_for_candidate(
                    reasons, primary_label=diagnosis_report.primary_label
                )

                candidate = StrategyCandidate(
                    strategy=strat_name,
                    eligible_for=reasons,
                    estimated_cost=cost_est.estimated_units,
                    params=strat_params,
                    cost_details=cost_est.details,
                    primary_metric=primary_metric,
                    is_estimate=cost_est.is_estimate,
                )
                applicable_candidates.append(candidate)

        # 3. Sort by ascending estimated cost with stable deterministic tie-break (strategy name)
        applicable_candidates.sort(key=lambda c: (c.estimated_cost, c.strategy))

        # 4. Enforce candidate budget and compute budget (BR7)
        retrain_units: float
        if isinstance(selector_cfg.retrain_reference_units, (int, float)):
            retrain_units = float(selector_cfg.retrain_reference_units)
        elif str(selector_cfg.retrain_reference_units).replace(".", "", 1).isdigit():
            retrain_units = float(selector_cfg.retrain_reference_units)
        else:
            # "auto": compute reference retraining cost
            retrain_units = estimate_retrain_cost(adapter, rec_ctx)

        compute_budget = float(selector_cfg.max_compute_ratio_vs_retrain * retrain_units)
        max_cands = selector_cfg.max_candidates

        scheduled: list[StrategyCandidate] = []
        running_cost = 0.0

        for cand in applicable_candidates:
            if len(scheduled) >= max_cands:
                skipped_candidates.append(
                    SkippedCandidate(
                        strategy=cand.strategy,
                        reason="BUDGET_EXCEEDED",
                        eligible_for=cand.eligible_for,
                        message=f"max_candidates limit of {max_cands} reached.",
                        estimated_cost=cand.estimated_cost,
                    )
                )
            elif cand.estimated_cost > compute_budget:
                skipped_candidates.append(
                    SkippedCandidate(
                        strategy=cand.strategy,
                        reason="BUDGET_EXCEEDED",
                        eligible_for=cand.eligible_for,
                        message=(
                            f"Compute budget of {compute_budget:.1f} units exceeded "
                            f"(strategy requires {cand.estimated_cost:.1f} units)."
                        ),
                        estimated_cost=cand.estimated_cost,
                    )
                )
            else:
                cand.priority = len(scheduled) + 1
                scheduled.append(cand)
                running_cost += cand.estimated_cost

        return SelectionReport(
            candidates=scheduled,
            skipped=skipped_candidates,
            total_estimated_cost=round(running_cost, 2),
            compute_budget=round(compute_budget, 2),
            retrain_reference_units=round(retrain_units, 2),
            max_candidates=max_cands,
            primary_label=diagnosis_report.primary_label,
            is_healthy=diagnosis_report.is_healthy,
            details={
                "applicable_count": len(applicable_candidates),
                "scheduled_count": len(scheduled),
                "skipped_count": len(skipped_candidates),
            },
        )
