"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { KpiCards, KpiCardsSkeleton } from "@/components/dashboard/kpi-cards";
import { RecentModelsTable } from "@/components/dashboard/recent-models-table";
import { RunsOverTimeChart } from "@/components/charts/runs-over-time-chart";
import { DiagnosisBreakdownChart } from "@/components/charts/diagnosis-breakdown-chart";
import { StrategySuccessChart } from "@/components/charts/strategy-success-chart";
import { ComputeComparisonChart } from "@/components/charts/compute-comparison-chart";
import { ErrorState } from "@/components/status/error-state";
import { getDashboardStats, getRecentModels } from "@/lib/api/dashboard";

export function DashboardContent() {
  const statsQuery = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: getDashboardStats,
  });

  const modelsQuery = useQuery({
    queryKey: ["dashboard", "recentModels"],
    queryFn: getRecentModels,
  });

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of uploaded models, recovery outcomes, and system performance.
          </p>
        </div>
        <LinkButton
          href="/runs/new"
          variant="default"
          size="default"
          className="shrink-0 gap-1.5"
        >
          <Plus className="size-4" aria-hidden="true" />
          Start new recovery
        </LinkButton>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <section aria-label="Summary statistics">
        {statsQuery.isLoading ? (
          <KpiCardsSkeleton />
        ) : statsQuery.error ? (
          <ErrorState
            title="Failed to load statistics"
            error={statsQuery.error as Error}
            onRetry={() => void statsQuery.refetch()}
          />
        ) : statsQuery.data ? (
          <KpiCards stats={statsQuery.data} />
        ) : null}
      </section>

      {/* ── Charts ─────────────────────────────────────────────────────── */}
      <section
        aria-label="Analytics charts"
        className="grid grid-cols-1 gap-6 md:grid-cols-2"
      >
        <RunsOverTimeChart
          data={statsQuery.data?.runsOverTime}
          isLoading={statsQuery.isLoading}
          error={statsQuery.error as Error | null}
          onRetry={() => void statsQuery.refetch()}
        />
        <DiagnosisBreakdownChart
          data={statsQuery.data?.diagnosisCounts}
          isLoading={statsQuery.isLoading}
          error={statsQuery.error as Error | null}
          onRetry={() => void statsQuery.refetch()}
        />
        <StrategySuccessChart
          data={statsQuery.data?.strategyStats}
          isLoading={statsQuery.isLoading}
          error={statsQuery.error as Error | null}
          onRetry={() => void statsQuery.refetch()}
        />
        <ComputeComparisonChart
          data={statsQuery.data?.runsOverTime}
          isLoading={statsQuery.isLoading}
          error={statsQuery.error as Error | null}
          onRetry={() => void statsQuery.refetch()}
        />
      </section>

      {/* ── Recent Models Table ─────────────────────────────────────────── */}
      <section aria-label="Recent models">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              Recent Models
            </h2>
            <p className="text-sm text-muted-foreground">
              The 8 most recently uploaded models and their recovery outcomes.
            </p>
          </div>
        </div>
        <RecentModelsTable
          data={modelsQuery.data}
          isLoading={modelsQuery.isLoading}
          error={modelsQuery.error as Error | null}
          onRetry={() => void modelsQuery.refetch()}
        />
      </section>
    </div>
  );
}
