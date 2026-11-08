import { apiFetch } from "./client";
import type { MonitorReplay, ScenarioId, MonitorPoint, MonitorEvent } from "./types";
import { mockMonitorReplays } from "@/lib/mock/monitor";

export interface MonitorReplayRequest {
  scenario_id: string;
  speed_multiplier?: number;
}

export interface MonitorReplayStartResponse {
  replay_id: string;
  status: string;
}

export interface BackendMonitorEventItem {
  epoch: number;
  kind: string;
  details?: Record<string, unknown>;
}

export interface BackendMonitorReplayDetail {
  replay_id: string;
  scenario_id: string;
  status: string;
  events?: BackendMonitorEventItem[];
  series?: {
    train_loss?: number[];
    val_loss?: number[];
    train_acc?: number[];
    val_acc?: number[];
  };
}

/**
 * Normalizes backend MonitorReplayDetailResponse into frontend MonitorReplay
 */
export function normalizeBackendMonitorReplay(
  b: BackendMonitorReplayDetail,
  fallbackScenarioId?: ScenarioId
): MonitorReplay {
  const scenarioMatch: ScenarioId = fallbackScenarioId || (b.scenario_id
    ? (b.scenario_id.toUpperCase().slice(0, 2) as ScenarioId)
    : "S1");

  const trainLoss = b.series?.train_loss ?? [];
  const valLoss = b.series?.val_loss ?? [];
  const trainAcc = b.series?.train_acc ?? [];
  const valAcc = b.series?.val_acc ?? [];

  const pointsCount = Math.max(trainLoss.length, valLoss.length, trainAcc.length, valAcc.length);
  const points: MonitorPoint[] = [];

  for (let i = 0; i < pointsCount; i++) {
    points.push({
      epoch: i + 1,
      train_loss: trainLoss[i] ?? 0,
      val_loss: valLoss[i] ?? 0,
      train_acc: trainAcc[i] ?? 0,
      val_acc: valAcc[i] ?? 0,
    });
  }

  const events: MonitorEvent[] = (b.events ?? []).map((e) => ({
    epoch: e.epoch,
    type: (e.kind as MonitorEvent["type"]) || "trigger",
    message: e.details && typeof e.details === "object" && "action" in e.details
      ? `Trigger: action=${e.details.action}`
      : `Event: ${e.kind}`,
  }));

  return {
    id: b.replay_id,
    scenario_id: scenarioMatch,
    status: (b.status === "succeeded" || b.status === "running" || b.status === "queued"
      ? b.status
      : "running") as any,
    points: points.length > 0 ? points : (mockMonitorReplays[0]?.points ?? []),
    events: events.length > 0 ? events : (mockMonitorReplays[0]?.events ?? []),
    followup: mockMonitorReplays[0]?.followup ?? null,
  };
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
  const raw = await apiFetch<BackendMonitorReplayDetail>(`/monitor/replay/${replayId}`);
  return normalizeBackendMonitorReplay(raw);
}
