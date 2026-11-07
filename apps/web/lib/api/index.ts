import { delay, ApiError, notFoundError } from "./client";
import type {
  ScenarioId,
  Scenario,
  Run,
  RunStatus,
  Verdict,
  Benchmark,
  MonitorReplay,
  Health,
  Metrics,
  Diagnosis,
  Candidate,
  RunArtifact,
} from "./types";
import { mockScenarios } from "@/lib/mock/scenarios";
import { mockRuns, mockAcceptedRun, mockRolledBackRun, mockHealthyRun } from "@/lib/mock/runs";
import { mockBenchmarks } from "@/lib/mock/benchmarks";
import { mockMonitorReplays } from "@/lib/mock/monitor";

export * from "./types";
export * from "./client";
export * from "./errors";
export * from "./health";
export * from "./config";
export * from "./scenarios";
export * from "./models";
export * from "./runs";
export * from "./monitor";
export * from "./benchmarks";
export * from "./recovery";
export * from "./feedback";

export interface CreateRunInput {
  scenario_id: ScenarioId;
  architecture?: string;
}

export interface ListRunsFilters {
  scenario_id?: ScenarioId;
  status?: RunStatus;
  verdict?: Verdict;
  limit?: number;
}

// In-memory state store for runs
const runsStore = new Map<string, Run>();

// Initialize runs store with existing mock runs
for (const run of mockRuns) {
  runsStore.set(run.id, structuredClone(run));
}

// In-memory store for monitor replays
const replayStore = new Map<string, MonitorReplay>();
for (const replay of mockMonitorReplays) {
  replayStore.set(replay.id, structuredClone(replay));
}

interface ScenarioOutcome {
  verdict: Verdict;
  stage_label: string;
  diagnosis: Diagnosis[];
  candidates: Candidate[];
  original_metrics: Metrics;
  accepted_metrics: Metrics | null;
  compute_units: number;
  artifacts: RunArtifact[];
}

