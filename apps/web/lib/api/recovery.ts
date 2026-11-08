/**
 * API functions for the recovery pages.
 * Integrates with FastAPI backend with fallback to baseline mock datasets.
 */
import { apiFetch, notFoundError } from "./client";
import type { ScenarioId } from "./types";
import type { HistoryRun, BenchmarkExt, MonitorThresholds, ConfigPreview } from "@/lib/schemas/recovery";
import {
  mockHistoryRuns,
  mockBenchmarkExts,
  mockMonitorThresholds,
  mockConfigPreviews,
} from "@/lib/mock/recovery";
import type { ListRunsResponse } from "./runs";

export type { HistoryRun, BenchmarkExt, MonitorThresholds, ConfigPreview };

interface BackendGateDefaults {
  min_gain?: { accuracy?: number; ece?: number };
  min_retention?: number;
}

interface BackendMonitorDefaults {
  patience?: number;
  cooldown_epochs?: number;
  overfit?: { gap_rise_min?: number };
  instability?: { spike_ratio?: number };
}

interface BackendConfigDefaults {
  gate?: BackendGateDefaults;
  monitor?: BackendMonitorDefaults;
}

interface BackendSummaryItem {
  scenario_id: string;
  method: string;
  accuracy_mean: number;
  accuracy_std: number;
  ece_mean: number;
  ece_std: number;
  retention_mean?: number;
  retention_std?: number;
  compute_units_mean: number;
  wall_s_mean: number;
  trials_count?: number;
}

interface BackendBenchmarkResponse {
  summaries?: BackendSummaryItem[];
}

// ─── Config preview ───────────────────────────────────────────────────────────

/**
 * Returns the configuration preview (strategy order, budget, acceptance policy)
 * for a given scenario.
 */
export async function getConfigPreview(scenarioId: ScenarioId): Promise<ConfigPreview> {
  try {
    const defaults = await apiFetch<BackendConfigDefaults>("/config/defaults");
    if (defaults && defaults.gate) {
      const preview = mockConfigPreviews[scenarioId];
      if (preview) {
        return {
          ...preview,
          acceptance_policy: {
            min_accuracy_gain: defaults.gate.min_gain?.accuracy ?? 0.005,
            max_ece: defaults.gate.min_gain?.ece ?? 0.01,
            min_retention: defaults.gate.min_retention ?? 0.95,
          },
        };
      }
    }
  } catch {
    // Fallback to local config preview
  }

  const preview = mockConfigPreviews[scenarioId];
  if (!preview) {
    throw notFoundError("ConfigPreview", scenarioId);
  }
  return structuredClone(preview);
}

// ─── History runs ─────────────────────────────────────────────────────────────

export interface ListHistoryFilters {
  search?: string;
  verdict?: string;
  scenario_id?: string;
  architecture?: string;
}

/**
 * Returns history runs, queried from the real database repository with fallback to mock history.
 */
export async function listHistoryRuns(
  filters?: ListHistoryFilters
): Promise<HistoryRun[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.verdict && filters.verdict !== "all") params.set("verdict", filters.verdict);
    if (filters?.scenario_id && filters.scenario_id !== "all") {
      params.set("scenario_id", `s${filters.scenario_id.slice(-1)}_`.toLowerCase());
    }
    params.set("limit", "100");

    const res = await apiFetch<ListRunsResponse>(`/runs?${params.toString()}`);
    if (res && Array.isArray(res.runs)) {
      let runs = res.runs.map((r) => {
        const scenarioMatch = (r.scenario_id ? (r.scenario_id.toUpperCase().slice(0, 2) as ScenarioId) : "S1");
        const primaryDiag = r.diagnosis && r.diagnosis[0]?.label;
        const diagLabel = primaryDiag || "overfitting";
        return {
          id: r.id,
          model_name: r.scenario_id
            ? `${r.architecture.toLowerCase()}_${r.scenario_id.toLowerCase()}.pt`
            : `${r.architecture.toLowerCase()}_checkpoint.pt`,
          architecture: (r.architecture as HistoryRun["architecture"]) || "resnet18_cifar",
          scenario_id: scenarioMatch,
          diagnosis_label: diagLabel,
          verdict: r.verdict || "accepted",
          accuracy_before: r.original_metrics?.accuracy ?? 0,
          accuracy_after: r.accepted_metrics?.accuracy ?? null,
          compute_units: r.compute_units ?? 0,
          created_at: r.created_at,
        };
      });

      if (filters?.search) {
        const q = filters.search.toLowerCase();
        runs = runs.filter((r) => r.model_name.toLowerCase().includes(q));
      }
      if (filters?.verdict && filters.verdict !== "all") {
        runs = runs.filter((r) => r.verdict === filters.verdict);
      }
      if (filters?.scenario_id && filters.scenario_id !== "all") {
        runs = runs.filter((r) => r.scenario_id === filters.scenario_id);
      }
      if (filters?.architecture && filters.architecture !== "all") {
        runs = runs.filter((r) => r.architecture === filters.architecture);
      }

      runs.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return runs;
    }
  } catch {
    // If backend is offline or empty, return empty list
  }

  return [];
}

// ─── Extended benchmark data ──────────────────────────────────────────────────

/**
 * Returns the extended benchmark comparison (with KPI strip and retention)
 * for a given scenario (S1–S5).
 */
export async function getBenchmarkExt(scenarioId: ScenarioId): Promise<BenchmarkExt> {
  try {
    const res = await apiFetch<BackendBenchmarkResponse>("/benchmarks/latest");
    if (res && res.summaries && res.summaries.length > 0) {
      const matching = res.summaries.filter((s) =>
        s.scenario_id.toLowerCase().includes(scenarioId.toLowerCase())
      );
      if (matching.length > 0) {
        const methods = matching.map((m) => ({
          method: m.method,
          accuracy_mean: m.accuracy_mean,
          accuracy_std: m.accuracy_std,
          ece_mean: m.ece_mean,
          ece_std: m.ece_std,
          retention_mean: m.retention_mean ?? 0.96,
          retention_std: m.retention_std ?? 0.01,
          compute_units_mean: m.compute_units_mean,
          wall_time_s_mean: m.wall_s_mean,
          seeds: m.trials_count ?? 3,
        }));
        return {
          scenario_id: scenarioId,
          kpi: mockBenchmarkExts[0].kpi,
          methods,
        };
      }
    }
  } catch {
    // Fallback to mock benchmarks
  }

  const found = mockBenchmarkExts.find((b) => b.scenario_id === scenarioId);
  if (found) {
    return structuredClone(found);
  }

  return structuredClone(mockBenchmarkExts[0]);
}

// ─── Monitor thresholds ───────────────────────────────────────────────────────

/**
 * Returns the AMRS monitor thresholds (patience, smoothing window, etc.).
 */
export async function getMonitorThresholds(): Promise<MonitorThresholds> {
  try {
    const defaults = await apiFetch<BackendConfigDefaults>("/config/defaults");
    if (defaults && defaults.monitor) {
      return {
        patience: defaults.monitor.patience ?? 3,
        smoothing_window: 5,
        cooldown_epochs: defaults.monitor.cooldown_epochs ?? 5,
        gap_threshold: defaults.monitor.overfit?.gap_rise_min ?? 0.03,
      };
    }
  } catch {
    // Fallback
  }
  return structuredClone(mockMonitorThresholds);
}
