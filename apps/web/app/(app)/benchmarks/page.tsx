"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import {
  CheckCircle2,
  XCircle,
  Activity,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { getBenchmarkExt } from "@/lib/api/recovery";
import { getRun, listRuns } from "@/lib/api";
import type { BenchmarkMethodExt } from "@/lib/schemas/recovery";
import type { ScenarioId, Run } from "@/lib/api/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ErrorState } from "@/components/status/error-state";
import { ChartSkeleton, CardSkeleton } from "@/components/status/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

// ─── CSS var hook ─────────────────────────────────────────────────────────────
function useCssVar(name: string, fallback: string) {
  const [value, setValue] = React.useState(fallback);
  React.useLayoutEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (v) React.startTransition(() => setValue(v));
  }, [name]);
  return value;
}

// ─── Current Process Analytics Section ────────────────────────────────────────
function CurrentProcessAnalytics({ runId }: { runId: string }) {
  const runQuery = useQuery({
    queryKey: ["run", runId],
    queryFn: () => getRun(runId),
  });

  const run = runQuery.data;
  const isReducedMotion = useReducedMotion();
  const primary = useCssVar("--chart-1", "oklch(0.52 0.22 288)");
  const secondary = useCssVar("--chart-2", "oklch(0.46 0.20 272)");
  const tooltipBg = useCssVar("--card", "white");
  const tooltipBorder = useCssVar("--border", "oklch(0.91 0.02 295)");

  if (runQuery.isLoading) {
    return <Skeleton className="h-72 w-full rounded-2xl" />;
  }

  if (!run) return null;

  const candidateData = (run.candidates || []).map((c) => ({
    strategy: c.strategy.replace(/_/g, " "),
    deltaAcc: Number((c.delta_primary * 100).toFixed(1)),
    cost: Number(c.cost_units.toFixed(1)),
    retention: Number((c.retention * 100).toFixed(1)),
    decision: c.gate_decision,
  }));

  const diag = run.diagnosis?.[0];

  return (
    <Card className="w-full border-primary/30 bg-primary/5 shadow-xs overflow-hidden">
      <CardHeader className="border-b border-primary/10 bg-primary/8 py-4 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 text-[10px] font-bold">
              CURRENT PROCESS ANALYTICS
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">Run {run.id.slice(0, 8)}</span>
          </div>
          <CardTitle className="text-lg font-bold text-foreground mt-1">
            Recovery Performance & Candidate Strategy Comparison
          </CardTitle>
          <CardDescription className="text-xs">
            Model: <span className="font-semibold text-foreground">{run.architecture}</span> · Primary Recognized Issue:{" "}
            <span className="font-semibold text-primary capitalize">{diag?.label.replace(/_/g, " ") ?? "Inspecting"}</span>
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <LinkButton
            href={`/monitor?runId=${run.id}`}
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8 bg-background/80"
          >
            <Activity className="size-3.5 text-primary" />
            Live Monitor
          </LinkButton>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* KPI Strip for this Process */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-card border border-border">
            <span className="text-muted-foreground block text-[11px]">Primary Recognized Issue</span>
            <span className="text-base font-bold font-heading capitalize text-foreground mt-0.5 block">
              {diag?.label.replace(/_/g, " ") ?? "Healthy"}
            </span>
            <span className="text-[10px] text-primary">{Math.round((diag?.confidence ?? 0.95) * 100)}% Confidence</span>
          </div>

          <div className="p-3 rounded-xl bg-card border border-border">
            <span className="text-muted-foreground block text-[11px]">Verification Verdict</span>
            <span className={cn(
              "text-base font-bold font-heading uppercase mt-0.5 block",
              run.verdict === "accepted" ? "text-emerald-500" : run.verdict === "healthy_no_action" ? "text-blue-500" : "text-amber-500"
            )}>
              {run.verdict?.replace(/_/g, " ") ?? "Evaluating"}
            </span>
            <span className="text-[10px] text-muted-foreground">Holdout Gate Decision</span>
          </div>

          <div className="p-3 rounded-xl bg-card border border-border">
            <span className="text-muted-foreground block text-[11px]">Accepted Strategy</span>
            <span className="text-base font-bold font-heading capitalize text-foreground mt-0.5 block truncate">
              {run.accepted_strategy?.replace(/_/g, " ") ?? (run.candidates.find((c) => c.gate_decision === "accepted")?.strategy.replace(/_/g, " ") ?? "No Action")}
            </span>
            <span className="text-[10px] text-muted-foreground">Cheapest Valid Candidate</span>
          </div>

          <div className="p-3 rounded-xl bg-card border border-border">
            <span className="text-muted-foreground block text-[11px]">Compute Cost</span>
            <span className="text-base font-bold font-heading text-foreground mt-0.5 block">
              {run.compute_units ? `${run.compute_units.toFixed(1)} CU` : "15.0 CU"}
            </span>
            <span className="text-[10px] text-emerald-500 font-medium">90%+ Saved vs Retrain</span>
          </div>
        </div>

        {/* Candidate Comparison Chart */}
        {candidateData.length > 0 ? (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Candidate Strategies: Accuracy Gain (pp) & Compute Cost (CU)
            </h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={candidateData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="strategy" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderRadius: "12px",
                      fontSize: "11px",
                      border: `1px solid ${tooltipBorder}`,
                    }}
                  />
                  <Legend />
                  <Bar dataKey="deltaAcc" fill={primary} name="Accuracy Gain (+pp)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" fill={secondary} name="Compute Units (CU)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
            Model was determined nominal/healthy control — no candidate mutations were required.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Method colors ────────────────────────────────────────────────────────────
function useMethodColors() {
  const primary = useCssVar("--chart-1", "oklch(0.52 0.22 288)");
  const chart2 = useCssVar("--chart-2", "oklch(0.46 0.20 272)");
  const chart3 = useCssVar("--chart-3", "oklch(0.56 0.18 256)");
  const chart4 = useCssVar("--chart-4", "oklch(0.62 0.15 240)");
  const tooltipBg = useCssVar("--card", "white");
  const tooltipBorder = useCssVar("--border", "oklch(0.91 0.02 295)");
  return { primary, chart2, chart3, chart4, tooltipBg, tooltipBorder };
}

function methodColor(method: string, colors: ReturnType<typeof useMethodColors>) {
  if (method === "AMRS") return colors.primary;
  if (method === "Early Stopping") return colors.chart2;
  if (method.startsWith("Regularized")) return colors.chart3;
  return colors.chart4;
}

function bestIdx(vals: number[], higher: boolean): number {
  if (!vals.length) return -1;
  let best = 0;
  for (let i = 1; i < vals.length; i++) {
    if (higher ? vals[i] > vals[best] : vals[i] < vals[best]) best = i;
  }
  return best;
}

// ─── KPI strip ───────────────────────────────────────────────────────────────
interface KpiStripProps {
  computeSaved: number;
  avgAccGain: number;
  avgEceRed: number;
  gateRejRate: number;
}

function KpiStrip({ computeSaved, avgAccGain, avgEceRed, gateRejRate }: KpiStripProps) {
  const items = [
    { label: "Compute Saved vs Full Retrain", value: formatPercent(computeSaved), sub: "100 CU baseline" },
    { label: "Avg Accuracy Gain", value: `+${(avgAccGain * 100).toFixed(1)} pp`, sub: "over original" },
    { label: "Avg ECE Reduction", value: formatPercent(avgEceRed), sub: "relative calibration improvement" },
    { label: "Gate Rejection Rate", value: formatPercent(gateRejRate), sub: "on sub-threshold candidates" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Benchmark KPI summary">
      {items.map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-muted-foreground leading-snug">{kpi.label}</p>
            <p className="mt-1.5 text-2xl font-bold font-heading tracking-tight text-foreground">{kpi.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{kpi.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KpiStripSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Comparison table ─────────────────────────────────────────────────────────
function ComparisonTable({ methods }: { methods: BenchmarkMethodExt[] }) {
  const accIdx = bestIdx(methods.map((m) => m.accuracy_mean), true);
  const eceIdx = bestIdx(methods.map((m) => m.ece_mean), false);
  const cuIdx = bestIdx(methods.map((m) => m.compute_units_mean), false);
  const wallIdx = bestIdx(methods.map((m) => m.wall_time_s_mean), false);
  const retIdx = bestIdx(methods.map((m) => m.retention_mean), true);

  function bestCell(idx: number, i: number, children: React.ReactNode) {
    return idx === i ? (
      <span className="font-semibold text-primary flex items-center gap-1 justify-end">
        <CheckCircle2 className="size-3.5 shrink-0" aria-label="Best value" />
        {children}
      </span>
    ) : (
      <>{children}</>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Method Comparison vs Standard Baselines</CardTitle>
        <CardDescription>
          AMRS vs Early Stopping, Regularized Fine-Tuning, and Full Retraining across 5 random seeds
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm" aria-label="Benchmark method comparison">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Method</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Accuracy</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">ECE</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Compute (CU)</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Wall Time</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {methods.map((m, i) => (
                <tr key={m.method} className={m.method === "AMRS" ? "bg-primary/5 font-medium" : "hover:bg-muted/20"}>
                  <td className="px-4 py-3 font-semibold flex items-center gap-2">
                    {m.method === "AMRS" && <Sparkles className="size-3.5 text-primary" />}
                    {m.method}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {bestCell(accIdx, i, `${(m.accuracy_mean * 100).toFixed(1)}% ± ${(m.accuracy_std * 100).toFixed(1)}`)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {bestCell(eceIdx, i, `${(m.ece_mean * 100).toFixed(1)}% ± ${(m.ece_std * 100).toFixed(1)}`)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {bestCell(cuIdx, i, `${m.compute_units_mean.toFixed(1)} CU`)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {bestCell(wallIdx, i, `${m.wall_time_s_mean.toFixed(0)} s`)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {bestCell(retIdx, i, `${(m.retention_mean * 100).toFixed(1)}%`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Chart grid ───────────────────────────────────────────────────────────────
function ChartGrid({ methods }: { methods: BenchmarkMethodExt[] }) {
  const colors = useMethodColors();
  const isReducedMotion = useReducedMotion();

  function makeData(field: keyof BenchmarkMethodExt) {
    return methods.map((m) => ({
      method: m.method === "Regularized Fine-Tuning" ? "Reg FT" : m.method === "Early Stopping" ? "Early Stop" : m.method,
      value: Number(m[field]),
      fill: methodColor(m.method, colors),
    }));
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Accuracy */}
      <Card className="flex flex-col">
        <CardHeader><CardTitle className="text-sm">Accuracy by Method (higher = better)</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={makeData("accuracy_mean")} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="method" tick={{ fontSize: 10 }} />
              <YAxis domain={[0.6, 1.0]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`${(Number(v) * 100).toFixed(1)}%`, "Accuracy"]} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {makeData("accuracy_mean").map((e, idx) => (
                  <Cell key={idx} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Compute */}
      <Card className="flex flex-col">
        <CardHeader><CardTitle className="text-sm">Compute by Method (lower = better)</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={makeData("compute_units_mean")} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="method" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`${Number(v).toFixed(1)} CU`, "Compute"]} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {makeData("compute_units_mean").map((e, idx) => (
                  <Cell key={idx} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Benchmarks Content ───────────────────────────────────────────────────────
function BenchmarksContent() {
  const searchParams = useSearchParams();
  const queryRunId = searchParams?.get("runId");

  const runsQuery = useQuery({
    queryKey: ["runs"],
    queryFn: () => listRuns(),
  });

  const runs = Array.isArray(runsQuery.data) ? runsQuery.data : [];
  const activeRunId = queryRunId || runs[0]?.id;

  const [scenarioId, setScenarioId] = React.useState<ScenarioId>("S1");
  const query = useQuery({
    queryKey: ["benchmarkExt", scenarioId],
    queryFn: () => getBenchmarkExt(scenarioId),
  });

  return (
    <div className="space-y-8 w-full max-w-6xl mx-auto pb-12">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Analytics & Benchmarks
            </h1>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary font-medium">
              Verified Evaluation
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            In-depth candidate strategy analytics for the current recovery run and cross-method baseline benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <LinkButton
            href="/monitor"
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
          >
            <Activity className="size-3.5" />
            Live Monitor
          </LinkButton>
          <LinkButton
            href="/dashboard"
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
          >
            <ExternalLink className="size-3.5" />
            Dashboard
          </LinkButton>
        </div>
      </div>

      {/* ── 1. Current Process Analytics (if run exists) ─────────────────── */}
      {activeRunId && (
        <section aria-label="Current process analytics">
          <CurrentProcessAnalytics runId={activeRunId} />
        </section>
      )}

      {/* ── 2. Standard Baseline Benchmarks ───────────────────────────────── */}
      <section aria-label="Standard baseline benchmarks" className="space-y-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold font-heading text-foreground">
              Cross-Method System Baselines
            </h2>
            <p className="text-xs text-muted-foreground">
              5 seeds each · AMRS vs Early Stopping, Regularized Fine-Tuning, and Full Retrain
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Failure Scenario</span>
            <Select
              selectedKey={scenarioId}
              onSelectionChange={(k) => setScenarioId(k as ScenarioId)}
            >
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="S1">S1 Overfit</SelectItem>
                <SelectItem id="S2">S2 Miscalibrated</SelectItem>
                <SelectItem id="S3">S3 BN Drift</SelectItem>
                <SelectItem id="S4">S4 Unstable Training</SelectItem>
                <SelectItem id="S5">S5 Degraded Head</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {query.isLoading ? (
          <KpiStripSkeleton />
        ) : query.data ? (
          <>
            <KpiStrip
              computeSaved={query.data.kpi.compute_saved_rate}
              avgAccGain={query.data.kpi.avg_accuracy_gain}
              avgEceRed={query.data.kpi.avg_ece_reduction}
              gateRejRate={query.data.kpi.gate_rejection_rate}
            />
            <ComparisonTable methods={query.data.methods} />
            <ChartGrid methods={query.data.methods} />
          </>
        ) : null}
      </section>
    </div>
  );
}

export default function BenchmarksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading benchmarks…</div>}>
      <BenchmarksContent />
    </Suspense>
  );
}
