import { z } from "zod";

export const SCENARIO_IDS = ["S1", "S2", "S3", "S4", "S5", "S6"] as const;
export const RUN_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export const STRATEGIES = [
  "temperature_scaling",
  "bn_recalibration",
  "last_layer_retraining",
  "selective_finetune_l2sp",
  "checkpoint_reversion",
  "weight_interpolation",
] as const;
export const DIAGNOSIS_LABELS = [
  "overfitting",
  "miscalibration",
  "bn_drift",
  "unstable_training",
  "degraded_head",
  "healthy",
] as const;
export const GATE_DECISIONS = ["accepted", "rejected", "skipped"] as const;
export const VERDICTS = [
  "accepted",
  "rolled_back",
  "healthy_no_action",
  "error",
] as const;
export const MONITOR_EVENT_TYPES = [
  "overfit_warning",
  "instability_warning",
  "trigger",
  "action",
  "cooldown",
] as const;
export const HEALTH_STATUSES = ["online", "degraded", "offline"] as const;

export const scenarioIdSchema = z.enum(SCENARIO_IDS);
export const ScenarioIdSchema = scenarioIdSchema;

export const scenarioSchema = z.object({
  id: scenarioIdSchema,
  name: z.string(),
  failure_mode: z.string(),
  description: z.string(),
  expected_recovery: z.string(),
});
export const ScenarioSchema = scenarioSchema;

export const runStatusSchema = z.enum(RUN_STATUSES);
export const RunStatusSchema = runStatusSchema;

export const strategySchema = z.enum(STRATEGIES);
export const StrategySchema = strategySchema;

export const diagnosisLabelSchema = z.enum(DIAGNOSIS_LABELS);
export const DiagnosisLabelSchema = diagnosisLabelSchema;

export const diagnosisSchema = z.object({
  label: diagnosisLabelSchema,
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
});
export const DiagnosisSchema = diagnosisSchema;

export const candidateGateDecisionSchema = z.enum(GATE_DECISIONS);
export const CandidateGateDecisionSchema = candidateGateDecisionSchema;

export const candidateSchema = z.object({
  strategy: strategySchema,
  cost_units: z.number(),
  delta_primary: z.number(),
  ci_low: z.number(),
  ci_high: z.number(),
  retention: z.number(),
  gate_decision: candidateGateDecisionSchema,
  gate_reasons: z.array(z.string()),
});
export const CandidateSchema = candidateSchema;

export const verdictSchema = z.enum(VERDICTS);
export const VerdictSchema = verdictSchema;

export const metricsSchema = z.object({
  accuracy: z.number(),
  ece: z.number(),
  nll: z.number(),
});
export const MetricsSchema = metricsSchema;

export const runArtifactSchema = z.object({
  name: z.string(),
  size_bytes: z.number(),
});
export const RunArtifactSchema = runArtifactSchema;
export const artifactSchema = runArtifactSchema;
export const ArtifactSchema = runArtifactSchema;

export const runSchema = z.object({
  id: z.string(),
  scenario_id: scenarioIdSchema,
  architecture: z.string(),
  status: runStatusSchema,
  stage_label: z.string(),
  progress: z.number().min(0).max(100),
  created_at: z.string(),
  finished_at: z.string().nullable(),
  verdict: verdictSchema.nullable(),
  diagnosis: z.array(diagnosisSchema),
  candidates: z.array(candidateSchema),
  original_metrics: metricsSchema,
  accepted_metrics: metricsSchema.nullable(),
  compute_units: z.number(),
  artifacts: z.array(runArtifactSchema),
  error: z.string().nullable(),
  cancel_requested: z.boolean(),
});
export const RunSchema = runSchema;

export const benchmarkMethodSchema = z.object({
  method: z.string(),
  accuracy_mean: z.number(),
  accuracy_std: z.number(),
  ece_mean: z.number(),
  ece_std: z.number(),
  compute_units_mean: z.number(),
  wall_time_s_mean: z.number(),
  seeds: z.number(),
});
export const BenchmarkMethodSchema = benchmarkMethodSchema;

export const benchmarkSchema = z.object({
  scenario_id: scenarioIdSchema,
  methods: z.array(benchmarkMethodSchema),
});
export const BenchmarkSchema = benchmarkSchema;

export const monitorPointSchema = z.object({
  epoch: z.number(),
  train_loss: z.number(),
  val_loss: z.number(),
  train_acc: z.number(),
  val_acc: z.number(),
});
export const MonitorPointSchema = monitorPointSchema;

export const monitorEventTypeSchema = z.enum(MONITOR_EVENT_TYPES);
export const MonitorEventTypeSchema = monitorEventTypeSchema;

export const monitorEventSchema = z.object({
  epoch: z.number(),
  type: monitorEventTypeSchema,
  message: z.string(),
});
export const MonitorEventSchema = monitorEventSchema;

export const monitorFollowupSchema = z.object({
  verdict: verdictSchema,
  summary: z.string(),
});
export const MonitorFollowupSchema = monitorFollowupSchema;

export const monitorReplaySchema = z.object({
  id: z.string(),
  scenario_id: scenarioIdSchema,
  status: runStatusSchema,
  points: z.array(monitorPointSchema),
  events: z.array(monitorEventSchema),
  followup: monitorFollowupSchema.nullable(),
});
export const MonitorReplaySchema = monitorReplaySchema;

export const healthStatusSchema = z.enum(HEALTH_STATUSES);
export const HealthStatusSchema = healthStatusSchema;

export const healthSchema = z.object({
  status: healthStatusSchema,
  version: z.string(),
  checked_at: z.string(),
});
export const HealthSchema = healthSchema;