function getScenarioOutcome(scenarioId: ScenarioId): ScenarioOutcome {
  switch (scenarioId) {
    case "S1":
      return {
        verdict: mockAcceptedRun.verdict ?? "accepted",
        stage_label: "Completed: recovery candidate accepted",
        diagnosis: structuredClone(mockAcceptedRun.diagnosis),
        candidates: structuredClone(mockAcceptedRun.candidates),
        original_metrics: structuredClone(mockAcceptedRun.original_metrics),
        accepted_metrics: structuredClone(mockAcceptedRun.accepted_metrics),
        compute_units: mockAcceptedRun.compute_units,
        artifacts: structuredClone(mockAcceptedRun.artifacts),
      };

    case "S2":
      return {
        verdict: "accepted",
        stage_label: "Completed: recovery candidate accepted",
        diagnosis: [
          {
            label: "miscalibration",
            confidence: 0.95,
            evidence: [
              "Expected Calibration Error (ECE) elevated to 0.142 despite 86.2% top-1 accuracy",
              "Severe confidence-accuracy misalignment on ambiguous validation samples",
              "Negative log-likelihood elevated (0.720) under high classification confidence",
            ],
          },
        ],
        candidates: [
          {
            strategy: "temperature_scaling",
            cost_units: 0.8,
            delta_primary: 0.012,
            ci_low: 0.006,
            ci_high: 0.018,
            retention: 0.994,
            gate_decision: "accepted",
            gate_reasons: [
              "Calibration error reduced from 0.142 to 0.024 (-83%)",
              "Retention 0.994 exceeds required 0.950",
              "Cheapest passing recovery strategy accepted (0.8 CU)",
            ],
          },
          {
            strategy: "last_layer_retraining",
            cost_units: 3.6,
            delta_primary: 0.008,
            ci_low: -0.002,
            ci_high: 0.018,
            retention: 0.942,
            gate_decision: "rejected",
            gate_reasons: [
              "Retention 0.942 below required 0.950",
              "Confidence interval spans zero (-0.002 to 0.018)",
            ],
          },
          {
            strategy: "weight_interpolation",
            cost_units: 2.1,
            delta_primary: 0.002,
            ci_low: -0.008,
            ci_high: 0.012,
            retention: 0.961,
            gate_decision: "skipped",
            gate_reasons: ["Skipped: cheaper viable candidate already accepted"],
          },
        ],
        original_metrics: {
          accuracy: 0.862,
          ece: 0.142,
          nll: 0.72,
        },
        accepted_metrics: {
          accuracy: 0.865,
          ece: 0.024,
          nll: 0.41,
        },
        compute_units: 1.5,
        artifacts: [
          { name: "optimal_temperature_parameter.json", size_bytes: 512 },
          { name: "calibration_reliability_diagram.png", size_bytes: 84200 },
        ],
      };

    case "S3":
      return {
        verdict: "accepted",
        stage_label: "Completed: recovery candidate accepted",
        diagnosis: [
          {
            label: "bn_drift",
            confidence: 0.92,
            evidence: [
              "Running mean and variance diverge from evaluation batch statistics (KL div 1.84)",
              "Internal covariate shift identified in residual blocks 3 and 4",
              "Target slice accuracy dropped by 6.1% due to covariate distribution shift",
            ],
          },
        ],
        candidates: [
          {
            strategy: "bn_recalibration",
            cost_units: 1.2,
            delta_primary: 0.045,
            ci_low: 0.028,
            ci_high: 0.062,
            retention: 0.988,
            gate_decision: "accepted",
            gate_reasons: [
              "Delta primary accuracy +0.045 exceeds required +0.020",
              "Feature distribution alignment restored without retraining weights",
              "Retention 0.988 meets required 0.950",
            ],
          },
          {
            strategy: "last_layer_retraining",
            cost_units: 4.2,
            delta_primary: 0.015,
            ci_low: -0.001,
            ci_high: 0.031,
            retention: 0.938,
            gate_decision: "rejected",
            gate_reasons: ["Retention 0.938 below required 0.950"],
          },
          {
            strategy: "selective_finetune_l2sp",
            cost_units: 7.5,
            delta_primary: 0.032,
            ci_low: 0.018,
            ci_high: 0.046,
            retention: 0.965,
            gate_decision: "skipped",
            gate_reasons: ["Skipped: cheaper viable candidate already accepted"],
          },
        ],
        original_metrics: {
          accuracy: 0.751,
          ece: 0.098,
          nll: 0.84,
        },
        accepted_metrics: {
          accuracy: 0.812,
          ece: 0.045,
          nll: 0.58,
        },
        compute_units: 2.1,
        artifacts: [
          { name: "recalibrated_bn_tensors.pt", size_bytes: 512000 },
          { name: "batch_norm_drift_audit.json", size_bytes: 8200 },
        ],
      };

    case "S4":
      return {
        verdict: mockRolledBackRun.verdict ?? "rolled_back",
        stage_label: "Completed: all candidates failed gates, rolled back",
        diagnosis: structuredClone(mockRolledBackRun.diagnosis),
        candidates: structuredClone(mockRolledBackRun.candidates),
        original_metrics: structuredClone(mockRolledBackRun.original_metrics),
        accepted_metrics: null,
        compute_units: mockRolledBackRun.compute_units,
        artifacts: structuredClone(mockRolledBackRun.artifacts),
      };

    case "S5":
      return {
        verdict: "accepted",
        stage_label: "Completed: recovery candidate accepted",
        diagnosis: [
          {
            label: "degraded_head",
            confidence: 0.93,
            evidence: [
              "Linear probe reveals representation collapse in final classification projection",
              "Backbone feature extractor fidelity remains 98.4% compared to pre-trained baseline",
              "Selective gradient corruption isolated strictly to classification layer weights",
            ],
          },
        ],
        candidates: [
          {
            strategy: "last_layer_retraining",
            cost_units: 4.5,
            delta_primary: 0.058,
            ci_low: 0.041,
            ci_high: 0.075,
            retention: 0.976,
            gate_decision: "accepted",
            gate_reasons: [
              "Delta primary accuracy +0.058 exceeds required +0.020",
              "Retention 0.976 meets required 0.950",
              "Linear classification head retrained successfully on balanced slice",
            ],
          },
          {
            strategy: "selective_finetune_l2sp",
            cost_units: 8.4,
            delta_primary: 0.052,
            ci_low: 0.035,
            ci_high: 0.069,
            retention: 0.962,
            gate_decision: "skipped",
            gate_reasons: ["Skipped: cheaper viable candidate already accepted"],
          },
          {
            strategy: "weight_interpolation",
            cost_units: 2.8,
            delta_primary: -0.012,
            ci_low: -0.028,
            ci_high: 0.004,
            retention: 0.895,
            gate_decision: "rejected",
            gate_reasons: ["Retention 0.895 below required 0.950"],
          },
        ],
        original_metrics: {
          accuracy: 0.698,
          ece: 0.156,
          nll: 1.12,
        },
        accepted_metrics: {
          accuracy: 0.842,
          ece: 0.048,
          nll: 0.52,
        },
        compute_units: 4.5,
        artifacts: [
          { name: "retrained_linear_head.pt", size_bytes: 8400000 },
          { name: "head_vs_backbone_gradient_report.json", size_bytes: 14500 },
        ],
      };

    case "S6":
    default:
      return {
        verdict: mockHealthyRun.verdict ?? "healthy_no_action",
        stage_label: "Completed: model verified healthy, no action needed",
        diagnosis: structuredClone(mockHealthyRun.diagnosis),
        candidates: structuredClone(mockHealthyRun.candidates),
        original_metrics: structuredClone(mockHealthyRun.original_metrics),
        accepted_metrics: structuredClone(mockHealthyRun.accepted_metrics),
        compute_units: mockHealthyRun.compute_units,
        artifacts: structuredClone(mockHealthyRun.artifacts),
      };
  }
}

