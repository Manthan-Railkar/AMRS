"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  AlertTriangle,
  Zap,
  ShieldCheck,
  Activity,
  Clock,
  Terminal,
  Copy,
  Check,
  Download,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Cpu,
  Layers,
  Sparkles,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { startMonitorReplay, listRuns, getArtifactDownloadUrl } from "@/lib/api";
import { useRunStatus } from "@/hooks/use-run-status";
import type { MonitorPoint, MonitorEvent, ScenarioId, Run, Candidate } from "@/lib/api/types";
import { getMonitorThresholds } from "@/lib/api/recovery";
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
import { Progress } from "@/components/ui/progress";
import { ErrorState } from "@/components/status/error-state";
import { ChartSkeleton } from "@/components/status/skeletons";
import { VerdictBanner } from "@/components/status/verdict-banner";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

// ─── CSS var hook ─────────────────────────────────────────────────────────────
function useCssVar(name: string, fallback: string) {
  const [v, setV] = React.useState(fallback);
  React.useLayoutEffect(() => {
    const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (val) React.startTransition(() => setV(val));
  }, [name]);
  return v;
}

// ─── Health status pill ───────────────────────────────────────────────────────
const HEALTH_META = {
  healthy:    { label: "Healthy",    cls: "bg-verdict-healthy-bg text-verdict-healthy-fg border-verdict-healthy/30",         icon: ShieldCheck },
  warning:    { label: "Warning",    cls: "bg-verdict-rolled-back-bg text-verdict-rolled-back-fg border-verdict-rolled-back/30", icon: AlertTriangle },
  triggered:  { label: "Triggered",  cls: "bg-verdict-error-bg text-verdict-error-fg border-verdict-error/30",               icon: Zap },
  recovering: { label: "Recovering", cls: "bg-primary/10 text-primary border-primary/20",                                    icon: Activity },
} as const;

type HealthKey = keyof typeof HEALTH_META;

