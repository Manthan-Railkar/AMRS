"use client";

import { useApiHealth } from "@/hooks/use-api-health";
import type { HealthStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface ApiStatusPillProps {
  className?: string;
}

const statusConfig: Record<
  HealthStatus,
  { label: string; dotClass: string; ariaLabel: string }
> = {
  online: {
    label: "Online",
    dotClass: "bg-verdict-accepted",
    ariaLabel: "API Status: Online",
  },
  degraded: {
    label: "Degraded",
    dotClass: "bg-verdict-rolled-back",
    ariaLabel: "API Status: Degraded",
  },
  offline: {
    label: "Offline",
    dotClass: "bg-verdict-error",
    ariaLabel: "API Status: Offline",
  },
};

export function ApiStatusPill({ className }: ApiStatusPillProps) {
  const { data, isError } = useApiHealth();

  const status: HealthStatus = isError
    ? "offline"
    : (data?.status ?? "online");

  const current = statusConfig[status] ?? statusConfig.offline;

  return (
    <div
      role="status"
      aria-label={current.ariaLabel}
      title={data?.version ? `AMRS API v${data.version} (${current.label})` : current.ariaLabel}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground bg-secondary/60 shadow-xs transition-colors",
        className
      )}
    >
      <span
        className={cn("size-2 rounded-full shrink-0", current.dotClass)}
        aria-hidden="true"
      />
      <span>{current.label}</span>
    </div>
  );
}
