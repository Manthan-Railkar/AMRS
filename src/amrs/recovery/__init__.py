"""AMRS recovery strategies and interfaces."""

from amrs.recovery.base import (
    Applicability,
    CostEstimate,
    RecoveryContext,
    RecoveryStrategy,
    StrategyResult,
)
from amrs.recovery.bn_recal import (
    BnRecalibrationStrategy,
    recalibrate_bn_stats,
)
from amrs.recovery.checkpoints import (
    CheckpointAveragingStrategy,
    CheckpointReversionStrategy,
    average_state_dicts,
    validate_checkpoint,
)
from amrs.recovery.last_layer import (
    LastLayerFinetuneStrategy,
    finetune_last_layer,
)
from amrs.recovery.l2sp import (
    L2SPRegularizer,
    compute_l2sp_penalty,
)
from amrs.recovery.selective_ft import (
    SelectiveFinetuneL2spStrategy,
    finetune_selective_l2sp,
    select_trainable_groups,
)
from amrs.recovery.temperature import (
    CalibratedModel,
    CalibrationArtifact,
    TemperatureScalingStrategy,
    fit_temperature,
)

__all__ = [
    "Applicability",
    "CostEstimate",
    "RecoveryContext",
    "RecoveryStrategy",
    "StrategyResult",
    "CalibratedModel",
    "CalibrationArtifact",
    "TemperatureScalingStrategy",
    "fit_temperature",
    "BnRecalibrationStrategy",
    "recalibrate_bn_stats",
    "CheckpointReversionStrategy",
    "CheckpointAveragingStrategy",
    "average_state_dicts",
    "validate_checkpoint",
    "LastLayerFinetuneStrategy",
    "finetune_last_layer",
    "L2SPRegularizer",
    "compute_l2sp_penalty",
    "SelectiveFinetuneL2spStrategy",
    "finetune_selective_l2sp",
    "select_trainable_groups",
]
