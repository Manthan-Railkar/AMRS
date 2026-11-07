"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CheckCircle2 } from "lucide-react";
import { getBenchmarkExt } from "@/lib/api/recovery";
import type { BenchmarkMethodExt } from "@/lib/schemas/recovery";
import type { ScenarioId } from "@/lib/api/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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

// ─── Method colors ────────────────────────────────────────────────────────────
function useMethodColors() {
  const primary  = useCssVar("--chart-1", "oklch(0.52 0.22 288)");
  const chart2   = useCssVar("--chart-2", "oklch(0.46 0.20 272)");
  const chart3   = useCssVar("--chart-3", "oklch(0.56 0.18 256)");
  const chart4   = useCssVar("--chart-4", "oklch(0.62 0.15 240)");
  const tooltipBg    = useCssVar("--card",   "white");
  const tooltipBorder = useCssVar("--border", "oklch(0.91 0.02 295)");
  return { primary, chart2, chart3, chart4, tooltipBg, tooltipBorder };
}

function methodColor(method: string, colors: ReturnType<typeof useMethodColors>) {
  if (method === "AMRS") return colors.primary;
  if (method === "Early Stopping") return colors.chart2;
  if (method.startsWith("Regularized")) return colors.chart3;
  return colors.chart4;
}

// ─── Best value detection ─────────────────────────────────────────────────────
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
      {[0,1,2,3].map((i) => <CardSkeleton key={i} />)}
    </div>
  );
}

