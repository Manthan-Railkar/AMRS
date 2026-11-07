"""AMRS strategy eligibility, registry, and cost-first selection module (Section 2.9, ML-2)."""

from amrs.schemas import (
    Applicability,
    CostEstimate,
    SelectionReport,
    SkippedCandidate,
    StrategyCandidate,
    StrategyResult,
)
from amrs.selector.selector import (
    DIAGNOSIS_TO_STRATEGIES,
    BnRecalibrationStrategy,
    CheckpointAveragingStrategy,
    CheckpointReversionStrategy,
    LastLayerFinetuneStrategy,
    SelectiveFinetuneL2spStrategy,
    StrategyRegistry,
    StrategySelector,
    TemperatureScalingStrategy,
    WeightInterpolationStrategy,
    default_registry,
    estimate_retrain_cost,
    resolve_primary_metric_for_candidate,
)

__all__ = [
    "DIAGNOSIS_TO_STRATEGIES",
    "StrategyRegistry",
    "StrategySelector",
    "default_registry",
    "estimate_retrain_cost",
    "resolve_primary_metric_for_candidate",
    "TemperatureScalingStrategy",
    "BnRecalibrationStrategy",
    "CheckpointReversionStrategy",
    "CheckpointAveragingStrategy",
    "LastLayerFinetuneStrategy",
    "SelectiveFinetuneL2spStrategy",
    "WeightInterpolationStrategy",
    "Applicability",
    "CostEstimate",
    "StrategyCandidate",
    "SkippedCandidate",
    "SelectionReport",
    "StrategyResult",
]
