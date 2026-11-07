"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Gauge,
  Layers,
  Zap,
  Cpu,
  ShieldCheck,
  Upload,
  X,
  FileIcon,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { createRun, getConfigPreview, isApiError } from "@/lib/api";
import type { ScenarioId } from "@/lib/api/types";
import { newRunFormSchema, type NewRunForm, architectures, datasets } from "@/lib/schemas/recovery";
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
import { cn } from "@/lib/utils";

// ─── Scenario cards ───────────────────────────────────────────────────────────
interface ScenarioMeta {
  id: ScenarioId;
  name: string;
  failureMode: string;
  expectedRecovery: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SCENARIOS: ScenarioMeta[] = [
  {
    id: "S1",
    name: "Overfit",
    failureMode: "Generalization gap divergence — val loss rises while train loss falls",
    expectedRecovery: "Checkpoint reversion or selective L2-SP fine-tuning",
    icon: TrendingUp,
  },
  {
    id: "S2",
    name: "Miscalibrated",
    failureMode: "Elevated ECE despite high top-1 accuracy; confidence misalignment",
    expectedRecovery: "Post-hoc temperature scaling on holdout logits",
    icon: Gauge,
  },
  {
    id: "S3",
    name: "BN Drift",
    failureMode: "BatchNorm running stats diverge from evaluation distribution",
    expectedRecovery: "BatchNorm recalibration across target domain samples",
    icon: Layers,
  },
  {
    id: "S4",
    name: "Unstable Training",
    failureMode: "Gradient spikes and oscillatory validation accuracy",
    expectedRecovery: "Weight interpolation (SWA / Polyak averaging)",
    icon: Zap,
  },
  {
    id: "S5",
    name: "Degraded Head",
    failureMode: "Classification head collapses; backbone features remain intact",
    expectedRecovery: "Last-layer retraining on balanced holdout slice",
    icon: Cpu,
  },
  {
    id: "S6",
    name: "Healthy Control",
    failureMode: "Nominal training trajectory — no actionable failure mode",
    expectedRecovery: "No recovery action required",
    icon: ShieldCheck,
  },
];

// ─── Scenario selector ────────────────────────────────────────────────────────
function ScenarioSelector({
  value,
  onChange,
  error,
}: {
  value: ScenarioId | undefined;
  onChange: (id: ScenarioId) => void;
  error?: string;
}) {
  return (
    <fieldset className="w-full">
      <legend className="sr-only">Choose a scenario</legend>
      {error && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-destructive" role="alert">
          <AlertCircle className="size-3.5" aria-hidden /> {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
        {SCENARIOS.map((s) => {
          const Icon = s.icon;
          const selected = value === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              aria-pressed={selected}
              className={cn(
                "group relative flex flex-col justify-between min-h-[175px] gap-3 rounded-2xl border p-5 md:p-6 text-left transition-all outline-none w-full",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                selected
                  ? "border-primary ring-2 ring-primary shadow-md bg-primary/8"
                  : "border-border bg-card hover:border-primary/50 hover:bg-card/90 hover:shadow-xs"
              )}
            >
              <div>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className={cn(
                    "flex size-10 items-center justify-center rounded-xl transition-colors shrink-0",
                    selected ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary"
                  )}>
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <span className="font-semibold text-base tracking-tight text-foreground">{s.name}</span>
                  <Badge variant="outline" className="ml-auto text-xs font-mono px-2 py-0.5">{s.id}</Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.failureMode}</p>
              </div>

              <div className="rounded-xl bg-primary/5 border border-primary/10 p-2.5 mt-2">
                <p className="text-xs text-primary font-medium leading-relaxed">
                  <span className="font-bold">Recovery:</span> {s.expectedRecovery}
                </p>
              </div>

              {selected && (
                <span className="absolute top-4 right-14">
                  <CheckCircle2 className="size-5 text-primary" aria-hidden />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// ─── Dropzone ─────────────────────────────────────────────────────────────────
function ModelDropzone({
  value,
  onChange,
  error,
}: {
  value: File | undefined;
  onChange: (file: File | undefined) => void;
  error?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  function handleFiles(files: FileList | null) {
    const f = files?.[0];
    if (f) onChange(f);
  }

  return (
    <div className="w-full">
      {!value ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          className={cn(
            "flex flex-col items-center justify-center gap-3.5 rounded-2xl border-2 border-dashed p-10 md:p-14 text-center transition-colors cursor-pointer w-full",
            dragging ? "border-primary bg-primary/5" : error ? "border-destructive/50 bg-destructive/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
          )}
          role="button"
          tabIndex={0}
          aria-label="Click or drag a .pt or .pth file to upload"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Upload className="size-6" aria-hidden />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Drop your model file here</p>
            <p className="text-sm text-muted-foreground mt-1">
              Accepts <code>.pt</code> or <code>.pth</code> checkpoint files · click to browse from device
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted/30 px-5 py-4 w-full">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <FileIcon className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{value.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{(value.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onPress={() => onChange(undefined)}
            aria-label="Remove selected file"
            className="rounded-lg"
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pt,.pth"
        className="sr-only"
        aria-label="Model checkpoint file"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive" role="alert">
          <AlertCircle className="size-3.5" aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}

// ─── Config preview card ──────────────────────────────────────────────────────
const STRATEGY_COST_LABELS: Record<string, string> = {
  temperature_scaling:     "Temperature Scaling",
  bn_recalibration:        "BN Recalibration",
  last_layer_retraining:   "Last-Layer Retraining",
  selective_finetune_l2sp: "Selective Fine-Tune + L2-SP",
  checkpoint_reversion:    "Checkpoint Reversion",
  weight_interpolation:    "Weight Interpolation",
};

function ConfigPreviewCard({ scenarioId }: { scenarioId: ScenarioId }) {
  const query = useQuery({
    queryKey: ["configPreview", scenarioId],
    queryFn: () => getConfigPreview(scenarioId),
  });

  if (query.isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto size-5 animate-spin text-primary mb-2" aria-hidden />
          Loading configuration…
        </CardContent>
      </Card>
    );
  }

  if (!query.data) return null;

  const c = query.data;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Configuration Preview</CardTitle>
        <CardDescription>
          Read-only — these parameters will be applied to your recovery run
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Split */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Data Split</h4>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-lg bg-muted px-3 py-1 font-medium">Train {Math.round(c.split.train * 100)}%</span>
              <span className="rounded-lg bg-muted px-3 py-1 font-medium">Val {Math.round(c.split.val * 100)}%</span>
              <span className="rounded-lg bg-primary/15 text-primary px-3 py-1 font-semibold">Holdout {Math.round(c.split.holdout * 100)}%</span>
            </div>
          </div>

          {/* Compute budget */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Compute Budget</h4>
            <div className="text-2xl font-bold tracking-tight text-foreground">{c.compute_budget_cu} <span className="text-sm font-normal text-muted-foreground">CU</span></div>
          </div>

          {/* Strategy order */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 sm:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Strategy Order (Cheapest First)</h4>
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {c.strategy_order.map((s, i) => (
                <li key={s.strategy} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border/60 text-xs font-medium">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[11px] font-bold">
                    {i + 1}
                  </span>
                  <span className="truncate flex-1">{STRATEGY_COST_LABELS[s.strategy] ?? s.strategy}</span>
                  <Badge variant="outline" className="font-mono text-[10px] shrink-0">{s.cost_units.toFixed(1)} CU</Badge>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Acceptance policy */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Acceptance Policy</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
              <div className="text-xl font-bold text-foreground">+{(c.acceptance_policy.min_accuracy_gain * 100).toFixed(1)} pp</div>
              <div className="text-xs text-muted-foreground mt-0.5">Min accuracy gain</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
              <div className="text-xl font-bold text-foreground">{(c.acceptance_policy.max_ece * 100).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground mt-0.5">Max ECE</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
              <div className="text-xl font-bold text-foreground">{(c.acceptance_policy.min_retention * 100).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground mt-0.5">Min retention</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RunRecoveryPage() {
  const router = useRouter();
  const [conflictRunId, setConflictRunId] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<NewRunForm>({
    resolver: zodResolver(newRunFormSchema),
    mode: "onChange",
    defaultValues: {
      scenarioId: undefined,
      file: undefined,
      architecture: undefined,
      dataset: undefined,
    },
  });

  const scenarioId = watch("scenarioId");
  const file = watch("file");
  const architecture = watch("architecture");

  async function onSubmit(data: NewRunForm) {
    setSubmitError(null);
    setConflictRunId(null);
    try {
      const runId = await createRun({
        scenario_id: data.scenarioId,
        architecture: data.architecture,
      });
      router.push(`/runs/${runId}`);
    } catch (err) {
      if (isApiError(err) && err.status === 409) {
        // Extract active run id from message: "Run 'run-amrs-XXX' is currently active"
        const match = /Run '([^']+)'/.exec(err.message);
        setConflictRunId(match?.[1] ?? null);
        setSubmitError(err.message);
      } else {
        setSubmitError(err instanceof Error ? err.message : "Failed to start recovery run");
      }
    }
  }

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Run Recovery
          </h1>
          <Badge variant="outline" className="text-xs text-muted-foreground">Demo data</Badge>
        </div>
        <p className="text-sm md:text-base text-muted-foreground">
          Choose a failure scenario, upload your model checkpoint, and start an automated recovery run.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8 w-full">
        {/* ── Step 1 ────────────────────────────────────────────────────── */}
        <section aria-labelledby="step1-heading" className="w-full">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-xs" aria-hidden>1</span>
            <h2 id="step1-heading" className="font-heading text-lg font-semibold text-foreground">
              Choose a scenario
            </h2>
          </div>
          <Controller
            name="scenarioId"
            control={control}
            render={({ field }) => (
              <ScenarioSelector
                value={field.value}
                onChange={field.onChange}
                error={errors.scenarioId?.message}
              />
            )}
          />
        </section>

        {/* ── Step 2 ────────────────────────────────────────────────────── */}
        <section aria-labelledby="step2-heading" className="w-full">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-xs" aria-hidden>2</span>
            <h2 id="step2-heading" className="font-heading text-lg font-semibold text-foreground">
              Upload your model
            </h2>
          </div>
          <Card className="w-full">
            <CardContent className="space-y-6 p-6 md:p-8">
              {/* Dropzone */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Model checkpoint <span className="text-destructive" aria-hidden>*</span>
                </label>
                <Controller
                  name="file"
                  control={control}
                  render={({ field }) => (
                    <ModelDropzone
                      value={field.value instanceof File ? field.value : undefined}
                      onChange={field.onChange}
                      error={errors.file?.message as string | undefined}
                    />
                  )}
                />
              </div>

              {/* Architecture & Dataset in wide responsive 2-column grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 w-full">
                {/* Architecture */}
                <div>
                  <label className="mb-2 block text-sm font-semibold" id="arch-label">
                    Architecture <span className="text-destructive" aria-hidden>*</span>
                  </label>
                  <Controller
                    name="architecture"
                    control={control}
                    render={({ field }) => (
                      <Select
                        selectedKey={field.value ?? null}
                        onSelectionChange={(k) => field.onChange(k)}
                        aria-labelledby="arch-label"
                        className="w-full"
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select architecture" />
                        </SelectTrigger>
                        <SelectContent>
                          {architectures.map((a) => (
                            <SelectItem key={a} id={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.architecture && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-destructive" role="alert">
                      <AlertCircle className="size-3.5" aria-hidden /> {errors.architecture.message}
                    </p>
                  )}
                </div>

                {/* Dataset */}
                <div>
                  <label className="mb-2 block text-sm font-semibold" id="ds-label">
                    Dataset <span className="text-destructive" aria-hidden>*</span>
                  </label>
                  <Controller
                    name="dataset"
                    control={control}
                    render={({ field }) => (
                      <Select
                        selectedKey={field.value ?? null}
                        onSelectionChange={(k) => field.onChange(k)}
                        aria-labelledby="ds-label"
                        className="w-full"
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select dataset" />
                        </SelectTrigger>
                        <SelectContent>
                          {datasets.map((d) => (
                            <SelectItem key={d} id={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.dataset && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-destructive" role="alert">
                      <AlertCircle className="size-3.5" aria-hidden /> {errors.dataset.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ── Step 3 ────────────────────────────────────────────────────── */}
        {scenarioId && (
          <section aria-labelledby="step3-heading">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold" aria-hidden>3</span>
              <h2 id="step3-heading" className="font-heading text-base font-semibold text-foreground">
                Configuration preview
              </h2>
            </div>
            <ConfigPreviewCard scenarioId={scenarioId} />
          </section>
        )}

        {/* ── Conflict alert ────────────────────────────────────────────── */}
        {submitError && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <div>
              <p className="font-medium text-destructive">{submitError}</p>
              {conflictRunId && (
                <Link
                  href={`/runs/${conflictRunId}`}
                  className="mt-1 inline-flex items-center gap-1 text-xs underline text-destructive hover:opacity-80"
                >
                  View active run {conflictRunId}
                  <ArrowRight className="size-3" aria-hidden />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Sticky summary bar ────────────────────────────────────────── */}
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              {scenarioId
                ? `Scenario ${scenarioId} selected${architecture ? ` · ${architecture}` : ""}${file ? ` · ${file.name}` : ""}`
                : "Complete all steps to enable recovery"}
            </div>
            <Button
              type="submit"
              variant="default"
              size="default"
              isDisabled={!isValid || isSubmitting}
              className="gap-1.5 w-full sm:w-auto"
              aria-label="Start recovery run"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ArrowRight className="size-4" aria-hidden />
              )}
              {isSubmitting ? "Starting…" : "Start recovery"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
