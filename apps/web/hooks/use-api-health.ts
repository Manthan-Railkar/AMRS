"use client";

import { useQuery } from "@tanstack/react-query";

export interface HealthResponse {
  status: string;
  uptime_s: number;
  active_jobs: number;
  device: string;
}

export function useApiHealth() {
  return useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch("/api/v1/health");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return res.json();
    },
    refetchInterval: 5000,
  });
}

