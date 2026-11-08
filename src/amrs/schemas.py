"""Pydantic v2 schemas for the AMRS API and domain models."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator
from torch.utils.data import Dataset

# ---------------------------------------------------------------------------
# Error Envelope Schemas
# ---------------------------------------------------------------------------


class ErrorDetail(BaseModel):
    """Normalized error payload detail."""

    model_config = ConfigDict(extra="forbid")

    code: str = Field(..., description="Machine-readable uppercase error string")
    message: str = Field(..., description="Human-readable error description")
    details: dict[str, Any] = Field(default_factory=dict, description="Contextual error metadata")


class ErrorEnvelope(BaseModel):
    """Standardized top-level error response envelope."""

    model_config = ConfigDict(extra="forbid")

    error: ErrorDetail


# ---------------------------------------------------------------------------
# Health Schemas
# ---------------------------------------------------------------------------


class HealthResponse(BaseModel):
    """Response returned by GET /api/v1/health."""

    status: Literal["healthy", "degraded", "unhealthy"] = "healthy"
    version: str = "0.1.0"
    db_status: Literal["ok", "error"] = "ok"


# ---------------------------------------------------------------------------
# Configuration Schemas (matching configs/default.yaml and Section 2.7)
# ---------------------------------------------------------------------------


class SplitsConfig(BaseModel):
    val_frac: float = Field(0.5, ge=0.0, le=1.0)
    holdout_from_val: bool = True
    stratify: bool = True


class DiagnosisOverfittingConfig(BaseModel):
    gap_min: float = Field(0.10, ge=0.0, le=1.0)
    train_acc_min: float = Field(0.90, ge=0.0, le=1.0)
    val_loss_rise_epochs: int = Field(3, ge=1)


class DiagnosisMiscalibrationConfig(BaseModel):
    ece_min: float = Field(0.05, ge=0.0, le=1.0)
    ece_bins: int = Field(15, ge=5, le=100)


class DiagnosisBnDriftConfig(BaseModel):
    divergence_min: float = Field(0.5, ge=0.0)
    acc_drop_min: float = Field(0.03, ge=0.0, le=1.0)


class DiagnosisInstabilityConfig(BaseModel):
    spike_ratio: float = Field(2.0, ge=1.0)
    cv_min: float = Field(0.35, ge=0.0)


class DiagnosisHeadDegradationConfig(BaseModel):
    probe_gain_min: float = Field(0.02, ge=0.0, le=1.0)


class DiagnosisConfig(BaseModel):
    overfitting: DiagnosisOverfittingConfig = Field(default_factory=DiagnosisOverfittingConfig)
    miscalibration: DiagnosisMiscalibrationConfig = Field(
        default_factory=DiagnosisMiscalibrationConfig
    )
    bn_drift: DiagnosisBnDriftConfig = Field(default_factory=DiagnosisBnDriftConfig)
    instability: DiagnosisInstabilityConfig = Field(default_factory=DiagnosisInstabilityConfig)
    head_degradation: DiagnosisHeadDegradationConfig = Field(
        default_factory=DiagnosisHeadDegradationConfig
    )
    healthy_if_none: bool = True


class SelectorConfig(BaseModel):
    mode: Literal["first_accept", "best_of_all"] = "first_accept"
    max_candidates: int = Field(4, ge=1, le=20)
    max_compute_ratio_vs_retrain: float = Field(0.5, gt=0.0, le=2.0)
    retrain_reference_units: str = "auto"


class TemperatureScalingConfig(BaseModel):
    max_iter: int = Field(50, ge=10, le=500)


class BnRecalibrationConfig(BaseModel):
    max_batches: int = Field(100, ge=1, le=2000)
    momentum: float | None = None


class CheckpointReversionConfig(BaseModel):
    top_k: int = Field(3, ge=1, le=20)


class CheckpointAveragingConfig(BaseModel):
    last_k: int = Field(5, ge=2, le=50)


class LastLayerFinetuneConfig(BaseModel):
    epochs: int = Field(5, ge=1, le=50)
    lr: float = Field(0.01, gt=0.0)
    weight_decay: float = Field(5.0e-4, ge=0.0)


class SelectiveFinetuneL2spConfig(BaseModel):
    unfreeze_top_n: int = Field(2, ge=1, le=10)
    epochs: int = Field(8, ge=1, le=50)
    lr: float = Field(0.003, gt=0.0)
    l2sp_alpha: float = Field(0.1, ge=0.0)
    weight_decay: float = Field(5.0e-4, ge=0.0)
    augment: bool = True


class WeightInterpolationConfig(BaseModel):
    alphas: list[float] = Field(default_factory=lambda: [0.25, 0.5, 0.75])


class StrategiesConfig(BaseModel):
    temperature_scaling: TemperatureScalingConfig = Field(default_factory=TemperatureScalingConfig)
    bn_recalibration: BnRecalibrationConfig = Field(default_factory=BnRecalibrationConfig)
    checkpoint_reversion: CheckpointReversionConfig = Field(
        default_factory=CheckpointReversionConfig
    )
    checkpoint_averaging: CheckpointAveragingConfig = Field(
        default_factory=CheckpointAveragingConfig
    )
    last_layer_finetune: LastLayerFinetuneConfig = Field(default_factory=LastLayerFinetuneConfig)
    selective_finetune_l2sp: SelectiveFinetuneL2spConfig = Field(
        default_factory=SelectiveFinetuneL2spConfig
    )
    weight_interpolation: WeightInterpolationConfig = Field(
        default_factory=WeightInterpolationConfig
    )


class GateMinGainConfig(BaseModel):
    accuracy: float = Field(0.005, ge=0.0, le=1.0)
    ece: float = Field(0.01, ge=0.0, le=1.0)


class GateMaxRegressionConfig(BaseModel):
    accuracy: float = Field(0.005, ge=0.0, le=1.0)
    nll: float = Field(0.02, ge=0.0)
    ece: float = Field(0.01, ge=0.0, le=1.0)


class GateConfig(BaseModel):
    holdout_min_size: int = Field(500, ge=50)
    allow_small_holdout: bool = False
    max_holdout_evaluations: int = Field(3, ge=1, le=10)
    family_alpha: float = Field(0.05, gt=0.0, lt=0.5)
    bootstrap_samples: int = Field(1000, ge=200)
    min_gain: GateMinGainConfig = Field(default_factory=GateMinGainConfig)
    max_regression: GateMaxRegressionConfig = Field(default_factory=GateMaxRegressionConfig)
    min_retention: float = Field(0.95, ge=0.0, le=1.0)


class MonitorOverfitConfig(BaseModel):
    gap_rise_min: float = Field(0.03, ge=0.0)
    val_loss_rise: bool = True


class MonitorInstabilityConfig(BaseModel):
    spike_ratio: float = Field(2.0, ge=1.0)


class MonitorConfig(BaseModel):
    ema_beta: float = Field(0.6, ge=0.0, le=1.0)
    patience: int = Field(3, ge=1)
    cooldown_epochs: int = Field(5, ge=0)
    overfit: MonitorOverfitConfig = Field(default_factory=MonitorOverfitConfig)
    instability: MonitorInstabilityConfig = Field(default_factory=MonitorInstabilityConfig)
    action: Literal["log", "early_stop", "recover"] = "log"


class ConfigDefaultsResponse(BaseModel):
    """Full resolved default configuration matching configs/default.yaml."""

    seed: int = 1234
    device: Literal["auto", "cpu", "cuda"] = "auto"
    splits: SplitsConfig = Field(default_factory=SplitsConfig)
    diagnosis: DiagnosisConfig = Field(default_factory=DiagnosisConfig)
    selector: SelectorConfig = Field(default_factory=SelectorConfig)
    strategies: StrategiesConfig = Field(default_factory=StrategiesConfig)
    gate: GateConfig = Field(default_factory=GateConfig)
    monitor: MonitorConfig = Field(default_factory=MonitorConfig)


# ---------------------------------------------------------------------------
# Scenario Schemas
# ---------------------------------------------------------------------------


class ScenarioItem(BaseModel):
    scenario_id: str
    name: str
    description: str
    ground_truth_label: str
    arch: str
    artifacts_ready: bool


class ScenarioListResponse(BaseModel):
    scenarios: list[ScenarioItem]
    total: int


# ---------------------------------------------------------------------------
# Model Upload Schemas
# ---------------------------------------------------------------------------


class ModelUploadResponse(BaseModel):
    model_upload_id: str
    arch: str
    filename: str
    sha256: str
    size_bytes: int


class ModelDetectResponse(BaseModel):
    detected_arch: str
    confidence: float
    suggested_dataset: str | None = None
    num_tensors: int
    details: dict[str, Any] = Field(default_factory=dict)


class DatasetUploadResponse(BaseModel):
    dataset_upload_id: str
    filename: str
    format: str
    num_samples: int
    num_classes: int
    size_bytes: int
    sha256: str


# ---------------------------------------------------------------------------
# Run Lifecycle & Detail Schemas
# ---------------------------------------------------------------------------


class RunCreateRequest(BaseModel):
    scenario_id: str | None = Field(None, description="Preset scenario ID (e.g. s1_overfit)")
    model_upload_id: str | None = Field(None, description="ID of previously uploaded model weights")
    dataset_upload_id: str | None = Field(None, description="ID of previously uploaded dataset")
    arch: str | None = Field(None, description="Architecture name from model registry")
    architecture: str | None = Field(None, description="Alias for arch from frontend client")
    config_overrides: dict[str, Any] | None = Field(None, description="YAML config overrides")
    seed: int | None = Field(None, description="Deterministic seed")
    user_id: str | None = Field(None, description="ID of authenticated user initiating run")

    @model_validator(mode="after")
    def validate_intake_source(self) -> RunCreateRequest:
        if not self.arch and self.architecture:
            self.arch = self.architecture
        if not self.scenario_id and not self.model_upload_id:
            raise ValueError("Either 'scenario_id' or 'model_upload_id' must be provided.")
        if self.model_upload_id and not self.arch:
            raise ValueError("'arch' is required when 'model_upload_id' is provided.")
        return self


class RunCreateResponse(BaseModel):
    run_id: str
    status: Literal["queued", "running"] = "queued"


class RunSummary(BaseModel):
    id: str
    created_at: str
    status: Literal["queued", "running", "succeeded", "failed", "cancel_requested", "cancelled"]
    scenario_id: str | None = None
    arch: str
    architecture: str | None = None
    original_sha256: str
    verdict: Literal["accepted", "rolled_back", "healthy_no_action", "error"] | None = None
    accepted_strategy: str | None = None
    duration_s: float | None = None
    compute_units_total: float | None = None
    primary_diagnosis: str | None = None
    diagnoses: list[dict[str, Any]] = []
    candidates: list[dict[str, Any]] = []
    user_id: str | None = None

    @model_validator(mode="after")
    def populate_run_summary_aliases(self) -> Self:
        if self.architecture is None and self.arch:
            self.architecture = self.arch
        return self


class RunListResponse(BaseModel):
    runs: list[RunSummary]
    total: int
    limit: int
    offset: int


# ---------------------------------------------------------------------------
# Diagnosis Schemas (ML-1 / Section 2.8)
# ---------------------------------------------------------------------------

DiagnosisLabel = Literal[
    "overfitting",
    "miscalibration",
    "bn_drift",
    "instability",
    "head_degradation",
    "healthy",
]


class DiagnosisEvidence(BaseModel):
    metric_values: dict[str, float] = Field(default_factory=dict)
    threshold_values: dict[str, float] = Field(default_factory=dict)
    source_split: str = "val"
    explanation: str = ""
    not_evaluable: bool = False
    not_evaluable_reason: str | None = None


class DiagnosisItem(BaseModel):
    label: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    rank: int = Field(..., ge=1)
    evidence: DiagnosisEvidence = Field(default_factory=DiagnosisEvidence)


class DiagnosisReport(BaseModel):
    primary_label: str
    diagnoses: list[DiagnosisItem] = Field(default_factory=list)
    is_healthy: bool = False
    not_evaluable: list[str] = Field(default_factory=list)
    not_evaluable_reasons: dict[str, str] = Field(default_factory=dict)
    evidence_trail: dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Recovery & Selector Schemas
# ---------------------------------------------------------------------------


class Applicability(BaseModel):
    can_apply: bool
    reason: str | None = None
    message: str | None = None


class CostEstimate(BaseModel):
    estimated_units: float
    wall_s: float | None = None
    is_estimate: bool = True
    details: dict[str, Any] = Field(default_factory=dict)


class StrategyCandidate(BaseModel):
    strategy: str
    eligible_for: list[str] = Field(default_factory=list)
    estimated_cost: float
    priority: int = 1
    params: dict[str, Any] = Field(default_factory=dict)
    cost_details: dict[str, Any] = Field(default_factory=dict)
    primary_metric: str = "accuracy"
    is_estimate: bool = True


class SkippedCandidate(BaseModel):
    strategy: str
    reason: str
    eligible_for: list[str] = Field(default_factory=list)
    message: str | None = None
    estimated_cost: float | None = None


class SelectionReport(BaseModel):
    candidates: list[StrategyCandidate] = Field(default_factory=list)
    skipped: list[SkippedCandidate] = Field(default_factory=list)
    total_estimated_cost: float = 0.0
    compute_budget: float = 0.0
    retrain_reference_units: float = 0.0
    max_candidates: int = 4
    primary_label: str | None = None
    is_healthy: bool = False
    details: dict[str, Any] = Field(default_factory=dict)


class StrategyResult(BaseModel):
    strategy_name: str
    success: bool
    params: dict[str, Any] = Field(default_factory=dict)
    seed: int = 1234
    elapsed_wall_s: float = 0.0
    compute_units: float = 0.0
    grad_steps: int = 0
    warnings: list[str] = Field(default_factory=list)
    artifact_metadata: dict[str, Any] = Field(default_factory=dict)
    error_message: str | None = None


class CandidateSummary(BaseModel):
    id: str
    run_id: str
    order_idx: int
    strategy: str
    params: dict[str, Any] = Field(default_factory=dict)
    cost_units: float
    wall_s: float
    primary_metric: str
    delta_primary: float
    ci_low: float
    ci_high: float
    retention: float
    agreement: float
    gate_decision: Literal["ACCEPT", "REJECT"]
    gate_reasons: list[str] = Field(default_factory=list)
    artifact_path: str | None = None


class RunDetailResponse(BaseModel):
    id: str
    created_at: str
    status: Literal["queued", "running", "succeeded", "failed", "cancel_requested", "cancelled"]
    progress_stage: str = "idle"
    progress_pct: float = Field(0.0, ge=0.0, le=100.0)
    scenario_id: str | None = None
    arch: str
    original_sha256: str
    config_json: dict[str, Any] = Field(default_factory=dict)
    seed: int
    verdict: Literal["accepted", "rolled_back", "healthy_no_action", "error"] | None = None
    accepted_strategy: str | None = None
    error_message: str | None = None
    duration_s: float | None = None
    compute_units_total: float | None = None
    diagnoses: list[DiagnosisItem] = Field(default_factory=list)
    candidates: list[CandidateSummary] = Field(default_factory=list)
    artifacts: list[dict[str, Any]] = Field(default_factory=list)
    user_id: str | None = None


class RunCancelResponse(BaseModel):
    run_id: str
    status: Literal["cancel_requested", "cancelled"] = "cancel_requested"
    message: str = "Cancellation requested successfully"


# ---------------------------------------------------------------------------
# Live Training Monitor Replay Schemas
# ---------------------------------------------------------------------------


class MonitorReplayRequest(BaseModel):
    scenario_id: str = Field(
        ..., description="Scenario to replay (e.g. s1_overfit, s4_instability)"
    )
    speed_multiplier: float = Field(1.0, ge=0.1, le=10.0)


class MonitorReplayResponse(BaseModel):
    replay_id: str
    status: Literal["queued", "running"] = "queued"


class MonitorEventItem(BaseModel):
    epoch: int
    kind: Literal["overfit_warning", "instability_warning", "trigger", "action", "cooldown"]
    details: dict[str, Any] = Field(default_factory=dict)


class MonitorReplayDetailResponse(BaseModel):
    replay_id: str
    scenario_id: str
    status: Literal["queued", "running", "succeeded", "failed"]
    events: list[MonitorEventItem] = Field(default_factory=list)
    series: dict[str, list[float]] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Benchmark Schemas
# ---------------------------------------------------------------------------


class BenchmarkCreateRequest(BaseModel):
    scenarios: list[str] = Field(
        default_factory=lambda: [
            "s1_overfit",
            "s2_miscalibration",
            "s3_bn_drift",
            "s4_instability",
            "s5_degraded_head",
            "s6_healthy",
        ]
    )
    seeds: list[int] = Field(default_factory=lambda: [1234])
    methods: list[str] = Field(
        default_factory=lambda: ["amrs", "early_stopping", "regularized_finetune", "full_retrain"]
    )
    profile: str = "tiny"
    device: str = "cpu"


class BenchmarkCreateResponse(BaseModel):
    benchmark_id: str
    status: Literal["queued", "running"] = "queued"


class BenchmarkResultItem(BaseModel):
    scenario_id: str
    seed: int
    method: str
    accuracy: float
    ece: float
    nll: float
    retention: float
    compute_units: float
    wall_s: float
    accepted: bool | None = None
    notes: str | None = None
    agreement: float | None = None
    status: Literal["completed", "failed", "pending"] = "completed"
    error_message: str | None = None


class TrialSpec(BaseModel):
    """Immutable specification for a single benchmark trial execution."""

    trial_id: str
    benchmark_id: str
    scenario_id: str
    seed: int
    method: str
    profile: str = "tiny"
    device: str = "cpu"
    budget: float | None = None
    config_overrides: dict[str, Any] = Field(default_factory=dict)


class BenchmarkSummaryItem(BaseModel):
    """Aggregated statistics for a given scenario and method."""

    scenario_id: str
    method: str
    trials_count: int
    accuracy_mean: float
    accuracy_std: float
    ece_mean: float
    ece_std: float
    nll_mean: float
    nll_std: float
    retention_mean: float
    retention_std: float
    compute_units_mean: float
    compute_units_std: float
    wall_s_mean: float
    wall_s_std: float


class PairedDeltaItem(BaseModel):
    """Paired difference between AMRS and a baseline for a given scenario."""

    scenario_id: str
    baseline_method: str
    pairs_count: int
    accuracy_delta_mean: float
    accuracy_delta_ci: tuple[float, float] | None = None
    ece_delta_mean: float
    ece_delta_ci: tuple[float, float] | None = None
    compute_ratio_mean: float


class BenchmarkDetailResponse(BaseModel):
    benchmark_id: str
    created_at: str
    status: Literal["queued", "running", "succeeded", "failed"]
    results: list[BenchmarkResultItem] = Field(default_factory=list)
    summaries: list[BenchmarkSummaryItem] = Field(default_factory=list)
    paired_deltas: list[PairedDeltaItem] = Field(default_factory=list)
    is_complete: bool = True


# ---------------------------------------------------------------------------
# Data Contract Schemas (DM-2.1)
# ---------------------------------------------------------------------------


@dataclass
class DataBundle:
    """Four-way dataset container fulfilling the AMRS Data Contract (DM-2.1).

    Attributes:
        train: Labeled training dataset used for model training/tuning.
        val: Labeled validation dataset used for diagnosis & candidate selection.
        holdout: Strictly isolated labeled dataset reserved exclusively for the verification gate.
        target: Optional unlabeled dataset (or None) used for unsupervised adaptation (e.g., BatchNorm recalibration).
        num_classes: Number of discrete classification categories.
        input_shape: Shape tuple of a single sample tensor (C, H, W).
        provenance: Metadata dictionary tracking dataset source, split ratios, and seed.
    """

    train: Dataset
    val: Dataset
    holdout: Dataset
    target: Dataset | None = None
    num_classes: int = 10
    input_shape: tuple[int, ...] = (3, 32, 32)
    provenance: dict[str, Any] = field(default_factory=dict)
