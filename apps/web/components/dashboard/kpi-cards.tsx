"use client";

import * as React from "react";
import {
  Upload,
  RefreshCcw,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Gauge,
  Zap,
  ArrowUp,
  ArrowDown,
  Info,
  type LucideIcon,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipTrigger, Tooltip } from "@/components/ui/tooltip";
import type { DashboardStats } from "@/lib/schemas/dashboard";
import { formatPercent, formatPp, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface KpiCardData {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  subtext?: string;
  tooltipText: string;
}

// ─── Build KPI list from stats ──────────────────────────────────────────────

function buildKpiCards(stats: DashboardStats): KpiCardData[] {
  return [
    {
      icon: Upload,
      label: "Models Uploaded",
      value: formatCompact(stats.modelsUploaded),
      delta: `+${stats.modelsUploadedDeltaWeek} this week`,
      deltaPositive: true,
      tooltipText:
        "Total number of model checkpoints submitted to AMRS for diagnosis and recovery.",
    },
    {
      icon: RefreshCcw,
      label: "Recovery Runs",
      value: formatCompact(stats.recoveryRuns),
      subtext: "Total runs attempted",
      tooltipText:
        "Total number of automated recovery pipelines executed, including diagnosis, strategy trials, and gate verification.",
    },
    {
      icon: CheckCircle2,
      label: "Accepted Rate",
      value: formatPercent(stats.acceptedRate),
      subtext: `${stats.acceptedCount} of ${stats.recoveryRuns} runs accepted`,
      tooltipText:
        "Fraction of runs where the best recovery candidate passed all verification gate checks and was deployed.",
    },
    {
      icon: RotateCcw,
      label: "Rolled Back",
      value: `${stats.rolledBackCount} runs`,
      subtext: `${formatPercent(stats.rolledBackRate)} — original model kept`,
      tooltipText:
        "Runs where every recovery candidate failed the gate. The model was safely restored to its pre-recovery checkpoint.",
    },
    {
      icon: ShieldCheck,
      label: "Healthy, No Action",
      value: `${stats.healthyCount} runs`,
      subtext: `${formatPercent(stats.healthyRate)} of total runs`,
      tooltipText:
        "Runs where the diagnostic phase found all health signals within nominal bounds — no recovery intervention was required.",
    },
    {
      icon: TrendingUp,
      label: "Avg Accuracy Gain",
      value: formatPp(stats.avgAccuracyGainPp),
      subtext: "On accepted runs",
      deltaPositive: true,
      tooltipText:
        "Average improvement in top-1 accuracy (in percentage points) for runs where a recovery candidate was accepted by the gate.",
    },
    {
      icon: Gauge,
      label: "Avg ECE Reduction",
      value: formatPercent(stats.avgEceReductionRate),
      subtext: "Calibration error ↓ on accepted runs",
      deltaPositive: true,
      tooltipText:
        "Average reduction in Expected Calibration Error (ECE) for accepted runs — a lower ECE means better-calibrated confidence scores.",
    },
    {
      icon: Zap,
      label: "Compute Saved",
      value: formatPercent(stats.computeSavedRate),
      subtext: "vs. full retraining (compute units)",
      deltaPositive: true,
      tooltipText:
        "Fraction of compute units saved by AMRS's cheapest-first recovery strategy relative to running a full retrain from scratch.",
    },
  ];
}

// ─── Single KPI card ────────────────────────────────────────────────────────

function KpiCard({ card }: { card: KpiCardData }) {
  const Icon = card.icon;
  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <CardTitle className="text-sm font-medium text-muted-foreground leading-snug">
              {card.label}
            </CardTitle>
          </div>
          <TooltipTrigger>
            <button
              className="mt-0.5 rounded-sm text-muted-foreground/60 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Info: ${card.label}`}
            >
              <Info className="size-3.5" aria-hidden="true" />
            </button>
            <Tooltip placement="top">{card.tooltipText}</Tooltip>
          </TooltipTrigger>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-3xl font-bold tracking-tight text-foreground">
          {card.value}
        </p>
        {card.delta && (
          <span
            className={cn(
              "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
              card.deltaPositive
                ? "bg-verdict-accepted-bg text-verdict-accepted-fg"
                : "bg-verdict-error-bg text-verdict-error-fg"
            )}
            aria-label={`Change: ${card.delta}`}
          >
            {card.deltaPositive ? (
              <ArrowUp className="size-3 shrink-0" aria-hidden="true" />
            ) : (
              <ArrowDown className="size-3 shrink-0" aria-hidden="true" />
            )}
            {card.delta}
          </span>
        )}
        {!card.delta && card.subtext && (
          <p className="mt-1 text-xs text-muted-foreground">{card.subtext}</p>
        )}
        {card.delta && card.subtext && (
          <p className="mt-0.5 text-xs text-muted-foreground">{card.subtext}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── KPI skeleton ───────────────────────────────────────────────────────────

export function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-1">
            <div className="flex items-center gap-2">
              <Skeleton className="size-9 shrink-0 rounded-xl" />
              <Skeleton className="h-4 w-28" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <Skeleton className="h-8 w-24 mt-1" />
            <Skeleton className="h-3.5 w-24 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── KPI cards grid ─────────────────────────────────────────────────────────

interface KpiCardsProps {
  stats: DashboardStats;
  className?: string;
}

export function KpiCards({ stats, className }: KpiCardsProps) {
  const cards = buildKpiCards(stats);
  return (
    <section
      aria-label="Key performance indicators"
      className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}
    >
      {cards.map((card) => (
        <KpiCard key={card.label} card={card} />
      ))}
    </section>
  );
}
