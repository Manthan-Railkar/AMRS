import { apiFetch } from "./client";
import type { Run, ScenarioId, Verdict, RunStatus } from "./types";
import { mockRuns, mockAcceptedRun, mockRolledBackRun, mockHealthyRun } from "@/lib/mock/runs";

export interface CreateRunInput {
  scenario_id?: ScenarioId;
  architecture?: string;
  model_upload_id?: string;
  config_override?: Record<string, unknown>;
  seed?: number;
}

export interface CreateRunResponse {
  run_id: string;
  status: string;
}

export interface ListRunsFilters {
  scenario_id?: string;
  verdict?: string;
  limit?: number;
  offset?: number;
}

export interface ListRunsResponse {
  runs: Run[];
  total: number;
  limit: number;
  offset: number;
}

export interface CancelRunResponse {
  run_id: string;
  status: string;
  message: string;
}

export async function createRunApi(input: CreateRunInput): Promise<CreateRunResponse> {
  return apiFetch<CreateRunResponse>("/runs", {
    method: "POST",
    body: input,
  });
}

export async function listRunsApi(filters: ListRunsFilters = {}): Promise<ListRunsResponse> {
  const params = new URLSearchParams();
  if (filters.scenario_id) params.set("scenario_id", filters.scenario_id);
  if (filters.verdict) params.set("verdict", filters.verdict);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.offset) params.set("offset", String(filters.offset));

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<ListRunsResponse>(`/runs${query}`);
}

export async function getRunApi(runId: string): Promise<Run> {
  return apiFetch<Run>(`/runs/${runId}`);
}

export async function cancelRunApi(runId: string): Promise<CancelRunResponse> {
  return apiFetch<CancelRunResponse>(`/runs/${runId}/cancel`, {
    method: "POST",
  });
}

export function getArtifactDownloadUrl(runId: string, name: string): string {
  return `/api/v1/runs/${runId}/artifacts/${encodeURIComponent(name)}`;
}

