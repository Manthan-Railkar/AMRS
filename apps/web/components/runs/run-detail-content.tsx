"use client";

import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  X,
  Download,
  FileText,
  Loader2,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getRun, cancelRun } from "@/lib/api";
import type { Run, Candidate } from "@/lib/api/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/status/status-badge";
import { VerdictBanner } from "@/components/status/verdict-banner";
import { ErrorState } from "@/components/status/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatAccuracy, formatUtcDate } from "@/lib/format";
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

// ─── Stage stepper ────────────────────────────────────────────────────────────
const STAGES = [
  "Loading",
  "Diagnosing",
  "Trying strategy 1/3",
  "Trying strategy 2/3",
  "Trying strategy 3/3",
  "Verifying",
];

function getStageName(stageLabel: string) {
  if (stageLabel.startsWith("Completed")) return "Done";
  if (stageLabel === "Queued") return "Queued";
  return stageLabel;
}

function ProgressStepper({ stageLabel, progress }: { stageLabel: string; progress: number }) {
  const currentIdx = STAGES.indexOf(stageLabel);

  return (
    <div className="space-y-3">
      <ol className="flex items-center gap-1 overflow-x-auto pb-1" aria-label="Recovery stages">
        {STAGES.map((stage, i) => {
          const done = currentIdx > i;
          const active = currentIdx === i;
          return (
            <li key={stage} className="flex items-center gap-1">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  done
                    ? "bg-verdict-accepted text-white"
                    : active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? <CheckCircle2 className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-xs sm:inline whitespace-nowrap",
                  active ? "font-semibold text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/60"
                )}
              >
                {stage}
              </span>
              {i < STAGES.length - 1 && (
                <ChevronRight className="size-3 shrink-0 text-muted-foreground/40" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
      <Progress
        value={progress}
        aria-label={`Recovery progress ${progress}%`}
        className="w-full"
      >
        <span className="sr-only">{progress}% complete — {stageLabel}</span>
      </Progress>
      <p className="text-xs text-muted-foreground">
        Stage: <span className="font-medium text-foreground">{getStageName(stageLabel)}</span>
        {" "}— {progress}% complete
      </p>
    </div>
  );
}

// ─── Diagnosis card ───────────────────────────────────────────────────────────
function DiagnosisCard({ run }: { run: Run }) {
  if (!run.diagnosis.length) return null;

  const diag = run.diagnosis[0];
  const confidencePct = Math.round(diag.confidence * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnosis</CardTitle>
        <CardDescription>Primary failure mode detected on the uploaded model</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium capitalize">{diag.label.replace(/_/g, " ")}</span>
            <span className="text-sm font-semibold text-primary">{confidencePct}% confidence</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${confidencePct}%` }}
              role="progressbar"
              aria-valuenow={confidencePct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Diagnosis confidence: ${confidencePct}%`}
            />
          </div>
        </div>
        <ul className="space-y-1.5" aria-label="Evidence">
          {diag.evidence.map((e, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              {e}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Gate decision badge ──────────────────────────────────────────────────────
function GateBadge({ decision }: { decision: Candidate["gate_decision"] }) {
  if (decision === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-verdict-accepted-bg text-verdict-accepted-fg px-2 py-0.5 text-xs font-medium border border-verdict-accepted/30">
        <CheckCircle2 className="size-3" aria-hidden /> Accepted
      </span>
    );
  }
  if (decision === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-verdict-rolled-back-bg text-verdict-rolled-back-fg px-2 py-0.5 text-xs font-medium border border-verdict-rolled-back/30">
        <X className="size-3" aria-hidden /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-medium border border-border">
      Skipped
    </span>
  );
}

// ─── Candidates table ─────────────────────────────────────────────────────────
const STRATEGY_LABELS: Record<string, string> = {
  temperature_scaling:     "Temperature Scaling",
  bn_recalibration:        "BN Recalibration",
  last_layer_retraining:   "Last-Layer Retraining",
  selective_finetune_l2sp: "Selective Fine-Tune + L2-SP",
  checkpoint_reversion:    "Checkpoint Reversion",
  weight_interpolation:    "Weight Interpolation",
};

function CandidatesTable({ candidates }: { candidates: Candidate[] }) {
  if (!candidates.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recovery Candidates</CardTitle>
        <CardDescription>
          Strategies tried cheapest-first, evaluated against holdout gate criteria
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Strategy</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Cost (CU)</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Δ Accuracy</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Retention</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gate</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {candidates.map((c) => {
                const deltaSign = c.delta_primary >= 0 ? "+" : "";
                const deltaColor = c.delta_primary >= 0.02 ? "text-verdict-accepted-fg" : c.delta_primary < 0 ? "text-verdict-error-fg" : "text-muted-foreground";
                return (
                  <tr key={c.strategy} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      {STRATEGY_LABELS[c.strategy] ?? c.strategy}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {c.cost_units.toFixed(1)}
                    </td>
                    <td className={cn("px-4 py-3 text-right font-mono font-medium", deltaColor)}>
                      {deltaSign}{(c.delta_primary * 100).toFixed(1)} pp
                      <span className="ml-1 text-xs text-muted-foreground">
                        [{(c.ci_low * 100).toFixed(1)}, {(c.ci_high * 100).toFixed(1)}]
                      </span>
                    </td>
                    <td className={cn(
                      "px-4 py-3 text-right font-mono",
                      c.retention >= 0.95 ? "text-verdict-accepted-fg" : "text-verdict-rolled-back-fg"
                    )}>
                      {(c.retention * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3">
                      <GateBadge decision={c.gate_decision} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs">
                      {c.gate_reasons[0]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Before/after chart ───────────────────────────────────────────────────────
function BeforeAfterChart({ run }: { run: Run }) {
  const isReducedMotion = useReducedMotion();
  const tooltipBg    = useCssVar("--card",   "white");
  const tooltipBorder = useCssVar("--border", "oklch(0.91 0.02 295)");
  const primaryColor  = useCssVar("--chart-1","oklch(0.52 0.22 288)");
  const chart2Color   = useCssVar("--chart-2","oklch(0.46 0.20 272)");

  if (!run.original_metrics || !run.accepted_metrics) return null;

  const data = [
    {
      metric: "Accuracy",
      Original: parseFloat((run.original_metrics.accuracy * 100).toFixed(1)),
      Recovered: parseFloat((run.accepted_metrics.accuracy * 100).toFixed(1)),
    },
    {
      metric: "ECE",
      Original: parseFloat((run.original_metrics.ece * 100).toFixed(2)),
      Recovered: parseFloat((run.accepted_metrics.ece * 100).toFixed(2)),
    },
    {
      metric: "NLL",
      Original: parseFloat(run.original_metrics.nll.toFixed(3)),
      Recovered: parseFloat(run.accepted_metrics.nll.toFixed(3)),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Before / After Metrics</CardTitle>
        <CardDescription>
          Original vs recovered model on the holdout evaluation set
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} aria-label="Before and after metrics comparison" role="img">
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.68 0.06 290 / 0.25)" />
            <XAxis dataKey="metric" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderRadius: "12px", fontSize: "12px", border: `1px solid ${tooltipBorder}` }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Original" fill={chart2Color} radius={[4, 4, 0, 0]} isAnimationActive={!isReducedMotion} />
            <Bar dataKey="Recovered" fill={primaryColor} radius={[4, 4, 0, 0]} isAnimationActive={!isReducedMotion} />
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-3 text-xs text-muted-foreground">
          Accuracy shown as percentage points; ECE and NLL as raw values. Lower ECE and NLL indicate better calibration.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Compute summary ──────────────────────────────────────────────────────────
const FULL_RETRAIN_CU = 100;

function ComputeSummary({ run }: { run: Run }) {
  const savedPct = Math.round((1 - run.compute_units / FULL_RETRAIN_CU) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compute Summary</CardTitle>
        <CardDescription>Compute units used by AMRS vs full retraining baseline</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">AMRS compute used</span>
          <span className="font-semibold">{run.compute_units.toFixed(1)} CU</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Full retraining baseline</span>
          <span className="font-semibold">{FULL_RETRAIN_CU}.0 CU</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Compute saved</span>
          <span className="font-semibold text-verdict-accepted-fg">{savedPct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={`${run.compute_units.toFixed(1)} of ${FULL_RETRAIN_CU} compute units used`}>
          <div
            className="h-full bg-primary"
            style={{ width: `${(run.compute_units / FULL_RETRAIN_CU) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          AMRS used {run.compute_units.toFixed(1)} CU — saving {savedPct}% compared to full retraining ({FULL_RETRAIN_CU} CU).
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Artifacts ────────────────────────────────────────────────────────────────
function ArtifactsList({ run }: { run: Run }) {
  if (!run.artifacts.length) return null;

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Artifacts</CardTitle>
        <CardDescription>
          Generated files from this recovery run — download integration coming soon
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2" aria-label="Recovery artifacts">
          {run.artifacts.map((artifact) => (
            <li
              key={artifact.name}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate text-sm font-medium">{artifact.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(artifact.size_bytes)}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                isDisabled
                aria-label={`Download ${artifact.name} (not yet available)`}
                className="shrink-0 gap-1.5 opacity-50"
              >
                <Download className="size-3.5" aria-hidden />
                Download
              </Button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Download buttons are disabled in this demo — file serving will be wired to the backend in a future release.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function RunDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading run details">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

// ─── Scenario badge ───────────────────────────────────────────────────────────
const SCENARIO_LABELS: Record<string, string> = {
  S1: "S1 Overfit",
  S2: "S2 Miscalibrated",
  S3: "S3 BN Drift",
  S4: "S4 Unstable Training",
  S5: "S5 Degraded Head",
  S6: "S6 Healthy Control",
};

// ─── Main component ───────────────────────────────────────────────────────────
export function RunDetailContent({ runId }: { runId: string }) {
  const TERMINAL = ["succeeded", "failed", "cancelled"];

  const query = useQuery<Run>({
    queryKey: ["run", runId],
    queryFn: () => getRun(runId),
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data || TERMINAL.includes(data.status)) return false;
      return 1500;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelRun(runId),
    onSuccess: () => {
      void query.refetch();
    },
  });

  const [cancelRequested, setCancelRequested] = React.useState(false);

  if (query.isLoading) return <RunDetailSkeleton />;
  if (query.error || !query.data) {
    return (
      <ErrorState
        title="Failed to load run"
        error={query.error as Error | null}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const run = query.data;
  const isRunning = run.status === "queued" || run.status === "running";
  const isFinished = TERMINAL.includes(run.status);

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              {run.id}
            </h1>
            <Badge variant="secondary" className="font-mono text-xs">
              {SCENARIO_LABELS[run.scenario_id] ?? run.scenario_id}
            </Badge>
            <StatusBadge status={run.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {run.architecture} · Started {formatUtcDate(run.created_at)}
            {run.finished_at ? ` · Finished ${formatUtcDate(run.finished_at)}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {isRunning && !cancelRequested && (
            <Button
              variant="outline"
              size="sm"
              onPress={() => {
                setCancelRequested(true);
                cancelMutation.mutate();
              }}
              isDisabled={cancelMutation.isPending}
              className="gap-1.5"
              aria-label="Cancel this recovery run"
            >
              {cancelMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <X className="size-3.5" aria-hidden />
              )}
              Cancel run
            </Button>
          )}
          {cancelRequested && isRunning && (
            <span className="text-xs text-muted-foreground self-center">
              Cancellation requested…
            </span>
          )}
          <LinkButton href="/runs/new" variant="outline" size="sm">
            New run
          </LinkButton>
        </div>
      </div>

      {/* ── Progress while running ────────────────────────────────────────── */}
      {isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
              Recovery in progress
            </CardTitle>
            <CardDescription>Polling every 1.5 s — results will appear when the run completes</CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressStepper stageLabel={run.stage_label} progress={run.progress} />
          </CardContent>
        </Card>
      )}

      {/* ── Verdict banner ────────────────────────────────────────────────── */}
      {isFinished && run.status === "succeeded" && run.verdict && (
        <div>
          {run.verdict === "rolled_back" && (
            <VerdictBanner
              verdict="rolled_back"
              explanation="All recovery candidates failed the safety gate. The original model has been kept — no weights were modified."
            />
          )}
          {run.verdict === "accepted" && (
            <VerdictBanner
              verdict="accepted"
              explanation={`The cheapest passing strategy improved accuracy by ${run.accepted_metrics ? formatAccuracy(run.accepted_metrics.accuracy - run.original_metrics.accuracy) : "—"} and passed all holdout gate checks.`}
            />
          )}
          {run.verdict === "healthy_no_action" && (
            <VerdictBanner
              verdict="healthy_no_action"
              explanation="Diagnosis found no actionable failure mode. The model is healthy and no recovery was applied."
            />
          )}
          {run.verdict === "error" && (
            <VerdictBanner
              verdict="error"
              explanation={run.error ?? "An unrecoverable error occurred during the recovery pipeline."}
            />
          )}
        </div>
      )}

      {run.status === "cancelled" && (
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Run was cancelled before completion.
        </div>
      )}

      {/* ── Diagnosis ────────────────────────────────────────────────────── */}
      {isFinished && <DiagnosisCard run={run} />}

      {/* ── Candidates table ──────────────────────────────────────────────── */}
      {isFinished && run.candidates.length > 0 && (
        <CandidatesTable candidates={run.candidates} />
      )}

      {/* ── Before/after chart ────────────────────────────────────────────── */}
      {isFinished && run.accepted_metrics && (
        <BeforeAfterChart run={run} />
      )}

      {/* ── Compute summary ───────────────────────────────────────────────── */}
      {isFinished && run.status === "succeeded" && (
        <ComputeSummary run={run} />
      )}

      {/* ── Artifacts ────────────────────────────────────────────────────── */}
      {isFinished && <ArtifactsList run={run} />}
    </div>
  );
}