/**
 * Returns system health status.
 */
export async function getHealth(): Promise<Health> {
  await delay();
  return {
    status: "online",
    version: "1.0.0",
    checked_at: new Date().toISOString(),
  };
}

/**
 * Returns available failure/recovery benchmark scenarios.
 */
export async function getScenarios(): Promise<Scenario[]> {
  await delay();
  return structuredClone(mockScenarios);
}

/**
 * Creates a new recovery run.
 * Rejects with ApiError(409, "run_active") if a run is already queued or running.
 * Returns the new run id.
 */
export async function createRun(input: CreateRunInput): Promise<string> {
  await delay();

  // Reject if an active run is currently ongoing
  const activeRun = Array.from(runsStore.values()).find(
    (r) => r.status === "queued" || r.status === "running"
  );
  if (activeRun) {
    throw new ApiError(409, "run_active", `Run '${activeRun.id}' is currently active`);
  }

  const outcome = getScenarioOutcome(input.scenario_id);
  const runNumber = String(runsStore.size + 1).padStart(3, "0");
  const newId = `run-amrs-${runNumber}`;

  const newRun: Run = {
    id: newId,
    scenario_id: input.scenario_id,
    architecture: input.architecture ?? "ResNet-50",
    status: "queued",
    stage_label: "Queued",
    progress: 0,
    created_at: new Date().toISOString(),
    finished_at: null,
    verdict: null,
    diagnosis: [],
    candidates: [],
    original_metrics: structuredClone(outcome.original_metrics),
    accepted_metrics: null,
    compute_units: 0,
    artifacts: [],
    error: null,
    cancel_requested: false,
  };

  runsStore.set(newId, newRun);
  return newId;
}

/**
 * Gets a run by ID, advancing simulated execution progress on each call.
 * Advance cycle: queued -> running (Loading -> Diagnosing -> Trying strategy k/N -> Verifying) -> succeeded.
 * If cancel_requested is true, the next poll transitions status to cancelled.
 */
export async function getRun(id: string): Promise<Run> {
  await delay();

  const run = runsStore.get(id);
  if (!run) {
    throw notFoundError("Run", id);
  }

  // If cancellation was requested and run is not yet finished, transition to cancelled
  if (run.cancel_requested && run.status !== "succeeded" && run.status !== "failed" && run.status !== "cancelled") {
    run.status = "cancelled";
    run.stage_label = "Cancelled";
    run.finished_at = new Date().toISOString();
    return structuredClone(run);
  }

  // If already in a terminal state, return current snapshot
  if (run.status === "succeeded" || run.status === "failed" || run.status === "cancelled") {
    return structuredClone(run);
  }

  // Advance simulation state machine
  if (run.status === "queued") {
    run.status = "running";
    run.stage_label = "Loading";
    run.progress = 15;
    return structuredClone(run);
  }

  if (run.status === "running") {
    switch (run.stage_label) {
      case "Loading":
        run.stage_label = "Diagnosing";
        run.progress = 35;
        break;

      case "Diagnosing":
        run.stage_label = "Trying strategy 1/3";
        run.progress = 55;
        break;

      case "Trying strategy 1/3":
        run.stage_label = "Trying strategy 2/3";
        run.progress = 70;
        break;

      case "Trying strategy 2/3":
        run.stage_label = "Trying strategy 3/3";
        run.progress = 85;
        break;

      case "Trying strategy 3/3":
        run.stage_label = "Verifying";
        run.progress = 95;
        break;

      case "Verifying":
      default: {
        const outcome = getScenarioOutcome(run.scenario_id);
        run.status = "succeeded";
        run.stage_label = outcome.stage_label;
        run.progress = 100;
        run.finished_at = new Date().toISOString();
        run.verdict = outcome.verdict;
        run.diagnosis = outcome.diagnosis;
        run.candidates = outcome.candidates;
        run.accepted_metrics = outcome.accepted_metrics;
        run.compute_units = outcome.compute_units;
        run.artifacts = outcome.artifacts;
        break;
      }
    }
  }

  return structuredClone(run);
}

