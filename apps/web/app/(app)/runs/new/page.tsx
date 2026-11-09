"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Upload,
  X,
  FileIcon,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  Database as DatabaseIcon,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-user";
import { createRun, isApiError, uploadModel, uploadDataset, detectModelArchitecture } from "@/lib/api";
import { addNotification } from "@/lib/notifications";
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
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-3.5 rounded-2xl border-2 border-dashed p-10 md:p-14 text-center transition-all cursor-pointer w-full group",
            dragging
              ? "border-primary bg-primary/10 scale-[1.005]"
              : error
                ? "border-destructive/60 bg-destructive/5"
                : "border-border/80 bg-card/60 hover:border-primary/60 hover:bg-primary/5 hover:shadow-md"
          )}
          role="button"
          tabIndex={0}
          aria-label="Click or drag a .pt or .pth file to upload"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform shadow-xs">
            <Upload className="size-7" aria-hidden />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground tracking-tight">
              Drop your model checkpoint file here
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports PyTorch <code className="text-primary font-mono font-medium">.pt</code> or{" "}
              <code className="text-primary font-mono font-medium">.pth</code> weights files · Click to browse from local device
            </p>
          </div>
          <Badge variant="outline" className="text-xs bg-muted/40 border-border/80 mt-1">
            Safe inspection with weights_only=True
          </Badge>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 w-full shadow-xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="size-11 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
              <FileIcon className="size-6" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground">{value.name}</p>
                <CheckCircle2 className="size-4 text-primary shrink-0" aria-hidden />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(value.size / (1024 * 1024)).toFixed(2)} MB · Ready for automated ML multi-head diagnosis
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onPress={() => onChange(undefined)}
            aria-label="Remove selected file"
            className="rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
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