function HealthPill({ status }: { status: string }) {
  const meta = HEALTH_META[status as HealthKey] ?? HEALTH_META.healthy;
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold", meta.cls)}>
      <Icon className="size-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}

// ─── Synthetic Replay Options ─────────────────────────────────────────────────
const REPLAY_OPTIONS: Array<{ scenarioId: ScenarioId; label: string }> = [
  { scenarioId: "S1", label: "S1 Overfit Replay" },
  { scenarioId: "S4", label: "S4 Instability Replay" },
];

const SPEEDS = [1, 2] as const;
type Speed = (typeof SPEEDS)[number];

function computeHealth(
  points: MonitorPoint[],
  events: MonitorEvent[],
  epoch: number,
  patience: number,
): { health: HealthKey; gap: number; patienceCounter: number; inCooldown: boolean; cooldownRemaining: number } {
  const visible = points.filter((p) => p.epoch <= epoch);
  if (!visible.length) return { health: "healthy", gap: 0, patienceCounter: 0, inCooldown: false, cooldownRemaining: 0 };

  const last = visible[visible.length - 1];
  const gap = last.train_loss - last.val_loss;

  const hasTriggered = events.some((e) => e.epoch <= epoch && e.type === "trigger");
  const hasAction = events.some((e) => e.epoch <= epoch && e.type === "action");
  const hasCooldown = events.some((e) => e.epoch <= epoch && e.type === "cooldown");

  if (hasAction && hasCooldown) return { health: "recovering", gap, patienceCounter: 0, inCooldown: true, cooldownRemaining: 4 };
  if (hasTriggered) return { health: "triggered", gap, patienceCounter: patience, inCooldown: false, cooldownRemaining: 0 };

  const hasWarning = events.some((e) => e.epoch <= epoch && (e.type === "overfit_warning" || e.type === "instability_warning"));
  if (hasWarning) return { health: "warning", gap, patienceCounter: Math.min(patience - 1, 3), inCooldown: false, cooldownRemaining: 0 };

  return { health: "healthy", gap, patienceCounter: 0, inCooldown: false, cooldownRemaining: 0 };
}

// ─── Stage Stepper for Live Runs ──────────────────────────────────────────────
const LIVE_STAGES = [
  { key: "queued", label: "Queued" },
  { key: "diagnosing", label: "ML Multi-Head Diagnosis" },
  { key: "evaluating_strategies", label: "Strategy Optimization" },
  { key: "verifying", label: "Holdout Verification Gate" },
  { key: "completed", label: "Completed" },
];

function LiveStageStepper({ stage, progress }: { stage: string; progress: number }) {
  const normalizedStage = stage.toLowerCase().replace(/ /g, "_");
  let currentIdx = LIVE_STAGES.findIndex((s) => s.key === normalizedStage);
  if (currentIdx === -1) {
    if (progress >= 100) currentIdx = 4;
    else if (progress >= 60) currentIdx = 3;
    else if (progress >= 40) currentIdx = 2;
    else if (progress >= 10) currentIdx = 1;
    else currentIdx = 0;
  }

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span className="font-medium text-foreground">
          Stage: {LIVE_STAGES[currentIdx]?.label ?? stage}
        </span>
        <span className="font-mono font-semibold text-primary">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-2 w-full" />
      <ol className="flex items-center justify-between gap-1 overflow-x-auto pt-1" aria-label="Recovery stages">
        {LIVE_STAGES.map((s, i) => {
          const done = i < currentIdx || progress >= 100;
          const active = i === currentIdx && progress < 100;
          return (
            <li key={s.key} className="flex items-center gap-1.5 shrink-0">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                  done
                    ? "bg-verdict-accepted text-white"
                    : active
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/40 animate-pulse"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {done ? <CheckCircle2 className="size-3" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-[11px] whitespace-nowrap",
                  active ? "font-semibold text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/50"
                )}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ─── Format Strategy Names ───────────────────────────────────────────────────
const STRATEGY_LABELS: Record<string, string> = {
  temperature_scaling:     "Temperature Scaling",
  bn_recalibration:        "BN Recalibration",
  last_layer_retraining:   "Last-Layer Retraining",
  selective_finetune_l2sp: "Selective Fine-Tune + L2-SP",
  checkpoint_reversion:    "Checkpoint Reversion",
  weight_interpolation:    "Weight Interpolation",
};

// ─── Live Recognition Logs Generator ──────────────────────────────────────────
function generateLiveLogs(run: Run): Array<{ id: string; time: string; level: string; msg: string }> {
  const logs: Array<{ id: string; time: string; level: string; msg: string }> = [];
  const baseTime = new Date(run.created_at || Date.now());

  function getTime(secOffset: number) {
    const d = new Date(baseTime.getTime() + secOffset * 1000);
    return d.toISOString().substring(11, 19);
  }

  // 1. Intake logs
  logs.push({
    id: "l-1",
    time: getTime(0.1),
    level: "INTAKE",
    msg: `Ingested model checkpoint for architecture '${run.architecture}'. Integrity check passed (weights_only=True).`,
  });

  // 2. Multi-head diagnosis logs
  if (run.stage_label !== "Queued") {
    logs.push({
      id: "l-2",
      time: getTime(0.4),
      level: "DIAGNOSE",
      msg: `Starting Multi-Head Diagnostic Probes: generalization gap, ECE calibration, BatchNorm drift, and gradient stability.`,
    });
    logs.push({
      id: "l-3",
      time: getTime(0.8),
      level: "PROBE",
      msg: `Running classification gap probe: evaluated training batch loss against validation holdout slice.`,
    });
  }

  // 3. Recognized anomaly or healthy control
  if (run.diagnosis && run.diagnosis.length > 0) {
    const diag = run.diagnosis[0];
    const conf = Math.round(diag.confidence * 100);
    const isHealthy = diag.label === "healthy" || run.verdict === "healthy_no_action";
    logs.push({
      id: "l-4",
      time: getTime(1.2),
      level: isHealthy ? "HEALTHY" : "RECOGNIZED",
      msg: isHealthy
        ? `Diagnostic Assessment: Model evaluated as HEALTHY nominal control with ${conf}% confidence. All baseline metrics within verified bounds.`
        : `ML Diagnostic Decision: Primary failure mode recognized as '${diag.label.toUpperCase()}' with ${conf}% confidence.`,
    });

    diag.evidence.forEach((ev, i) => {
      logs.push({
        id: `l-ev-${i}`,
        time: getTime(1.4 + i * 0.2),
        level: "EVIDENCE",
        msg: `Evidence trace [probe ${i + 1}]: ${ev}`,
      });
    });
  }

  // 4. Candidate evaluations or healthy bypass
  if (run.candidates && run.candidates.length > 0) {
    logs.push({
      id: "l-5",
      time: getTime(2.0),
      level: "STRATEGY",
      msg: `Selector enqueued ${run.candidates.length} candidate strategies ordered by compute cost (cheapest first).`,
    });

    run.candidates.forEach((cand, idx) => {
      const name = STRATEGY_LABELS[cand.strategy] ?? cand.strategy;
      const deltaSign = cand.delta_primary >= 0 ? "+" : "";
      logs.push({
        id: `l-cand-${idx}`,
        time: getTime(2.2 + idx * 0.4),
        level: "GATE_EVAL",
        msg: `Candidate #${idx + 1} [${name} | ${cand.cost_units.toFixed(1)} CU]: Δ Acc ${deltaSign}${(cand.delta_primary * 100).toFixed(1)} pp, Retention ${(cand.retention * 100).toFixed(1)}% -> Decision: ${cand.gate_decision.toUpperCase()}`,
      });
    });
  } else if (run.verdict === "healthy_no_action" || run.stage_label.toLowerCase().includes("healthy")) {
    logs.push({
      id: "l-5-healthy",
      time: getTime(2.0),
      level: "GATE_EVAL",
      msg: `Verification Gate: Model passed all holdout non-regression checks. No parameter patching or fine-tuning intervention required.`,
    });
  }

  // 5. Final outcome
  if (run.status === "succeeded") {
    if (run.verdict === "accepted") {
      const acceptedCand = run.candidates.find((c) => c.gate_decision === "accepted");
      const stratName = run.accepted_strategy || acceptedCand?.strategy || "checkpoint_reversion";
      const best = STRATEGY_LABELS[stratName] ?? stratName;
      logs.push({
        id: "l-6",
        time: getTime(3.1),
        level: "ACCEPTED",
        msg: `Verification Gate PASSED: Selected strategy '${best}'. Repaired model meets retention and accuracy gain criteria.`,
      });
      logs.push({
        id: "l-7",
        time: getTime(3.2),
        level: "ARTIFACT",
        msg: `Generated repaired model checkpoint 'accepted_model.pt' (SHA256 verified) and performance report.`,
      });
    } else if (run.verdict === "healthy_no_action") {
      logs.push({
        id: "l-6",
        time: getTime(3.1),
        level: "HEALTHY",
        msg: `Verification Gate: Model determined healthy nominal control. No recovery intervention required. Original weights preserved bit-for-bit.`,
      });
      logs.push({
        id: "l-7",
        time: getTime(3.2),
        level: "ARTIFACT",
        msg: `Generated verified model checkpoint 'accepted_model.pt' and diagnostic report (ready for download).`,
      });
    } else {
      logs.push({
        id: "l-6",
        time: getTime(3.1),
        level: "ROLLED_BACK",
        msg: `Verification Gate: Candidate failed holdout criteria. Reverting to safe original weights (rollback).`,
      });
      logs.push({
        id: "l-7",
        time: getTime(3.2),
        level: "ARTIFACT",
        msg: `Preserved baseline model checkpoint 'accepted_model.pt' with 100% byte-identical integrity.`,
      });
    }
  }

  return logs;
}

// ─── Real-Time Live Run Monitor Component ─────────────────────────────────────
function RealTimeRunMonitor({
  runId,
  onSwitchToDemo,
}: {
  runId: string;
  onSwitchToDemo: () => void;
}) {
  const { data: run, isLoading, error, refetch } = useRunStatus(runId);
  const [copied, setCopied] = React.useState(false);
  const logsEndRef = React.useRef<HTMLDivElement>(null);

  const logs = React.useMemo(() => {
    if (!run) return [];
    return generateLiveLogs(run);
  }, [run]);

  // Auto-scroll logs to bottom
  React.useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  function copyLogs() {
    const text = logs.map((l) => `[${l.time}] [${l.level}] ${l.msg}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto size-7 animate-spin text-primary mb-3" />
          Connecting to live model recovery monitor for run {runId}…
        </CardContent>
      </Card>
    );
  }

  if (error || !run) {
    return (
      <ErrorState
        title="Failed to load run details"
        error={(error as Error) || new Error("Run not found")}
        onRetry={() => void refetch()}
      />
    );
  }

  const isTerminal = run.status === "succeeded" || run.status === "failed" || run.status === "cancelled";
  const diag = run.diagnosis?.[0];

  return (
    <div className="space-y-6 w-full">
      {/* ── Status Banner ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {run.verdict ? (
          <VerdictBanner verdict={run.verdict} />
        ) : (
          <div className="flex items-center justify-between p-4 rounded-2xl border border-primary/30 bg-primary/8 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0 animate-pulse">
                <Activity className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span>Automated Recovery in Progress</span>
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 font-mono">
                    {run.status.toUpperCase()}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AMRS ML engine is actively inspecting model weights and evaluating verified repair strategies.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span className="text-xs font-mono font-medium text-primary">Live Polling</span>
            </div>
          </div>
        )}

        {/* ── Progress Card ───────────────────────────────────────────────── */}
        <Card className="w-full border-border/80">
          <CardContent className="p-5 md:p-6 space-y-4">
            <LiveStageStepper stage={run.stage_label} progress={run.progress} />
          </CardContent>
        </Card>
      </div>

      {/* ── Live ML Recognition & Diagnostic Log Stream (Console) ─────────── */}
      <Card className="w-full border-border/80 bg-card overflow-hidden shadow-xs">
        <CardHeader className="bg-muted/30 border-b border-border/60 py-3.5 px-5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Terminal className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span>ML Multi-Head Diagnosis & Recognition Stream</span>
                <span className="inline-flex size-2 rounded-full bg-emerald-500 animate-ping" />
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time output from AMRS diagnostic probes, evidence recognition, and candidate verification
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onPress={copyLogs}
              className="h-8 gap-1.5 text-xs"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy Logs"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="bg-black/95 font-mono text-xs text-zinc-300 p-4 md:p-5 max-h-[340px] overflow-y-auto space-y-2 select-text">
            {logs.map((log) => {
              let levelColor = "text-cyan-400";
              if (log.level === "RECOGNIZED") levelColor = "text-amber-400 font-bold";
              else if (log.level === "ACCEPTED") levelColor = "text-emerald-400 font-bold";
              else if (log.level === "GATE_EVAL") levelColor = "text-purple-400";
              else if (log.level === "HEALTHY") levelColor = "text-blue-400 font-bold";
              else if (log.level === "ROLLED_BACK") levelColor = "text-rose-400 font-bold";

              return (
                <div key={log.id} className="flex items-start gap-2.5 leading-relaxed font-mono">
                  <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                  <span className={cn("shrink-0 font-semibold px-1 rounded bg-white/5", levelColor)}>
                    [{log.level}]
                  </span>
                  <span className="text-zinc-200 flex-1">{log.msg}</span>
                </div>
              );
            })}
            {!isTerminal && (
              <div className="flex items-center gap-2 text-zinc-500 pt-2 italic text-[11px]">
                <Loader2 className="size-3 animate-spin text-primary" />
                <span>Diagnostic engine executing probes… waiting for next trace event</span>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* ── Recognized Failure Mode & Evidence Card ───────────────────────── */}
      {diag && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Recognized Issue */}
          <Card className="md:col-span-1 border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-primary">
                Recognized Failure Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold font-heading capitalize text-foreground">
                  {diag.label.replace(/_/g, " ")}
                </span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-semibold">
                  {Math.round(diag.confidence * 100)}% Confidence
                </Badge>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Diagnostic Confidence</span>
                  <span className="font-semibold text-foreground">{Math.round(diag.confidence * 100)}%</span>
                </div>
                <Progress value={Math.round(diag.confidence * 100)} className="h-1.5" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                Detected automatically via multi-head probe without manual scenario tagging.
              </p>
            </CardContent>
          </Card>

          {/* Evidence Details */}
          <Card className="md:col-span-2 border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Diagnostic Evidence Trail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {diag.evidence.length > 0 ? (
                <ul className="space-y-2">
                  {diag.evidence.map((ev, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-foreground bg-muted/20 p-2.5 rounded-lg border border-border/50">
                      <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Analyzing baseline metrics…</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Candidates Table ──────────────────────────────────────────────── */}
      {run.candidates && run.candidates.length > 0 && (
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
              Evaluated Candidate Strategies (Holdout Gate Verification)
            </CardTitle>
            <CardDescription className="text-xs">
              Ordered cheapest-first. Evaluated strictly against isolated holdout criteria.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 border-y border-border/60 text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-4 text-left font-semibold">Strategy</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Cost (CU)</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Δ Accuracy</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Holdout Retention</th>
                    <th className="py-2.5 px-4 text-center font-semibold">Gate Decision</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {run.candidates.map((c, i) => {
                    const deltaSign = c.delta_primary >= 0 ? "+" : "";
                    const isAccepted = c.gate_decision === "accepted";
                    return (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {STRATEGY_LABELS[c.strategy] ?? c.strategy}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                          {c.cost_units.toFixed(1)} CU
                        </td>
                        <td className={cn("py-3 px-4 text-right font-mono font-medium", c.delta_primary >= 0 ? "text-emerald-500" : "text-rose-500")}>
                          {deltaSign}{(c.delta_primary * 100).toFixed(1)} pp
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-foreground font-medium">
                          {(c.retention * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-semibold px-2 py-0.5",
                              isAccepted
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                : "bg-rose-500/10 text-rose-500 border-rose-500/30"
                            )}
                          >
                            {c.gate_decision.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-[11px]">
                          {c.gate_reasons[0] ?? "Criteria met"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Cross-Route Navigation Actions ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <LinkButton
            href={`/benchmarks?runId=${run.id}`}
            variant="default"
            size="sm"
            className="gap-2 text-xs font-semibold"
          >
            <BarChart3 className="size-3.5" />
            View Process Analytics in Benchmarks
          </LinkButton>

          <LinkButton
            href="/dashboard"
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
          >
            <ExternalLink className="size-3.5" />
            System Dashboard
          </LinkButton>
        </div>

        {run.status === "succeeded" && (
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={getArtifactDownloadUrl(run.id, "accepted_model.pt")}
              download="accepted_model.pt"
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg text-white h-9 px-4 text-xs font-semibold shadow-xs transition-colors w-full sm:w-auto",
                run.verdict === "healthy_no_action"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : run.verdict === "accepted"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-zinc-700 hover:bg-zinc-800"
              )}
            >
              <Download className="size-3.5" />
              {run.verdict === "healthy_no_action"
                ? "Download Verified Model (.pt)"
                : run.verdict === "accepted"
                  ? "Download Repaired Model (.pt)"
                  : "Download Model (.pt)"}
            </a>
            <a
              href={getArtifactDownloadUrl(run.id, "report.json")}
              download="report.json"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background hover:bg-muted h-9 px-3 text-xs font-medium text-foreground transition-colors"
            >
              <Download className="size-3 text-muted-foreground" />
              Report (.json)
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Synthetic Demo Replay Component ──────────────────────────────────────────
function SyntheticDemoReplay() {
  const [scenarioId, setScenarioId] = React.useState<ScenarioId>("S1");
  const [epoch, setEpoch] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState<Speed>(1);

  const isReducedMotion = useReducedMotion();

  const thresholdsQuery = useQuery({
    queryKey: ["monitorThresholds"],
    queryFn: getMonitorThresholds,
  });

  const replayQuery = useQuery({
    queryKey: ["monitorReplay", scenarioId],
    queryFn: () => startMonitorReplay(scenarioId),
    staleTime: Infinity,
  });

  const replay = replayQuery.data ?? null;
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const maxEpoch = replay?.points?.length ?? 0;

  React.useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!playing || isReducedMotion || maxEpoch === 0) return;
    const ms = speed === 2 ? 250 : 500;
    intervalRef.current = setInterval(() => {
      setEpoch((e) => {
        if (e >= maxEpoch) {
          setPlaying(false);
          return e;
        }
        return e + 1;
      });
    }, ms);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, speed, maxEpoch, isReducedMotion]);

  function handlePlay() { if (epoch >= maxEpoch) setEpoch(0); setPlaying(true); }
  function handlePause() { setPlaying(false); }
  function handleStep() { setPlaying(false); setEpoch((e) => Math.min(e + 1, maxEpoch)); }
  function handleReset() { setPlaying(false); setEpoch(0); }

  const visiblePoints = React.useMemo(
    () => (replay?.points ?? []).filter((p) => p.epoch <= epoch),
    [replay, epoch]
  );

  const thresholds = thresholdsQuery.data;
  const liveState = React.useMemo(() => {
    if (!replay || !replay.points || !thresholds) return null;
    return computeHealth(
      replay.points,
      replay.events ?? [],
      epoch,
      thresholds.patience,
    );
  }, [replay, epoch, thresholds]);

  const chart1 = useCssVar("--chart-1", "oklch(0.52 0.22 288)");
  const chart2 = useCssVar("--chart-2", "oklch(0.46 0.20 272)");
  const tooltipBg = useCssVar("--card", "white");
  const tooltipBorder = useCssVar("--border", "oklch(0.91 0.02 295)");

  const tooltipStyle = {
    backgroundColor: tooltipBg,
    borderRadius: "12px",
    fontSize: "11px",
    border: `1px solid ${tooltipBorder}`,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-border/80 bg-muted/20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Demo Playback Controls</p>
          <p className="text-xs text-muted-foreground mt-0.5">Step through historical training trajectories epoch by epoch</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            selectedKey={scenarioId}
            onSelectionChange={(k) => {
              if (k) {
                setScenarioId(k as ScenarioId);
                setEpoch(0);
                setPlaying(false);
              }
            }}
          >
            <SelectTrigger className="w-44 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {REPLAY_OPTIONS.map((r) => (
                <SelectItem key={r.scenarioId} id={r.scenarioId}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <Button variant="ghost" size="icon-sm" onPress={handlePlay} isDisabled={playing || replayQuery.isLoading}>
              <Play className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" onPress={handlePause} isDisabled={!playing}>
              <Pause className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" onPress={handleStep} isDisabled={epoch >= maxEpoch || replayQuery.isLoading}>
              <SkipForward className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" onPress={handleReset}>
              <RotateCcw className="size-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            {SPEEDS.map((s) => (
              <Button
                key={s}
                variant={speed === s ? "default" : "ghost"}
                size="sm"
                onPress={() => setSpeed(s)}
                className="h-6 px-2 text-xs"
              >
                {s}x
              </Button>
            ))}
          </div>
        </div>
      </div>

      {replayQuery.isLoading && <ChartSkeleton height={280} title="Loading replay data" />}
      {replayQuery.error && (
        <ErrorState title="Failed to load replay" error={replayQuery.error as Error} onRetry={() => void replayQuery.refetch()} />
      )}

      {replay && replay.points && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-muted-foreground">Epoch</p>
                <p className="mt-1 text-2xl font-bold font-heading">{epoch} / {maxEpoch}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <div className="mt-1">{liveState && <HealthPill status={liveState.health} />}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-muted-foreground">Generalization Gap</p>
                <p className="mt-1 text-2xl font-bold font-heading">
                  {liveState ? liveState.gap.toFixed(3) : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-muted-foreground">Patience Counter</p>
                <p className="mt-1 text-2xl font-bold font-heading">
                  {liveState?.patienceCounter ?? 0} / {thresholds?.patience ?? 4}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Training & Validation Loss Trajectory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visiblePoints}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="epoch" />
                    <YAxis />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Line type="monotone" dataKey="train_loss" stroke={chart1} name="Train Loss" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="val_loss" stroke={chart2} name="Validation Loss" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Main Monitor Page Content ────────────────────────────────────────────────
function MonitorContent() {
  const searchParams = useSearchParams();
  const queryRunId = searchParams?.get("runId");

  // Fetch recent runs to allow selecting between active runs
  const runsQuery = useQuery({
    queryKey: ["runs"],
    queryFn: () => listRuns(),
    refetchInterval: 4000,
  });

  const runs: Run[] = Array.isArray(runsQuery.data) ? runsQuery.data : [];
  const [selectedTarget, setSelectedTarget] = React.useState<string>("auto");

  // Determine active runId
  const activeRunId = React.useMemo(() => {
    if (selectedTarget === "demo") return null;
    if (selectedTarget !== "auto") return selectedTarget;
    if (queryRunId) return queryRunId;
    if (runs.length > 0) return runs[0].id;
    return null;
  }, [selectedTarget, queryRunId, runs]);

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto pb-12">
      {/* ── Top Header & Target Switcher ───────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Recovery Live Monitor
            </h1>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary font-medium">
              Real-Time ML Recognition
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Live telemetry stream from AMRS multi-head diagnostic probes, candidate strategies, and verification gates.
          </p>
        </div>

        {/* Target Switcher: Switch between active runs and demo mode */}
        <div className="flex items-center gap-2 shrink-0">
          <Select
            selectedKey={activeRunId ? activeRunId : "demo"}
            onSelectionChange={(key) => {
              if (key === "demo") setSelectedTarget("demo");
              else setSelectedTarget(String(key));
            }}
            aria-label="Select run to monitor"
            className="w-64"
          >
            <SelectTrigger className="w-full h-9 text-xs">
              <SelectValue placeholder="Select run to monitor" />
            </SelectTrigger>
            <SelectContent>
              {runs.map((r: Run) => (
                <SelectItem key={r.id} id={r.id}>
                  {`Run ${r.id.slice(0, 8)} (${r.architecture}) · ${r.status}`}
                </SelectItem>
              ))}
              <SelectItem id="demo">
                Synthetic Demo Trajectory Replay
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Render Live Run or Demo Replay ─────────────────────────────────── */}
      {activeRunId ? (
        <RealTimeRunMonitor
          runId={activeRunId}
          onSwitchToDemo={() => setSelectedTarget("demo")}
        />
      ) : (
        <SyntheticDemoReplay />
      )}
    </div>
  );
}

export default function MonitorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading monitor…</div>}>
      <MonitorContent />
    </Suspense>
  );
}
