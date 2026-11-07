"use client";

import * as React from "react";
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
} from "lucide-react";
import Link from "next/link";
import { startMonitorReplay } from "@/lib/api";
import type { MonitorPoint, MonitorEvent, ScenarioId } from "@/lib/api/types";
import { getMonitorThresholds } from "@/lib/api/recovery";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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

// ─── Event icon ───────────────────────────────────────────────────────────────
const EVENT_ICONS = {
  overfit_warning:    AlertTriangle,
  instability_warning:AlertTriangle,
  trigger:            Zap,
  action:             Activity,
  cooldown:           Clock,
} as const;

const EVENT_COLORS = {
  overfit_warning:     "text-verdict-rolled-back-fg",
  instability_warning: "text-verdict-rolled-back-fg",
  trigger:             "text-verdict-error-fg",
  action:              "text-primary",
  cooldown:            "text-verdict-healthy-fg",
} as const;

const REF_LINE_COLORS = {
  overfit_warning:     "oklch(0.56 0.18 68)",
  instability_warning: "oklch(0.56 0.18 68)",
  trigger:             "oklch(0.50 0.22 25)",
  action:              "oklch(0.52 0.22 288)",
  cooldown:            "oklch(0.44 0.08 240)",
} as const;

// ─── Replay scenarios ─────────────────────────────────────────────────────────
const REPLAY_OPTIONS: Array<{ scenarioId: ScenarioId; label: string }> = [
  { scenarioId: "S1", label: "S1 Overfit Replay" },
  { scenarioId: "S4", label: "S4 Instability Replay" },
];

const SPEEDS = [1, 2] as const;
type Speed = (typeof SPEEDS)[number];

// ─── Compute monitor health from epoch data ───────────────────────────────────
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

