/**
 * Zod 4 schemas and inferred types for the recovery pages.
 * Pages never compute metrics or verdicts — they only render API responses.
 */
import { z } from "zod";
import {
  SCENARIO_IDS,
  STRATEGIES,
  VERDICTS,
  DIAGNOSIS_LABELS,
  GATE_DECISIONS,
} from "@/lib/schemas";

// ─── Shared refs ────────────────────────────────────────────────────────────

export const architectures = [
  "mlp_small",
  "small_cnn",
  "resnet18_cifar",
] as const;
export type Architecture = (typeof architectures)[number];

export const datasets = ["CIFAR-10 sample", "MNIST sample"] as const;
export type Dataset = (typeof datasets)[number];

// ─── New Run form ────────────────────────────────────────────────────────────

export const newRunFormSchema = z.object({
  scenarioId: z.enum(SCENARIO_IDS, {
    message: "Please choose a scenario",
  }),
  file: z
    .any()
    .refine((f) => f instanceof File, { message: "A model file is required" })
    .refine(
      (f) =>
        f instanceof File && (f.name.endsWith(".pt") || f.name.endsWith(".pth")),
      { message: "File must be a .pt or .pth checkpoint" }
    ),
  architecture: z.enum(architectures, {
    message: "Please select an architecture",
  }),
  dataset: z.enum(datasets, {
    message: "Please select a dataset",
  }),
});

export type NewRunForm = z.infer<typeof newRunFormSchema>;

// ─── Config preview ──────────────────────────────────────────────────────────

export const strategyConfigSchema = z.object({
  strategy: z.enum(STRATEGIES),
  label: z.string(),
  cost_units: z.number(),
});

export const configPreviewSchema = z.object({
  scenarioId: z.enum(SCENARIO_IDS),
  split: z.object({
    train: z.number(),
    val: z.number(),
    holdout: z.number(),
  }),
  acceptance_policy: z.object({
    min_accuracy_gain: z.number(),
    max_ece: z.number(),
    min_retention: z.number(),
  }),
  compute_budget_cu: z.number(),
  strategy_order: z.array(strategyConfigSchema),
});

export type ConfigPreview = z.infer<typeof configPreviewSchema>;
export type StrategyConfig = z.infer<typeof strategyConfigSchema>;

// ─── History run row ─────────────────────────────────────────────────────────

export const historyRunSchema = z.object({
  id: z.string(),
  model_name: z.string(),
  architecture: z.enum(architectures),
  scenario_id: z.enum(SCENARIO_IDS),
  diagnosis_label: z.enum(DIAGNOSIS_LABELS),
  verdict: z.enum(VERDICTS),
  accuracy_before: z.number(),
  accuracy_after: z.number().nullable(),
  compute_units: z.number(),
  created_at: z.string(), // ISO timestamp
});

export type HistoryRun = z.infer<typeof historyRunSchema>;

// ─── Benchmark KPI summary ───────────────────────────────────────────────────

export const benchmarkKpiSchema = z.object({
  compute_saved_rate: z.number(),
  avg_accuracy_gain: z.number(),
  avg_ece_reduction: z.number(),
  gate_rejection_rate: z.number(),
});

export type BenchmarkKpi = z.infer<typeof benchmarkKpiSchema>;

// ─── Benchmark method with retention ─────────────────────────────────────────

export const benchmarkMethodExtSchema = z.object({
  method: z.string(),
  accuracy_mean: z.number(),
  accuracy_std: z.number(),
  ece_mean: z.number(),
  ece_std: z.number(),
  compute_units_mean: z.number(),
  wall_time_s_mean: z.number(),
  retention_mean: z.number(),
  seeds: z.number(),
});

export type BenchmarkMethodExt = z.infer<typeof benchmarkMethodExtSchema>;

export const benchmarkExtSchema = z.object({
  scenario_id: z.enum(SCENARIO_IDS),
  kpi: benchmarkKpiSchema,
  methods: z.array(benchmarkMethodExtSchema),
});

export type BenchmarkExt = z.infer<typeof benchmarkExtSchema>;

// ─── Monitor thresholds ──────────────────────────────────────────────────────

export const monitorThresholdsSchema = z.object({
  patience: z.number().int(),
  smoothing_window: z.number().int(),
  cooldown_epochs: z.number().int(),
  gap_threshold: z.number(),
});

export type MonitorThresholds = z.infer<typeof monitorThresholdsSchema>;

// ─── Monitor status pill ─────────────────────────────────────────────────────

export const MONITOR_HEALTH_STATUSES = [
  "healthy",
  "warning",
  "triggered",
  "recovering",
] as const;
export type MonitorHealthStatus = (typeof MONITOR_HEALTH_STATUSES)[number];

export const monitorLiveStateSchema = z.object({
  epoch: z.number().int(),
  smoothed_gap: z.number(),
  patience_counter: z.number().int(),
  in_cooldown: z.boolean(),
  cooldown_remaining: z.number().int(),
  health_status: z.enum(MONITOR_HEALTH_STATUSES),
});

export type MonitorLiveState = z.infer<typeof monitorLiveStateSchema>;

// ─── Verdict badge variant (for internal use) ────────────────────────────────
export type VerdictBadgeVariant = (typeof VERDICTS)[number];

// Re-export for convenience
export { SCENARIO_IDS, STRATEGIES, VERDICTS, DIAGNOSIS_LABELS, GATE_DECISIONS };