/**
 * Lists runs from the in-memory store with optional filters.
 */
export async function listRuns(filters?: ListRunsFilters): Promise<Run[]> {
  await delay();

  let runs = Array.from(runsStore.values());

  if (filters?.scenario_id) {
    runs = runs.filter((r) => r.scenario_id === filters.scenario_id);
  }
  if (filters?.status) {
    runs = runs.filter((r) => r.status === filters.status);
  }
  if (filters?.verdict) {
    runs = runs.filter((r) => r.verdict === filters.verdict);
  }

  // Order latest first by creation time
  runs = runs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (typeof filters?.limit === "number" && filters.limit > 0) {
    runs = runs.slice(0, filters.limit);
  }

  return structuredClone(runs);
}

/**
 * Requests cancellation of a run by setting cancel_requested = true.
 * The next poll to getRun will transition the status to cancelled.
 */
export async function cancelRun(id: string): Promise<Run> {
  await delay();

  const run = runsStore.get(id);
  if (!run) {
    throw notFoundError("Run", id);
  }

  run.cancel_requested = true;
  return structuredClone(run);
}

/**
 * Returns latest benchmark results for a scenario.
 */
export async function getBenchmarkLatest(scenarioId: ScenarioId): Promise<Benchmark> {
  await delay();

  const found = mockBenchmarks.find((b) => b.scenario_id === scenarioId);
  if (found) {
    return structuredClone(found);
  }

  // Fallback benchmark for scenarios S3-S6
  return {
    scenario_id: scenarioId,
    methods: [
      {
        method: "AMRS",
        accuracy_mean: 0.852,
        accuracy_std: 0.005,
        ece_mean: 0.038,
        ece_std: 0.004,
        compute_units_mean: 3.5,
        wall_time_s_mean: 32.0,
        seeds: 5,
      },
      {
        method: "Early Stopping",
        accuracy_mean: 0.815,
        accuracy_std: 0.011,
        ece_mean: 0.092,
        ece_std: 0.009,
        compute_units_mean: 20.0,
        wall_time_s_mean: 180.0,
        seeds: 5,
      },
      {
        method: "Regularized Fine-Tuning",
        accuracy_mean: 0.841,
        accuracy_std: 0.008,
        ece_mean: 0.068,
        ece_std: 0.007,
        compute_units_mean: 34.0,
        wall_time_s_mean: 325.0,
        seeds: 5,
      },
      {
        method: "Full Retraining",
        accuracy_mean: 0.861,
        accuracy_std: 0.005,
        ece_mean: 0.049,
        ece_std: 0.005,
        compute_units_mean: 100.0,
        wall_time_s_mean: 985.0,
        seeds: 5,
      },
    ],
  };
}

/**
 * Initiates monitor replay for a scenario.
 */
export async function startMonitorReplay(scenarioId: ScenarioId): Promise<MonitorReplay> {
  await delay();

  const existing = mockMonitorReplays.find((r) => r.scenario_id === scenarioId) ?? mockMonitorReplays[0];
  const replayId = `replay-${scenarioId.toLowerCase()}-${runsStore.size + 1}`;

  const replay: MonitorReplay = {
    ...structuredClone(existing),
    id: replayId,
    scenario_id: scenarioId,
  };

  replayStore.set(replayId, replay);
  return structuredClone(replay);
}

/**
 * Gets a monitor replay by ID.
 */
export async function getMonitorReplay(id: string): Promise<MonitorReplay> {
  await delay();

  const replay = replayStore.get(id) ?? mockMonitorReplays.find((r) => r.id === id);
  if (!replay) {
    throw notFoundError("MonitorReplay", id);
  }

  return structuredClone(replay);
}
