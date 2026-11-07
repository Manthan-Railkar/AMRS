"use client";

import { useQuery } from "@tanstack/react-query";

export interface RunStatusResponse {
  run_id: string;
  status: string;
  progress_stage: string;
  progress_pct: number;
  verdict: string | null;
  accepted_strategy: string | null;
}

export function useRunStatus(runId: string | null) {
  return useQuery<RunStatusResponse>({
    queryKey: ["runs", runId],
    queryFn: async () => {
      if (!runId) throw new Error("No runId provided");
      const res = await fetch(`/api/v1/runs/${runId}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return res.json();
    },
    enabled: !!runId,
    refetchInterval: (query: any) => {
      const data = query.state.data;
      if (data && ["succeeded", "failed", "cancelled"].includes(data.status)) {
        return false;
      }
      return 1000;
    },
  });
}

