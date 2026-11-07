import { z } from "zod";
import { DIAGNOSIS_LABELS, STRATEGIES, VERDICTS, SCENARIO_IDS } from "@/lib/schemas";

// ─── KPI summary ───────────────────────────────────────────────────────────

export const dashboardStatsSchema = z.object({
  modelsUploaded: z.number().int().nonnegative(),
  modelsUploadedDeltaWeek: z.number().int(),
  recoveryRuns: z.number().int().nonnegative(),
  acceptedCount: z.number().int().nonnegative(),
  acceptedRate: z.number().min(0).max(1),
  rolledBackCount: z.number().int().nonnegative(),
  rolledBackRate: z.number().min(0).max(1),
  healthyCount: z.number().int().nonnegative(),
  healthyRate: z.number().min(0).max(1),
  avgAccuracyGainPp: z.number(),
  avgEceReductionRate: z.number().min(0).max(1),
  computeSavedRate: z.number().min(0).max(1),
  runsOverTime: z.array(
    z.object({
      week: z.string(),
      accepted: z.number().int().nonnegative(),
      rolledBack: z.number().int().nonnegative(),
      healthy: z.number().int().nonnegative(),
      amrsCompute: z.number().nonnegative(),
      fullRetrainCompute: z.number().nonnegative(),
    })
  ),
  diagnosisCounts: z.array(
    z.object({
      label: z.enum(DIAGNOSIS_LABELS),
      count: z.number().int().nonnegative(),
    })
  ),
  strategyStats: z.array(
    z.object({
      strategy: z.enum(STRATEGIES),
      attempts: z.number().int().nonnegative(),
      accepted: z.number().int().nonnegative(),
      successRate: z.number().min(0).max(1),
    })
  ),
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// ─── Uploaded model (row in the recent-models table) ───────────────────────

export const uploadedModelSchema = z.object({
  id: z.string(),
  runId: z.string(),
  name: z.string(),
  architecture: z.enum(["mlp_small", "small_cnn", "resnet18_cifar"]),
  scenarioId: z.enum(SCENARIO_IDS),
  diagnosisLabel: z.enum(DIAGNOSIS_LABELS),
  verdict: z.enum(VERDICTS),
  accuracyBefore: z.number().min(0).max(1),
  accuracyAfter: z.number().min(0).max(1).nullable(),
  uploadedAt: z.string(), // ISO timestamp
});

export type UploadedModel = z.infer<typeof uploadedModelSchema>;

// Convenience re-exports for narrower chart data types
export type RunsOverTimePoint = DashboardStats["runsOverTime"][number];
export type DiagnosisCount = DashboardStats["diagnosisCounts"][number];
export type StrategyStat = DashboardStats["strategyStats"][number];
