import { apiFetch } from "./client";
import type { Scenario, ScenarioId } from "./types";
import { mockScenarios } from "@/lib/mock/scenarios";

export interface ScenarioBackendItem {
  scenario_id: string;
  name: string;
  description: string;
  ground_truth_label: string;
  arch: string;
  artifacts_ready: boolean;
}

export interface ScenarioListResponse {
  scenarios: ScenarioBackendItem[];
}

const scenarioMapping: Record<string, { id: ScenarioId; expected_recovery: string }> = {
  s1_overfit: { id: "S1", expected_recovery: "Checkpoint reversion or selective L2-SP fine-tuning" },
  s2_miscalibration: { id: "S2", expected_recovery: "Post-hoc temperature scaling on holdout logits" },
  s3_bn_drift: { id: "S3", expected_recovery: "BatchNorm recalibration across target domain samples" },
  s4_instability: { id: "S4", expected_recovery: "Weight interpolation (SWA / Polyak averaging)" },
  s5_degraded_head: { id: "S5", expected_recovery: "Last-layer retraining on balanced holdout slice" },
  s6_healthy: { id: "S6", expected_recovery: "No recovery action required" },
};

export async function fetchScenarios(): Promise<Scenario[]> {
  try {
    const res = await apiFetch<ScenarioListResponse>("/scenarios");
    if (res && res.scenarios && res.scenarios.length > 0) {
      return res.scenarios.map((s) => {
        const meta = scenarioMapping[s.scenario_id] || {
          id: (s.scenario_id.toUpperCase().split("_")[0] as ScenarioId) || "S1",
          expected_recovery: "Automated recovery strategy",
        };
        return {
          id: meta.id,
          name: s.name,
          failure_mode: s.ground_truth_label,
          description: s.description,
          expected_recovery: meta.expected_recovery,
        };
      });
    }
  } catch {
    // Graceful fallback to mock scenarios when backend is offline
  }
  return mockScenarios;
}
