/**
 * Stable, scoped TanStack Query keys according to Section 4.6.5 of plan.md
 */
export const queryKeys = {
  health: ["health"] as const,
  defaults: ["defaults"] as const,
  scenarios: ["scenarios"] as const,
  runs: (filters?: unknown) => (filters ? (["runs", filters] as const) : (["runs"] as const)),
  run: (runId: string | null | undefined) => ["run", runId] as const,
  monitorReplay: (replayId: string | null | undefined) => ["monitor-replay", replayId] as const,
  benchmark: (benchmarkId: string | null | undefined) => ["benchmark", benchmarkId] as const,
  benchmarkLatest: ["benchmark", "latest"] as const,
};

