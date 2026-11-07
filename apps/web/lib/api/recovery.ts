/**
 * API functions for the recovery pages.
 * All data comes from mock — no fetch, no compute.
 * 300–800 ms simulated delay per call.
 */
import { delay, notFoundError } from "./client";
import type { ScenarioId } from "./types";
import type { HistoryRun, BenchmarkExt, MonitorThresholds, ConfigPreview } from "@/lib/schemas/recovery";
import {
  mockHistoryRuns,
  mockBenchmarkExts,
  mockMonitorThresholds,
  mockConfigPreviews,
} from "@/lib/mock/recovery";

export type { HistoryRun, BenchmarkExt, MonitorThresholds, ConfigPreview };

// ─── Config preview ───────────────────────────────────────────────────────────

/**
 * Returns the configuration preview (strategy order, budget, acceptance policy)
 * for a given scenario.
 */
export async function getConfigPreview(scenarioId: ScenarioId): Promise<ConfigPreview> {
  await delay();
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
 * Returns all 31 history runs, filtered and sorted newest-first.
 */
export async function listHistoryRuns(
  filters?: ListHistoryFilters
): Promise<HistoryRun[]> {
  await delay();

  let runs = [...mockHistoryRuns];

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

  // Sort newest first
  runs.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return structuredClone(runs);
}

// ─── Extended benchmark data ──────────────────────────────────────────────────

/**
 * Returns the extended benchmark comparison (with KPI strip and retention)
 * for a given scenario (S1–S5).
 */
export async function getBenchmarkExt(scenarioId: ScenarioId): Promise<BenchmarkExt> {
  await delay();

  const found = mockBenchmarkExts.find((b) => b.scenario_id === scenarioId);
  if (found) {
    return structuredClone(found);
  }

  // Fallback for any unlisted scenario
  return structuredClone(mockBenchmarkExts[0]);
}

// ─── Monitor thresholds ───────────────────────────────────────────────────────

/**
 * Returns the AMRS monitor thresholds (patience, smoothing window, etc.).
 */
export async function getMonitorThresholds(): Promise<MonitorThresholds> {
  await delay();
  return structuredClone(mockMonitorThresholds);
}
