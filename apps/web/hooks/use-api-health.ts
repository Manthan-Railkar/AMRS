"use client";

import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/lib/api";
import type { Health } from "@/lib/api/types";

export function useApiHealth() {
  return useQuery<Health>({
    queryKey: ["health"],
    queryFn: () => getHealth(),
    refetchInterval: 15000,
  });
}
