import type { z } from "zod";
import type {
  scenarioIdSchema,
  scenarioSchema,
  runStatusSchema,
  strategySchema,
  diagnosisLabelSchema,
  diagnosisSchema,
  candidateGateDecisionSchema,
  candidateSchema,
  verdictSchema,
  metricsSchema,
  runArtifactSchema,
  runSchema,
  benchmarkMethodSchema,
  benchmarkSchema,
  monitorPointSchema,
  monitorEventTypeSchema,
  monitorEventSchema,
  monitorFollowupSchema,
  monitorReplaySchema,
  healthStatusSchema,
  healthSchema,
} from "@/lib/schemas";

export type ScenarioId = z.infer<typeof scenarioIdSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;

export type RunStatus = z.infer<typeof runStatusSchema>;
export type Strategy = z.infer<typeof strategySchema>;
export type DiagnosisLabel = z.infer<typeof diagnosisLabelSchema>;
export type Diagnosis = z.infer<typeof diagnosisSchema>;

export type GateDecision = z.infer<typeof candidateGateDecisionSchema>;
export type CandidateGateDecision = GateDecision;
export type Candidate = z.infer<typeof candidateSchema>;

export type Verdict = z.infer<typeof verdictSchema>;
export type Metrics = z.infer<typeof metricsSchema>;

export type RunArtifact = z.infer<typeof runArtifactSchema>;
export type Artifact = RunArtifact;
export type Run = z.infer<typeof runSchema>;

export type BenchmarkMethod = z.infer<typeof benchmarkMethodSchema>;
export type Benchmark = z.infer<typeof benchmarkSchema>;

export type MonitorPoint = z.infer<typeof monitorPointSchema>;
export type MonitorEventType = z.infer<typeof monitorEventTypeSchema>;
export type MonitorEvent = z.infer<typeof monitorEventSchema>;
export type MonitorFollowup = z.infer<typeof monitorFollowupSchema>;
export type MonitorReplay = z.infer<typeof monitorReplaySchema>;

export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type Health = z.infer<typeof healthSchema>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
