import { delay, notFoundError } from "./client";
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
import {
  createRunApi,
  getRunApi,
  listRunsApi,
  cancelRunApi,
} from "./runs";
import { fetchScenarios } from "./scenarios";
import { getApiHealth } from "./health";
import {
  getLatestBenchmarkApi,
} from "./benchmarks";
import {
  getMonitorReplayApi,
  startMonitorReplayApi,
} from "./monitor";

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
  scenario_id?: ScenarioId;
  architecture?: string;
  arch?: string;
  model_upload_id?: string;
  dataset_upload_id?: string;
  config_override?: Record<string, unknown>;
  seed?: number;
}

export interface ListRunsFilters {
  scenario_id?: ScenarioId;
  status?: RunStatus;
  verdict?: Verdict;
  limit?: number;
}

// In-memory runtime state store for runs created during offline dev
const runsStore = new Map<string, Run>();

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
            cost_units: 0.5,
            delta_primary: 0.082,
            ci_low: 0.065,
            ci_high: 0.098,
            retention: 1.0,
            gate_decision: "accepted",
            gate_reasons: [
              "ECE reduced by 0.082 (target > 0.050)",
              "Zero accuracy loss — predictions order invariant under scalar temperature scaling",
              "Fastest and cheapest recovery strategy (0.5 CU)",
            ],
          },
        ],
        original_metrics: { accuracy: 0.862, ece: 0.142, nll: 0.72 },
        accepted_metrics: { accuracy: 0.862, ece: 0.06, nll: 0.385 },
        compute_units: 0.5,
        artifacts: structuredClone(mockAcceptedRun.artifacts),
      };
    case "S3":
      return {
        verdict: "accepted",
        stage_label: "Completed: recovery candidate accepted",
        diagnosis: [
          {
            label: "bn_drift",
            confidence: 0.91,
            evidence: [
              "Batch normalization running statistics diverged from target distribution",
              "Internal covariate shift observed in layers 3 and 4",
              "Holdout accuracy degraded by 8.1% under covariate perturbation",
            ],
          },
        ],
        candidates: [
          {
            strategy: "bn_recalibration",
            cost_units: 1.2,
            delta_primary: 0.056,
            ci_low: 0.041,
            ci_high: 0.072,
            retention: 0.982,
            gate_decision: "accepted",
            gate_reasons: [
              "BatchNorm running mean and variance successfully adapted",
              "Accuracy restored by +5.6% without updating convolutional weights",
              "Retention 0.982 exceeds required 0.950",
            ],
          },
        ],
        original_metrics: { accuracy: 0.784, ece: 0.118, nll: 0.69 },
        accepted_metrics: { accuracy: 0.84, ece: 0.072, nll: 0.44 },
        compute_units: 1.2,
        artifacts: structuredClone(mockAcceptedRun.artifacts),
      };
    case "S4":
      return {
        verdict: "accepted",
        stage_label: "Completed: recovery candidate accepted",
        diagnosis: [
          {
            label: "unstable_training",
            confidence: 0.89,
            evidence: [
              "Gradient norm spikes detected across training trajectory",
              "Loss landscape exhibits severe oscillations in validation loss",
              "Single checkpoint evaluation exhibits high variance",
            ],
          },
        ],
        candidates: [
          {
            strategy: "weight_interpolation",
            cost_units: 2.0,
            delta_primary: 0.034,
            ci_low: 0.021,
            ci_high: 0.048,
            retention: 0.971,
            gate_decision: "accepted",
            gate_reasons: [
              "Stochastic weight averaging smoothed out loss surface oscillations",
              "Accuracy improved by +3.4% with stabilized variance across splits",
              "Met all statistical non-regression criteria",
            ],
          },
        ],
        original_metrics: { accuracy: 0.798, ece: 0.098, nll: 0.58 },
        accepted_metrics: { accuracy: 0.832, ece: 0.065, nll: 0.41 },
        compute_units: 2.0,
        artifacts: structuredClone(mockAcceptedRun.artifacts),
      };
    case "S5":
      return {
        verdict: mockRolledBackRun.verdict ?? "rolled_back",
        stage_label: "Completed: all candidates rejected — model rolled back",
        diagnosis: structuredClone(mockRolledBackRun.diagnosis),
        candidates: structuredClone(mockRolledBackRun.candidates),
        original_metrics: structuredClone(mockRolledBackRun.original_metrics),
        accepted_metrics: null,
        compute_units: mockRolledBackRun.compute_units,
        artifacts: structuredClone(mockRolledBackRun.artifacts),
      };
    case "S6":
    default:
      return {
        verdict: mockHealthyRun.verdict ?? "healthy_no_action",
        stage_label: "Completed: healthy — no recovery needed",
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
  try {
    const res = await getApiHealth();
    if (res) return res;
  } catch {
    // Fallback
  }
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
  try {
    const items = await fetchScenarios();
    if (items && items.length > 0) return items;
  } catch {
    // Fallback
  }
  return structuredClone(mockScenarios);
}

