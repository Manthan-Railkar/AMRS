"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { TableSkeleton } from "@/components/status/skeletons";
import { ErrorState } from "@/components/status/error-state";
import { EmptyState } from "@/components/status/empty-state";
import { LinkButton } from "@/components/ui/button";
import { formatUtcDate, formatAccuracy } from "@/lib/format";
import type { UploadedModel } from "@/lib/schemas/dashboard";
import type { Verdict } from "@/lib/api/types";
import { cn } from "@/lib/utils";

// ─── Verdict badge ──────────────────────────────────────────────────────────

interface VerdictCfg {
  label: string;
  Icon: React.ElementType;
  /** Tailwind classes using CSS-variable tokens, no hardcoded colours */
  cls: string;
}

const VERDICT_CFG: Record<Verdict, VerdictCfg> = {
  accepted: {
    label: "Accepted",
    Icon: CheckCircle2,
    cls: "bg-[var(--verdict-accepted-bg)] text-[var(--verdict-accepted-fg)] border-[color-mix(in_oklch,var(--verdict-accepted),transparent_60%)]",
  },
  rolled_back: {
    label: "Rolled Back",
    Icon: RotateCcw,
    cls: "bg-[var(--verdict-rolled-back-bg)] text-[var(--verdict-rolled-back-fg)] border-[color-mix(in_oklch,var(--verdict-rolled-back),transparent_60%)]",
  },
  healthy_no_action: {
    label: "Healthy",
    Icon: ShieldCheck,
    cls: "bg-[var(--verdict-healthy-bg)] text-[var(--verdict-healthy-fg)] border-[color-mix(in_oklch,var(--verdict-healthy),transparent_60%)]",
  },
  error: {
    label: "Error",
    Icon: AlertTriangle,
    cls: "bg-[var(--verdict-error-bg)] text-[var(--verdict-error-fg)] border-[color-mix(in_oklch,var(--verdict-error),transparent_60%)]",
  },
};

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const cfg = VERDICT_CFG[verdict] ?? VERDICT_CFG.error;
  const { Icon } = cfg;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        cfg.cls
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

// ─── Architecture label ─────────────────────────────────────────────────────

const ARCH_LABELS: Record<string, string> = {
  mlp_small:      "MLP Small",
  small_cnn:      "Small CNN",
  resnet18_cifar: "ResNet-18 CIFAR",
};

// ─── Column definitions (7 visible + 1 sr-only "View" column = 7 th) ───────

const COLS = [
  "Model Name",
  "Architecture",
  "Scenario",
  "Diagnosis",
  "Verdict",
  "Accuracy",
  "Uploaded",
] as const;

// ─── Component ──────────────────────────────────────────────────────────────

interface RecentModelsTableProps {
  data: UploadedModel[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  className?: string;
}

export function RecentModelsTable({
  data,
  isLoading,
  error,
  onRetry,
  className,
}: RecentModelsTableProps) {
  // ── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return <TableSkeleton rows={8} cols={7} className={className} />;
  }

  // ── Error ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <ErrorState
        title="Failed to load recent models"
        error={error}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No models uploaded yet"
        description="Upload your first model checkpoint to start a recovery run."
        className={className}
        action={
          <LinkButton href="/runs/new" variant="default" size="sm">
            Start new recovery
          </LinkButton>
        }
      />
    );
  }

  // ── Table ──────────────────────────────────────────────────────────────
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border bg-card", className)}>
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b border-border bg-muted/50">
          <tr>
            {COLS.map((col) => (
              <th
                key={col}
                scope="col"
                className="h-10 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {data.map((model) => (
            <tr
              key={model.id}
              className="border-b border-border transition-colors hover:bg-primary/5"
            >
              {/* Model Name — link to run */}
              <td className="px-3 py-2 align-middle whitespace-nowrap font-medium">
                <Link
                  href={`/runs/${model.runId}`}
                  className="text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  {model.name}
                </Link>
              </td>

              {/* Architecture */}
              <td className="px-3 py-2 align-middle whitespace-nowrap text-muted-foreground">
                {ARCH_LABELS[model.architecture] ?? model.architecture}
              </td>

              {/* Scenario */}
              <td className="px-3 py-2 align-middle whitespace-nowrap">
                {model.scenarioId}
              </td>

              {/* Diagnosis */}
              <td className="px-3 py-2 align-middle whitespace-nowrap capitalize text-muted-foreground">
                {model.diagnosisLabel.replace(/_/g, " ")}
              </td>

              {/* Verdict */}
              <td className="px-3 py-2 align-middle whitespace-nowrap">
                <VerdictBadge verdict={model.verdict} />
              </td>

              {/* Accuracy before → after */}
              <td className="px-3 py-2 align-middle whitespace-nowrap tabular-nums">
                {formatAccuracy(model.accuracyBefore)}
                {" → "}
                {model.accuracyAfter !== null
                  ? formatAccuracy(model.accuracyAfter)
                  : "—"}
              </td>

              {/* Uploaded date (UTC, fixed locale) */}
              <td className="px-3 py-2 align-middle whitespace-nowrap text-muted-foreground tabular-nums">
                {formatUtcDate(model.uploadedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