// ─── Main monitor page ────────────────────────────────────────────────────────
export default function MonitorPage() {
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

  // Playback timer
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const maxEpoch = replay?.points.length ?? 0;

  React.useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!playing || isReducedMotion) return;
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

  // Compute visible data
  const visiblePoints = React.useMemo(
    () => (replay?.points ?? []).filter((p) => p.epoch <= epoch),
    [replay, epoch]
  );

  const visibleEvents = React.useMemo(
    () => (replay?.events ?? []).filter((e) => e.epoch <= epoch),
    [replay, epoch]
  );

  const thresholds = thresholdsQuery.data;
  const liveState = React.useMemo(() => {
    if (!replay || !thresholds) return null;
    return computeHealth(
      replay.points,
      replay.events,
      epoch,
      thresholds.patience,
    );
  }, [replay, epoch, thresholds]);

  const chart1 = useCssVar("--chart-1", "oklch(0.52 0.22 288)");
  const chart2 = useCssVar("--chart-2", "oklch(0.46 0.20 272)");
  const chart5 = useCssVar("--chart-5", "oklch(0.56 0.19 50)");
  const chart4 = useCssVar("--chart-4", "oklch(0.62 0.15 240)");
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
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Live Monitor
            </h1>
            <Badge variant="outline" className="text-[11px] text-muted-foreground">Demo data</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Replay training epoch-by-epoch and watch AMRS detect anomalies in real time.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {REPLAY_OPTIONS.map((r) => (
                <SelectItem key={r.scenarioId} id={r.scenarioId}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1" role="group" aria-label="Playback controls">
            <Button variant="ghost" size="icon-sm" onPress={handlePlay} isDisabled={playing || replayQuery.isLoading} aria-label="Play">
              <Play className="size-3.5" aria-hidden />
            </Button>
            <Button variant="ghost" size="icon-sm" onPress={handlePause} isDisabled={!playing} aria-label="Pause">
              <Pause className="size-3.5" aria-hidden />
            </Button>
            <Button variant="ghost" size="icon-sm" onPress={handleStep} isDisabled={epoch >= maxEpoch || replayQuery.isLoading} aria-label="Step forward one epoch">
              <SkipForward className="size-3.5" aria-hidden />
            </Button>
            <Button variant="ghost" size="icon-sm" onPress={handleReset} aria-label="Reset to beginning">
              <RotateCcw className="size-3.5" aria-hidden />
            </Button>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1" role="group" aria-label="Playback speed">
            {SPEEDS.map((s) => (
              <Button
                key={s}
                variant={speed === s ? "default" : "ghost"}
                size="sm"
                onPress={() => setSpeed(s)}
                aria-pressed={speed === s}
                className="h-6 px-2 text-xs"
              >
                {s}x
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Loading / error ───────────────────────────────────────────────── */}
      {replayQuery.isLoading && <ChartSkeleton height={280} title="Loading replay data" />}
      {replayQuery.error && (
        <ErrorState title="Failed to load replay" error={replayQuery.error as Error} onRetry={() => void replayQuery.refetch()} />
      )}

      {replay && (
        <>
          {/* ── Live status card ──────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground font-medium">Current Epoch</p>
                <p className="mt-1 text-2xl font-bold">{epoch} / {maxEpoch}</p>
                <p className="text-xs text-muted-foreground">of {maxEpoch} total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground font-medium">Train/Val Gap</p>
                <p className="mt-1 text-2xl font-bold font-mono">
                  {liveState ? Math.abs(liveState.gap).toFixed(3) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">smoothed loss delta</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground font-medium">Patience Counter</p>
                <p className="mt-1 text-2xl font-bold font-mono">
                  {liveState?.patienceCounter ?? 0} / {thresholds?.patience ?? 5}
                </p>
                <p className="text-xs text-muted-foreground">epochs above threshold</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground font-medium">Status</p>
                <div className="mt-2">
                  {liveState ? <HealthPill status={liveState.health} /> : <HealthPill status="healthy" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {liveState?.inCooldown ? `Cooldown: ${liveState.cooldownRemaining} ep remaining` : ""}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── Loss chart ────────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Training Loss</CardTitle>
              <CardDescription>Train vs validation loss with event markers</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={visiblePoints}
                  margin={{ top: 8, right: 16, left: -8, bottom: 24 }}
                  aria-label="Training and validation loss over epochs"
                  role="img"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.68 0.06 290 / 0.25)" />
                  <XAxis
                    dataKey="epoch"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    label={{
                      value: "Epoch",
                      position: "insideBottom",
                      offset: -14,
                      fontSize: 11,
                      fill: "var(--muted-foreground)",
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingBottom: "12px", fontSize: "12px" }}
                  />
                  {visibleEvents.map((ev) => (
                    <ReferenceLine
                      key={`${ev.epoch}-${ev.type}`}
                      x={ev.epoch}
                      stroke={REF_LINE_COLORS[ev.type as keyof typeof REF_LINE_COLORS] ?? "oklch(0.52 0.22 288)"}
                      strokeDasharray="4 2"
                      label={{
                        value: ev.type.replace(/_/g, " "),
                        position: "top",
                        fontSize: 9,
                        fill: REF_LINE_COLORS[ev.type as keyof typeof REF_LINE_COLORS] ?? "oklch(0.52 0.22 288)",
                      }}
                    />
                  ))}
                  <Line type="monotone" dataKey="train_loss" name="Train Loss" stroke={chart1} dot={false} strokeWidth={2} isAnimationActive={false} />
                  <Line type="monotone" dataKey="val_loss" name="Val Loss" stroke={chart5} dot={false} strokeWidth={2} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
              <p className="mt-2 text-xs text-muted-foreground">
                Validation loss diverging from train loss signals overfitting — AMRS triggers recovery when the gap exceeds the configured threshold.
              </p>
            </CardContent>
          </Card>

          {/* ── Accuracy chart ────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Training Accuracy</CardTitle>
              <CardDescription>Train vs validation accuracy with event markers</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={visiblePoints}
                  margin={{ top: 8, right: 16, left: -8, bottom: 24 }}
                  aria-label="Training and validation accuracy over epochs"
                  role="img"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.68 0.06 290 / 0.25)" />
                  <XAxis
                    dataKey="epoch"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    label={{
                      value: "Epoch",
                      position: "insideBottom",
                      offset: -14,
                      fontSize: 11,
                      fill: "var(--muted-foreground)",
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  />
                  <Tooltip formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`} contentStyle={tooltipStyle} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingBottom: "12px", fontSize: "12px" }}
                  />
                  {visibleEvents.map((ev) => (
                    <ReferenceLine
                      key={`acc-${ev.epoch}-${ev.type}`}
                      x={ev.epoch}
                      stroke={REF_LINE_COLORS[ev.type as keyof typeof REF_LINE_COLORS] ?? "oklch(0.52 0.22 288)"}
                      strokeDasharray="4 2"
                    />
                  ))}
                  <Line type="monotone" dataKey="train_acc" name="Train Accuracy" stroke={chart2} dot={false} strokeWidth={2} isAnimationActive={false} />
                  <Line type="monotone" dataKey="val_acc" name="Val Accuracy" stroke={chart4} dot={false} strokeWidth={2} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
              <p className="mt-2 text-xs text-muted-foreground">
                Validation accuracy decline below the train accuracy curve confirms the generalization failure detected by the loss monitor.
              </p>
            </CardContent>
          </Card>

          {/* ── Event log ─────────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Event Log</CardTitle>
              <CardDescription>AMRS events revealed as playback reaches their epoch</CardDescription>
            </CardHeader>
            <CardContent>
              {visibleEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events yet — advance playback to see AMRS events.</p>
              ) : (
                <ul className="space-y-2" aria-label="Monitor event log" aria-live="polite">
                  {visibleEvents.map((ev, i) => {
                    const Icon = EVENT_ICONS[ev.type as keyof typeof EVENT_ICONS] ?? Activity;
                    const color = EVENT_COLORS[ev.type as keyof typeof EVENT_COLORS] ?? "text-muted-foreground";
                    return (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="mt-0.5 shrink-0">
                          <Icon className={cn("size-4", color)} aria-hidden />
                        </span>
                        <div>
                          <span className="font-mono text-xs text-muted-foreground">Epoch {ev.epoch}</span>
                          <p className="leading-snug">{ev.message}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* ── Follow-up recovery card ───────────────────────────────────── */}
          {replay.followup && epoch >= maxEpoch && (
            <div>
              <VerdictBanner
                verdict={replay.followup.verdict}
                explanation={replay.followup.summary}
                action={
                  <Link href="/runs/run-amrs-001" className="text-xs underline underline-offset-2 hover:opacity-80">
                    View run →
                  </Link>
                }
              />
            </div>
          )}

          {/* ── Thresholds card ───────────────────────────────────────────── */}
          {thresholds && (
            <Card>
              <CardHeader>
                <CardTitle>AMRS Thresholds</CardTitle>
                <CardDescription>Read-only configuration — these parameters govern when AMRS intervenes</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Patience</dt>
                    <dd className="mt-1 text-sm font-semibold">{thresholds.patience} epochs</dd>
                    <dd className="text-xs text-muted-foreground">Consecutive epochs above gap threshold before triggering</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Smoothing Window</dt>
                    <dd className="mt-1 text-sm font-semibold">{thresholds.smoothing_window} epochs</dd>
                    <dd className="text-xs text-muted-foreground">Exponential moving average window for gap calculation</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cooldown Epochs</dt>
                    <dd className="mt-1 text-sm font-semibold">{thresholds.cooldown_epochs} epochs</dd>
                    <dd className="text-xs text-muted-foreground">Post-action monitoring period before re-enabling triggers</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gap Threshold</dt>
                    <dd className="mt-1 text-sm font-semibold">{thresholds.gap_threshold.toFixed(2)}</dd>
                    <dd className="text-xs text-muted-foreground">Smoothed train–val loss delta that activates the patience counter</dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                  Smoothing and patience together prevent false triggers from transient noise — AMRS only acts when the gap is sustained, not momentary.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