// ─── Custom Dataset Dropzone ──────────────────────────────────────────────────
function DatasetDropzone({
  value,
  onChange,
}: {
  value: File | undefined;
  onChange: (file: File | undefined) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="w-full mt-3">
      {!value ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors text-xs text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <DatabaseIcon className="size-4 text-primary" />
            <span>Optional: Click to attach custom dataset (<code className="font-mono">.npz</code>, <code className="font-mono">.pt</code>, <code className="font-mono">.csv</code>)</span>
          </div>
          <Badge variant="outline" className="text-[10px]">Browse</Badge>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs">
          <div className="flex items-center gap-2 truncate">
            <DatabaseIcon className="size-4 text-primary shrink-0" />
            <span className="font-medium text-foreground truncate">{value.name}</span>
            <span className="text-muted-foreground">({(value.size / (1024 * 1024)).toFixed(2)} MB)</span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onPress={() => onChange(undefined)}
            aria-label="Remove dataset file"
            className="h-6 w-6 rounded-md hover:text-destructive"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".npz,.pt,.pth,.csv"
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0])}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RunRecoveryPage() {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const [conflictRunId, setConflictRunId] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitErrorDetails, setSubmitErrorDetails] = React.useState<Record<string, unknown> | null>(null);
  const [detectingArch, setDetectingArch] = React.useState(false);
  const [detectedInfo, setDetectedInfo] = React.useState<{
    arch: string;
    confidence: number;
    suggestedDataset?: string | null;
    numTensors?: number;
  } | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<NewRunForm>({
    resolver: zodResolver(newRunFormSchema as any),
    mode: "onChange",
    defaultValues: {
      file: undefined,
      architecture: "resnet18_cifar",
      dataset: "CIFAR-10 sample",
      datasetFile: undefined,
    },
  });

  const file = watch("file");
  const architecture = watch("architecture");
  const dataset = watch("dataset");

  React.useEffect(() => {
    if (!file || !(file instanceof File)) {
      setDetectedInfo(null);
      setDetectingArch(false);
      return;
    }

    let isMounted = true;
    async function runDetection(f: File) {
      setDetectingArch(true);
      try {
        const res = await detectModelArchitecture(f);
        if (!isMounted) return;
        setDetectedInfo({
          arch: res.detected_arch,
          confidence: res.confidence,
          suggestedDataset: res.suggested_dataset,
          numTensors: res.num_tensors,
        });

        if (res.detected_arch) {
          setValue("architecture", res.detected_arch as "resnet18_cifar" | "small_cnn" | "mlp_small", {
            shouldValidate: true,
          });
        }

        if (res.suggested_dataset && (datasets as readonly string[]).includes(res.suggested_dataset)) {
          setValue("dataset", res.suggested_dataset as any, {
            shouldValidate: true,
          });
        }
      } catch (e) {
        console.warn("Architecture auto-detection fallback error:", e);
      } finally {
        if (isMounted) setDetectingArch(false);
      }
    }

    runDetection(file);

    return () => {
      isMounted = false;
    };
  }, [file, setValue]);

  async function onSubmit(data: NewRunForm) {
    setSubmitError(null);
    setSubmitErrorDetails(null);
    setConflictRunId(null);
    try {
      let modelUploadId: string | undefined = undefined;
      let datasetUploadId: string | undefined = undefined;

      // 1. Upload model checkpoint
      if (data.file instanceof File) {
        const uploadRes = await uploadModel(data.file, data.architecture, currentUser?.id);
        modelUploadId = uploadRes.model_upload_id;
        addNotification({
          title: `Model uploaded: ${data.file.name}`,
          description: `Architecture: ${data.architecture} (${(data.file.size / 1024).toFixed(1)} KB verified)`,
          type: "upload",
          href: "/history",
          userId: currentUser?.id,
        });
      }

      // 2. Upload custom dataset if provided
      if (data.datasetFile instanceof File) {
        try {
          const dsRes = await uploadDataset(data.datasetFile, data.dataset, currentUser?.id);
          datasetUploadId = dsRes.dataset_upload_id;
          addNotification({
            title: `Dataset uploaded: ${data.datasetFile.name}`,
            description: `Split: ${data.dataset} (${(data.datasetFile.size / 1024).toFixed(1)} KB)`,
            type: "upload",
            href: "/history",
            userId: currentUser?.id,
          });
        } catch (dsErr) {
          console.warn("Dataset upload notice:", dsErr);
        }
      }

      // 3. Dispatch automated recovery run (no manual scenario required; ML diagnoses automatically)
      const runId = await createRun({
        architecture: data.architecture,
        arch: data.architecture,
        model_upload_id: modelUploadId,
        dataset_upload_id: datasetUploadId,
        config_override: datasetUploadId ? { dataset_upload_id: datasetUploadId } : {},
        user_id: currentUser?.id,
      } as any);

      addNotification({
        title: `Recovery run dispatched`,
        description: `Run ${runId.slice(0, 8)} started for ${data.architecture}`,
        type: "run_queued",
        runId,
        href: `/monitor?runId=${runId}`,
        userId: currentUser?.id,
      });

      // 4. Redirect to the live monitor route for real-time recognition streaming
      router.push(`/monitor?runId=${runId}`);
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 409) {
          const match = /Run '([^']+)'/.exec(err.message);
          setConflictRunId(match?.[1] ?? null);
        }
        setSubmitError(err.message);
        if (err.details && typeof err.details === "object") {
          setSubmitErrorDetails(err.details as Record<string, unknown>);
        } else {
          setSubmitErrorDetails(null);
        }
      } else {
        setSubmitError(err instanceof Error ? err.message : "Failed to start recovery run");
        setSubmitErrorDetails(null);
      }
    }
  }

  return (
    <div className="space-y-8 w-full max-w-5xl mx-auto pb-12">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Run Recovery
          </h1>
          <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary font-medium px-2.5 py-0.5">
            <Sparkles className="size-3 mr-1 inline" /> Fully Automated ML System
          </Badge>
        </div>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          Upload your model checkpoint. AMRS automatically initiates multi-head diagnostic probes (analyzing generalization gap, calibration drift, batchnorm divergence, and gradient stability) and executes verified holdout-gated recovery strategies.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 w-full">
        {/* ── Model Upload Card ─────────────────────────────────────────── */}
        <Card className="w-full border-border/80 shadow-xs">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                1
              </span>
              <CardTitle className="text-lg font-semibold text-foreground">
                Upload Model Checkpoint
              </CardTitle>
            </div>
            <CardDescription>
              Drop your model weights file. AMRS validates safe unpickling and inspects tensor dimensions automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-0">
            <div>
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

            {/* Architecture & Dataset */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-border/60">
              {/* Architecture Display (Automated from checkpoint upload, no manual select) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground" id="arch-label">
                    Model Architecture
                  </label>
                  {detectedInfo && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                      <Sparkles className="size-2.5 mr-1 inline" /> Auto-detected
                    </Badge>
                  )}
                </div>

                {detectingArch ? (
                  <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-primary/30 bg-primary/5 text-xs text-primary animate-pulse">
                    <Loader2 className="size-4 animate-spin shrink-0" />
                    <span>Analyzing checkpoint tensors & layer hierarchy...</span>
                  </div>
                ) : detectedInfo ? (
                  <div className="flex items-center justify-between h-11 px-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-sm font-medium text-foreground">
                    <div className="flex items-center gap-2.5 truncate">
                      <Cpu className="size-4 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        {detectedInfo.arch === "resnet18_cifar"
                          ? "ResNet-18 (CIFAR / 32×32 Stem)"
                          : detectedInfo.arch === "small_cnn"
                            ? "Small CNN (3 Conv Blocks + BN)"
                            : "Compact MLP (Tabular / Flattened)"}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shrink-0">
                      {Math.round(detectedInfo.confidence * 100)}% match
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-dashed border-border/80 bg-muted/20 text-xs text-muted-foreground">
                    <Cpu className="size-4 opacity-50 shrink-0" />
                    <span>Automatically detected upon model checkpoint upload</span>
                  </div>
                )}

                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {detectedInfo
                    ? `${detectedInfo.numTensors ?? 0} layer tensors inspected via safe weights_only unpickling`
                    : "Architecture registry entry matching checkpoint layer tensors"}
                </p>
                {errors.architecture && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-destructive" role="alert">
                    <AlertCircle className="size-3.5" aria-hidden /> {errors.architecture.message}
                  </p>
                )}
              </div>

              {/* Dataset Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground" id="ds-label">
                    Evaluation Dataset <span className="text-destructive">*</span>
                  </label>
                  {detectedInfo?.suggestedDataset && (
                    <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/30 text-primary">
                      <Sparkles className="size-2.5 mr-1 inline" /> Auto-matched
                    </Badge>
                  )}
                </div>
                <Controller
                  name="dataset"
                  control={control}
                  render={({ field }) => (
                    <Select
                      selectedKey={field.value ?? "CIFAR-10 sample"}
                      onSelectionChange={(k) => field.onChange(k)}
                      aria-labelledby="ds-label"
                      className="w-full"
                    >
                      <SelectTrigger className="w-full h-11 bg-card">
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
                <Controller
                  name="datasetFile"
                  control={control}
                  render={({ field }) => (
                    <DatasetDropzone
                      value={field.value instanceof File ? field.value : undefined}
                      onChange={field.onChange}
                    />
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

        {/* ── Automated Pipeline Card ────────────────────────────────────── */}
        <Card className="w-full border-border/80 bg-muted/15">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                2
              </span>
              <CardTitle className="text-base font-semibold text-foreground">
                Automated ML Pipeline Execution Flow
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Zero manual configuration required. AMRS handles split ratios (70% train / 15% validation / 15% holdout gate), compute budgets, and failure detection automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-border/60 bg-card flex flex-col justify-between gap-2">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <ShieldCheck className="size-4 shrink-0" />
                  <span>1. Checkpoint Intake</span>
                </div>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  Unpickles safely with <code>weights_only=True</code> and validates state_dict tensor compatibility.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/60 bg-card flex flex-col justify-between gap-2">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Cpu className="size-4 shrink-0" />
                  <span>2. Multi-Head Diagnosis</span>
                </div>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  Probes for overfitting, calibration drift (ECE), BatchNorm shift, instability, or head collapse.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/60 bg-card flex flex-col justify-between gap-2">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Layers className="size-4 shrink-0" />
                  <span>3. Strategy Optimization</span>
                </div>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  Evaluates candidate repair strategies cheapest-first within compute budget.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/60 bg-card flex flex-col justify-between gap-2">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>4. Holdout Gate & Output</span>
                </div>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  Verifies accuracy retention on isolated holdout set and emits <code>accepted_model.pt</code>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Error & Conflict alert ────────────────────────────────────── */}
        {submitError && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <div className="space-y-2 w-full min-w-0">
              <p className="font-semibold text-destructive">{submitError}</p>
              {conflictRunId && (
                <Link
                  href={`/monitor?runId=${conflictRunId}`}
                  className="mt-1 inline-flex items-center gap-1 text-xs underline text-destructive hover:opacity-80"
                >
                  View currently active run in Monitor
                  <ArrowRight className="size-3" aria-hidden />
                </Link>
              )}
              {submitErrorDetails && (
                <div className="mt-2 text-xs text-muted-foreground bg-destructive/10 p-3 rounded-lg border border-destructive/20 space-y-1.5 font-mono">
                  {Array.isArray(submitErrorDetails.shape_mismatches) && submitErrorDetails.shape_mismatches.length > 0 && (
                    <div>
                      <span className="font-semibold text-destructive">Shape mismatches:</span>
                      <ul className="list-disc list-inside ml-2 text-foreground">
                        {submitErrorDetails.shape_mismatches.map((m, i) => (
                          <li key={i}>{String(m)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(submitErrorDetails.missing_keys) && submitErrorDetails.missing_keys.length > 0 && (
                    <div>
                      <span className="font-semibold text-destructive">Missing keys:</span>
                      <p className="ml-2 text-foreground">{submitErrorDetails.missing_keys.join(", ")}</p>
                    </div>
                  )}
                  {Array.isArray(submitErrorDetails.unexpected_keys) && submitErrorDetails.unexpected_keys.length > 0 && (
                    <div>
                      <span className="font-semibold text-destructive">Unexpected keys:</span>
                      <p className="ml-2 text-foreground">{submitErrorDetails.unexpected_keys.join(", ")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Sticky summary & submit bar ─────────────────────────────────── */}
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/85 px-4 py-3.5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 shadow-lg">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between max-w-5xl mx-auto">
            <div className="text-xs text-muted-foreground">
              {file ? (
                <span className="flex items-center gap-1.5 text-foreground font-medium">
                  <CheckCircle2 className="size-3.5 text-primary" />
                  {file.name} · {architecture} · Ready to diagnose
                </span>
              ) : (
                <span>Upload a model checkpoint (.pt or .pth) above to enable recovery</span>
              )}
            </div>
            <Button
              type="submit"
              variant="default"
              size="default"
              isDisabled={!isValid || isSubmitting}
              className="gap-2 w-full sm:w-auto font-semibold px-6 shadow-md"
              aria-label="Start automated recovery run"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-4" aria-hidden />
              )}
              {isSubmitting ? "Initiating Diagnosis…" : "Start Automated Diagnosis & Recovery"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
