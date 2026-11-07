import { apiFetch } from "./client";
import type { MonitorReplay, ScenarioId } from "./types";
import { mockMonitorReplays } from "@/lib/mock/monitor";

export interface MonitorReplayRequest {
  scenario_id: string;
  speed_multiplier?: number;
}

export interface MonitorReplayStartResponse {
  replay_id: string;
  status: string;
}

export async function startMonitorReplayApi(
  req: MonitorReplayRequest
): Promise<MonitorReplayStartResponse> {
  return apiFetch<MonitorReplayStartResponse>("/monitor/replay", {
    method: "POST",
    body: req,
  });
}

export async function getMonitorReplayApi(
  replayId: string
): Promise<MonitorReplay> {
  return apiFetch<MonitorReplay>(`/monitor/replay/${replayId}`);
}

