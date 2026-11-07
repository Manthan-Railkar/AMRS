import type * as React from "react";
import {
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import type { Verdict } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export interface VerdictConfig {
  title: string;
  explanation: string;
  icon: LucideIcon;
  containerClassName: string;
  iconClassName: string;
}

export const VERDICT_CONFIGS: Record<Verdict, VerdictConfig> = {
  accepted: {
    title: "Candidate Accepted",
    explanation:
      "The recovery patch passed all safety checks and validation gates, improving model metrics without regressions.",
    icon: CheckCircle2,
    containerClassName:
      "bg-verdict-accepted-bg text-verdict-accepted-fg border-verdict-accepted/40",
    iconClassName: "text-verdict-accepted",
  },
  rolled_back: {
    title: "Candidate Rolled Back",
    explanation:
      "The recovery patch failed verification criteria. The model was safely restored to its previous checkpoint.",
    icon: RotateCcw,
    containerClassName:
      "bg-verdict-rolled-back-bg text-verdict-rolled-back-fg border-verdict-rolled-back/40",
    iconClassName: "text-verdict-rolled-back",
  },
  healthy_no_action: {
    title: "Healthy — No Action Taken",
    explanation:
      "All diagnostic health signals remained within nominal bounds. No recovery intervention was required.",
    icon: ShieldCheck,
    containerClassName:
      "bg-verdict-healthy-bg text-verdict-healthy-fg border-verdict-healthy/40",
    iconClassName: "text-verdict-healthy",
  },
  error: {
    title: "Diagnosis or Recovery Error",
    explanation:
      "An unrecoverable system error occurred during diagnosis or candidate generation. Manual review required.",
    icon: AlertTriangle,
    containerClassName:
      "bg-verdict-error-bg text-verdict-error-fg border-verdict-error/40",
    iconClassName: "text-verdict-error",
  },
};

export interface VerdictBannerProps {
  verdict: Verdict;
  title?: string;
  explanation?: string;
  description?: string;
  className?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function VerdictBanner({
  verdict,
  title,
  explanation,
  description,
  className,
  icon,
  action,
  children,
}: VerdictBannerProps) {
  const config = VERDICT_CONFIGS[verdict] ?? VERDICT_CONFIGS.error;
  const Icon = icon ?? config.icon;
  const displayTitle = title ?? config.title;
  const displayExplanation = explanation ?? description ?? config.explanation;

  return (
    <div
      role="status"
      aria-label={`Verdict: ${displayTitle}`}
      className={cn(
        "flex items-start gap-3.5 rounded-xl border p-4 text-sm shadow-xs transition-colors",
        config.containerClassName,
        className
      )}
    >
      <div className="mt-0.5 shrink-0">
        <Icon className={cn("size-5", config.iconClassName)} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-semibold text-sm leading-snug">
          {displayTitle}
        </h4>
        {displayExplanation && (
          <p className="mt-1 text-xs leading-relaxed opacity-90 sm:text-sm">
            {displayExplanation}
          </p>
        )}
        {children && <div className="mt-3">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