/**
 * Creates a new recovery run. Delegates to FastAPI backend with fallback.
 */
export async function createRun(input: CreateRunInput): Promise<string> {
  try {
    const res = await createRunApi(input);
    if (res && res.run_id) {
      return res.run_id;
    }
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "status" in err) {
      throw err;
    }
    if (input.model_upload_id) {
      throw new Error(
        "Cannot create recovery run for uploaded model: backend API is unreachable. Please verify the AMRS server is running on port 8000."
      );
    }
    // If backend is completely down and this is an offline benchmark scenario, create simulated fallback run
  }

  // Fallback simulator for offline development
  const activeRun = Array.from(runsStore.values()).find(
    (r) => r.status === "queued" || r.status === "running"
  );
  if (activeRun) {
    throw new Error(`Run '${activeRun.id}' is currently active`);
  }

  const outcome = getScenarioOutcome(input.scenario_id || "S1");
  const runNumber = String(runsStore.size + 1).padStart(3, "0");
  const newId = `run-amrs-${runNumber}`;

  const newRun: Run = {
    id: newId,
    scenario_id: input.scenario_id || "S1",
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
 * Gets a run by ID from the FastAPI backend with offline fallback.
 */
export async function getRun(id: string): Promise<Run> {
  try {
    const liveRun = await getRunApi(id);
    if (liveRun) return liveRun;
  } catch {
    // Fallback to local in-memory run store if backend offline or mock run ID
  }

  await delay(100, 250);
  const run = runsStore.get(id);
  if (!run) {
    throw notFoundError("Run", id);
  }

  if (run.cancel_requested && run.status !== "succeeded" && run.status !== "failed" && run.status !== "cancelled") {
    run.status = "cancelled";
    run.stage_label = "Cancelled";
    run.finished_at = new Date().toISOString();
    return structuredClone(run);
  }

  if (run.status === "queued") {
    run.status = "running";
    run.stage_label = "Diagnosing";
    run.progress = 25;
  } else if (run.status === "running") {
    switch (run.stage_label) {
      case "Diagnosing": {
        const outcome = getScenarioOutcome(run.scenario_id);
        run.diagnosis = outcome.diagnosis;
        run.stage_label = "Selecting Candidates";
        run.progress = 45;
        break;
      }
      case "Selecting Candidates":
        run.stage_label = "Applying Recovery";
        run.progress = 70;
        break;
      case "Applying Recovery":
        run.stage_label = "Verifying";
        run.progress = 90;
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
 * Lists runs from backend or local store.
 */
export async function listRuns(filters?: ListRunsFilters): Promise<Run[]> {
  try {
    const liveList = await listRunsApi({
      scenario_id: filters?.scenario_id,
      verdict: filters?.verdict,
      limit: filters?.limit,
    });
    if (liveList && Array.isArray(liveList.runs)) {
      let filtered = liveList.runs;
      if (filters?.status) filtered = filtered.filter((r) => r.status === filters.status);
      return filtered;
    }
  } catch {
    // Backend offline
  }

  await delay(100, 250);
  let runs = Array.from(runsStore.values());
  if (filters?.scenario_id) runs = runs.filter((r) => r.scenario_id === filters.scenario_id);
  if (filters?.status) runs = runs.filter((r) => r.status === filters.status);
  if (filters?.verdict) runs = runs.filter((r) => r.verdict === filters.verdict);
  runs = runs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  if (typeof filters?.limit === "number" && filters.limit > 0) runs = runs.slice(0, filters.limit);
  return structuredClone(runs);
}

/**
 * Requests cancellation of a run.
 */
export async function cancelRun(id: string): Promise<Run> {
  try {
    await cancelRunApi(id);
    return await getRun(id);
  } catch {
    // Fallback
  }

  await delay(100, 200);
  const run = runsStore.get(id);
  if (!run) throw notFoundError("Run", id);
  run.cancel_requested = true;
  return structuredClone(run);
}

/**
 * Returns latest benchmark results for a scenario.
 */
export async function getBenchmarkLatest(scenarioId: ScenarioId): Promise<Benchmark> {
  try {
    const b = await getLatestBenchmarkApi();
    if (b && b.scenario_id) return b;
  } catch {
    // Fallback
  }
  const found = mockBenchmarks.find((b) => b.scenario_id === scenarioId);
  if (found) return structuredClone(found);
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
  try {
    const res = await startMonitorReplayApi({ scenario_id: `s${scenarioId.slice(-1)}_overfit`.toLowerCase() });
    if (res && res.replay_id) {
      const live = await getMonitorReplayApi(res.replay_id);
      if (live) return live;
    }
  } catch {
    // Fallback
  }

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
  try {
    const live = await getMonitorReplayApi(id);
    if (live) return live;
  } catch {
    // Fallback
  }
  const replay = replayStore.get(id) ?? mockMonitorReplays.find((r) => r.id === id);
  if (!replay) throw notFoundError("MonitorReplay", id);
  return structuredClone(replay);
}
