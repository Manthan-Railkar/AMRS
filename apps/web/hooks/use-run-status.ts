"use client";

import { useQuery } from "@tanstack/react-query";
import { getRun } from "@/lib/api";
import type { Run } from "@/lib/api/types";

const TERMINAL_STATUSES: readonly string[] = ["succeeded", "failed", "cancelled"];

export function useRunStatus(runId: string | null | undefined) {
  return useQuery<Run>({
    queryKey: ["run", runId],
    queryFn: () => {
      if (!runId) {
        throw new Error("runId is required to fetch run status");
      }
      return getRun(runId);
    },
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const run = query.state.data;
      if (!run) {
        return 1500;
      }
      if (TERMINAL_STATUSES.includes(run.status)) {
        return false;
      }
      return 1500;
    },
  });
}