// ─── Comparison table ─────────────────────────────────────────────────────────
function ComparisonTable({ methods }: { methods: BenchmarkMethodExt[] }) {
  const accIdx    = bestIdx(methods.map((m) => m.accuracy_mean), true);
  const eceIdx    = bestIdx(methods.map((m) => m.ece_mean), false);
  const cuIdx     = bestIdx(methods.map((m) => m.compute_units_mean), false);
  const wallIdx   = bestIdx(methods.map((m) => m.wall_time_s_mean), false);
  const retIdx    = bestIdx(methods.map((m) => m.retention_mean), true);

  function bestCell(idx: number, i: number, children: React.ReactNode) {
    return idx === i ? (
      <span className="font-semibold text-primary flex items-center gap-1 justify-end">
        <CheckCircle2 className="size-3.5 shrink-0" aria-label="Best value" />
        {children}
      </span>
    ) : <>{children}</>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Method Comparison</CardTitle>
        <CardDescription>5 seeds each · violet check marks best value per column (icon + bold — not color alone)</CardDescription>
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
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Wall Time (s)</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {methods.map((m, i) => (
                <tr key={m.method} className={cn("transition-colors hover:bg-muted/30", m.method === "AMRS" && "bg-primary/5")}>
                  <td className="px-4 py-3 font-medium">
                    {m.method}
                    {m.method === "AMRS" && <Badge variant="default" className="ml-2 text-[10px]">AMRS</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {bestCell(accIdx, i, `${(m.accuracy_mean * 100).toFixed(1)} ± ${(m.accuracy_std * 100).toFixed(1)}`)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {bestCell(eceIdx, i, `${(m.ece_mean * 100).toFixed(2)} ± ${(m.ece_std * 100).toFixed(2)}`)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {bestCell(cuIdx, i, m.compute_units_mean.toFixed(1))}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {bestCell(wallIdx, i, m.wall_time_s_mean.toFixed(0))}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
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

// ─── 2×2 chart grid ───────────────────────────────────────────────────────────
interface ChartGridProps {
  methods: BenchmarkMethodExt[];
}

function ChartGrid({ methods }: ChartGridProps) {
  const isReducedMotion = useReducedMotion();
  const colors = useMethodColors();

  function makeData(key: keyof BenchmarkMethodExt) {
    return methods.map((m) => ({
      method: m.method.length > 10 ? m.method.split(" ")[0] : m.method,
      value: parseFloat((m[key] as number).toFixed(4)),
      fill: methodColor(m.method, colors),
    }));
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Accuracy */}
      <Card className="flex flex-col">
        <CardHeader><CardTitle className="text-sm">Accuracy by Method</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={makeData("accuracy_mean")} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} aria-label="Accuracy by method" role="img">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.68 0.06 290 / 0.25)" />
              <XAxis dataKey="method" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0.6, 1]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v*100).toFixed(0)}%`} />
              <Tooltip formatter={(v) => [`${(Number(v)*100).toFixed(2)}%`, "Accuracy"]} contentStyle={{ backgroundColor: colors.tooltipBg, borderRadius: "12px", fontSize: "11px", border: `1px solid ${colors.tooltipBorder}` }} />
              <Bar dataKey="value" isAnimationActive={!isReducedMotion} radius={[4,4,0,0]}>
                {makeData("accuracy_mean").map((e) => (
                  <rect key={e.method} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-muted-foreground">AMRS matches or exceeds baselines at a fraction of the compute cost.</p>
        </CardContent>
      </Card>

      {/* ECE */}
      <Card className="flex flex-col">
        <CardHeader><CardTitle className="text-sm">ECE by Method (lower = better)</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={makeData("ece_mean")} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} aria-label="ECE by method" role="img">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.68 0.06 290 / 0.25)" />
              <XAxis dataKey="method" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v*100).toFixed(0)}%`} />
              <Tooltip formatter={(v) => [`${(Number(v)*100).toFixed(2)}%`, "ECE"]} contentStyle={{ backgroundColor: colors.tooltipBg, borderRadius: "12px", fontSize: "11px", border: `1px solid ${colors.tooltipBorder}` }} />
              <Bar dataKey="value" isAnimationActive={!isReducedMotion} radius={[4,4,0,0]}>
                {makeData("ece_mean").map((e) => (
                  <rect key={e.method} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-muted-foreground">AMRS achieves the lowest ECE, especially on S2 (miscalibration).</p>
        </CardContent>
      </Card>

      {/* Compute */}
      <Card className="flex flex-col">
        <CardHeader><CardTitle className="text-sm">Compute Units by Method (lower = better)</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={makeData("compute_units_mean")} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} aria-label="Compute units by method" role="img">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.68 0.06 290 / 0.25)" />
              <XAxis dataKey="method" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [`${Number(v).toFixed(1)} CU`, "Compute"]} contentStyle={{ backgroundColor: colors.tooltipBg, borderRadius: "12px", fontSize: "11px", border: `1px solid ${colors.tooltipBorder}` }} />
              <Bar dataKey="value" isAnimationActive={!isReducedMotion} radius={[4,4,0,0]}>
                {makeData("compute_units_mean").map((e) => (
                  <rect key={e.method} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-muted-foreground">AMRS uses 1.5–14.4 CU vs 100 CU for full retraining — up to 98.5% savings.</p>
        </CardContent>
      </Card>

      {/* Wall time */}
      <Card className="flex flex-col">
        <CardHeader><CardTitle className="text-sm">Wall Time by Method (lower = better)</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={makeData("wall_time_s_mean")} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} aria-label="Wall time by method" role="img">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.68 0.06 290 / 0.25)" />
              <XAxis dataKey="method" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [`${Number(v).toFixed(0)} s`, "Wall Time"]} contentStyle={{ backgroundColor: colors.tooltipBg, borderRadius: "12px", fontSize: "11px", border: `1px solid ${colors.tooltipBorder}` }} />
              <Bar dataKey="value" isAnimationActive={!isReducedMotion} radius={[4,4,0,0]}>
                {makeData("wall_time_s_mean").map((e) => (
                  <rect key={e.method} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-muted-foreground">AMRS completes in seconds to minutes; full retraining takes ~16 minutes per seed.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── How to read card ─────────────────────────────────────────────────────────
function HowToReadCard() {
  const items = [
    { term: "Accuracy", def: "Mean top-1 accuracy on the held-out test set, averaged over 5 random seeds. Higher is better." },
    { term: "ECE (Expected Calibration Error)", def: "Average gap between predicted confidence and actual accuracy across confidence bins. Lower is better." },
    { term: "Compute Units (CU)", def: "Relative compute cost: full retraining = 100 CU. Temperature scaling ≈ 0.8 CU." },
    { term: "Wall Time", def: "Real-world elapsed time in seconds, averaged over seeds on the same hardware configuration." },
    { term: "Retention", def: "Fraction of original test samples that maintain correct classification after recovery. Must be ≥ 0.95 to pass the gate." },
    { term: "± std", def: "Standard deviation across 5 seeds. Wider intervals indicate higher sensitivity to random initialization." },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>How to read this table</CardTitle>
        <CardDescription>Metric definitions and interpretation guide</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">
          {items.map(({ term, def }) => (
            <div key={term}>
              <dt className="text-sm font-semibold">{term}</dt>
              <dd className="text-sm text-muted-foreground leading-relaxed">{def}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const BENCHMARK_SCENARIOS: Array<{ id: ScenarioId; label: string }> = [
  { id: "S1", label: "S1 Overfit" },
  { id: "S2", label: "S2 Miscalibrated" },
  { id: "S3", label: "S3 BN Drift" },
  { id: "S4", label: "S4 Unstable Training" },
  { id: "S5", label: "S5 Degraded Head" },
];

export default function BenchmarksPage() {
  const [scenarioId, setScenarioId] = React.useState<ScenarioId>("S1");

  const query = useQuery({
    queryKey: ["benchmarkExt", scenarioId],
    queryFn: () => getBenchmarkExt(scenarioId),
  });

  return (
    <div className="space-y-8">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Benchmarks
            </h1>
            <Badge variant="outline" className="text-[11px] text-muted-foreground">Demo data</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            AMRS vs early stopping, regularized fine-tuning, and full retraining — 5 seeds each.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">Scenario</span>
          <Select selectedKey={scenarioId} onSelectionChange={(k) => setScenarioId(k as ScenarioId)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BENCHMARK_SCENARIOS.map((s) => (
                <SelectItem key={s.id} id={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="text-xs">5 seeds</Badge>
        </div>
      </div>

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
      <section aria-label="Benchmark KPI summary">
        {query.isLoading ? (
          <KpiStripSkeleton />
        ) : query.error || !query.data ? (
          <ErrorState title="Failed to load benchmarks" error={query.error as Error} onRetry={() => void query.refetch()} />
        ) : (
          <KpiStrip
            computeSaved={query.data.kpi.compute_saved_rate}
            avgAccGain={query.data.kpi.avg_accuracy_gain}
            avgEceRed={query.data.kpi.avg_ece_reduction}
            gateRejRate={query.data.kpi.gate_rejection_rate}
          />
        )}
      </section>

      {/* ── Comparison table ──────────────────────────────────────────────── */}
      <section aria-label="Method comparison table">
        {query.isLoading ? (
          <Skeleton className="h-64 rounded-2xl" />
        ) : query.data ? (
          <ComparisonTable methods={query.data.methods} />
        ) : null}
      </section>

      {/* ── 2×2 chart grid ───────────────────────────────────────────────── */}
      <section aria-label="Benchmark charts">
        {query.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0,1,2,3].map((i) => <ChartSkeleton key={i} height={200} />)}
          </div>
        ) : query.data ? (
          <ChartGrid methods={query.data.methods} />
        ) : null}
      </section>

      {/* ── How to read ───────────────────────────────────────────────────── */}
      <HowToReadCard />
    </div>
  );
}
