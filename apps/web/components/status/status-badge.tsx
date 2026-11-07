import type * as React from "react";
import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
  type LucideIcon,
} from "lucide-react";
import type { RunStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export interface RunStatusConfig {
  label: string;
  icon: LucideIcon;
  className: string;
  iconClassName?: string;
}

export const RUN_STATUS_CONFIGS: Record<RunStatus, RunStatusConfig> = {
  queued: {
    label: "Queued",
    icon: Clock,
    className:
      "bg-secondary text-secondary-foreground border-border",
    iconClassName: "text-muted-foreground",
  },
  running: {
    label: "Running",
    icon: Loader2,
    className:
      "bg-primary/10 text-primary border-primary/20",
    iconClassName: "text-primary animate-spin motion-reduce:animate-none",
  },
  succeeded: {
    label: "Succeeded",
    icon: CheckCircle2,
    className:
      "bg-verdict-accepted-bg text-verdict-accepted-fg border-verdict-accepted/30",
    iconClassName: "text-verdict-accepted",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className:
      "bg-verdict-error-bg text-verdict-error-fg border-verdict-error/30",
    iconClassName: "text-verdict-error",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    className:
      "bg-muted text-muted-foreground border-border",
    iconClassName: "text-muted-foreground",
  },
};

export interface StatusBadgeProps {
  status: RunStatus;
  label?: string;
  size?: "sm" | "default";
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({
  status,
  label,
  size = "default",
  className,
  showIcon = true,
}: StatusBadgeProps) {
  const config = RUN_STATUS_CONFIGS[status] ?? RUN_STATUS_CONFIGS.queued;
  const Icon = config.icon;
  const displayLabel = label ?? config.label;

  return (
    <span
      role="status"
      aria-label={`Run status: ${displayLabel}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap transition-colors",
        size === "sm"
          ? "px-2 py-0.5 text-[0.7rem] leading-none"
          : "px-2.5 py-1 text-xs",
        config.className,
        className
      )}
    >
      {showIcon && (
        <Icon
          className={cn(
            size === "sm" ? "size-3" : "size-3.5",
            "shrink-0",
            config.iconClassName
          )}
          aria-hidden="true"
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
}
