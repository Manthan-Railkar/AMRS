"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { listHistoryRuns } from "@/lib/api/recovery";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { EmptyState } from "@/components/status/empty-state";
import { ErrorState } from "@/components/status/error-state";
import { TableSkeleton } from "@/components/status/skeletons";
import { formatAccuracy, formatUtcDate } from "@/lib/format";
import { cn } from "@/lib/utils";

// ─── Verdict badge ────────────────────────────────────────────────────────────
const VERDICT_META = {
  accepted:         { label: "Accepted",        icon: CheckCircle2, cls: "bg-verdict-accepted-bg text-verdict-accepted-fg border-verdict-accepted/30" },
  rolled_back:      { label: "Rolled Back",     icon: RotateCcw,    cls: "bg-verdict-rolled-back-bg text-verdict-rolled-back-fg border-verdict-rolled-back/30" },
  healthy_no_action:{ label: "Healthy",         icon: ShieldCheck,  cls: "bg-verdict-healthy-bg text-verdict-healthy-fg border-verdict-healthy/30" },
  error:            { label: "Error",           icon: AlertTriangle,cls: "bg-verdict-error-bg text-verdict-error-fg border-verdict-error/30" },
} as const;

type VerdictKey = keyof typeof VERDICT_META;

function VerdictBadge({ verdict }: { verdict: string }) {
  const meta = VERDICT_META[verdict as VerdictKey] ?? VERDICT_META.error;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        meta.cls
      )}
      aria-label={`Verdict: ${meta.label}`}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}

// ─── Sortable header ──────────────────────────────────────────────────────────
type SortKey = "created_at" | "accuracy_gain";
type SortDir = "asc" | "desc";

function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = currentKey === sortKey;
  const Icon = active ? (currentDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      aria-label={`Sort by ${label}`}
    >
      {label}
      <Icon className="size-3.5 shrink-0" aria-hidden />
    </button>
  );
}

// ─── Scenario labels ──────────────────────────────────────────────────────────
const SCENARIO_LABELS: Record<string, string> = {
  S1: "S1 Overfit",
  S2: "S2 Miscalibrated",
  S3: "S3 BN Drift",
  S4: "S4 Unstable Training",
  S5: "S5 Degraded Head",
  S6: "S6 Healthy Control",
};

const DIAGNOSIS_LABELS_DISPLAY: Record<string, string> = {
  overfitting:      "Overfitting",
  miscalibration:   "Miscalibration",
  bn_drift:         "BN Drift",
  unstable_training:"Unstable Training",
  degraded_head:    "Degraded Head",
  healthy:          "Healthy",
};

// ─── Page size ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

// ─── Main component ───────────────────────────────────────────────────────────
export function HistoryContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search      = searchParams.get("search") ?? "";
  const verdict     = searchParams.get("verdict") ?? "all";
  const scenario_id = searchParams.get("scenario") ?? "all";
  const architecture = searchParams.get("arch") ?? "all";
  const page        = Number(searchParams.get("page") ?? "1");
  const sortKey     = (searchParams.get("sort") ?? "created_at") as SortKey;
  const sortDir     = (searchParams.get("dir") ?? "desc") as SortDir;

  function updateParams(updates: Record<string, string | null>) {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "" || v === "all") {
        p.delete(k);
      } else {
        p.set(k, v);
      }
    }
    p.delete("page"); // reset page on filter change
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  function setPage(n: number) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", String(n));
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      updateParams({ sort: key, dir: sortDir === "asc" ? "desc" : "asc" });
    } else {
      updateParams({ sort: key, dir: "desc" });
    }
  }

  const query = useQuery({
    queryKey: ["historyRuns", search, verdict, scenario_id, architecture],
    queryFn: () =>
      listHistoryRuns({
        search: search || undefined,
        verdict: verdict !== "all" ? verdict : undefined,
        scenario_id: scenario_id !== "all" ? scenario_id : undefined,
        architecture: architecture !== "all" ? architecture : undefined,
      }),
  });

  // Sort client-side
  const sorted = React.useMemo(() => {
    if (!query.data) return [];
    return [...query.data].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "created_at") {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        const gainA = (a.accuracy_after ?? a.accuracy_before) - a.accuracy_before;
        const gainB = (b.accuracy_after ?? b.accuracy_before) - b.accuracy_before;
        cmp = gainA - gainB;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [query.data, sortKey, sortDir]);

  const totalCount  = sorted.length;
  const totalPages  = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
  const sliced      = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Summary counts
  const counts = React.useMemo(() => {
    if (!query.data) return { accepted: 0, rolled_back: 0, healthy: 0 };
    return {
      accepted:    query.data.filter((r) => r.verdict === "accepted").length,
      rolled_back: query.data.filter((r) => r.verdict === "rolled_back").length,
      healthy:     query.data.filter((r) => r.verdict === "healthy_no_action").length,
    };
  }, [query.data]);

  const hasFilters = search !== "" || verdict !== "all" || scenario_id !== "all" || architecture !== "all";

  function clearFilters() {
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            History
          </h1>
          <Badge variant="outline" className="text-[11px] text-muted-foreground">Demo data</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          All 31 recovery runs — search, filter, and sort by verdict, scenario, or accuracy gain.
        </p>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-end">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
          <input
            type="search"
            placeholder="Search model name…"
            value={search}
            onChange={(e) => updateParams({ search: e.target.value })}
            className="h-8 w-52 rounded-lg border border-input bg-transparent py-1 pl-8 pr-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
            aria-label="Search by model name"
          />
        </div>

        {/* Verdict */}
        <div>
          <label className="sr-only" id="verdict-label">Verdict</label>
          <Select selectedKey={verdict} onSelectionChange={(k) => updateParams({ verdict: String(k) })} aria-labelledby="verdict-label">
            <SelectTrigger className="w-36"><SelectValue placeholder="All verdicts" /></SelectTrigger>
            <SelectContent>
              <SelectItem id="all">All verdicts</SelectItem>
              <SelectItem id="accepted">Accepted</SelectItem>
              <SelectItem id="rolled_back">Rolled Back</SelectItem>
              <SelectItem id="healthy_no_action">Healthy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Scenario */}
        <div>
          <label className="sr-only" id="scenario-label">Scenario</label>
          <Select selectedKey={scenario_id} onSelectionChange={(k) => updateParams({ scenario: String(k) })} aria-labelledby="scenario-label">
            <SelectTrigger className="w-40"><SelectValue placeholder="All scenarios" /></SelectTrigger>
            <SelectContent>
              <SelectItem id="all">All scenarios</SelectItem>
              {["S1","S2","S3","S4","S5","S6"].map((s) => (
                <SelectItem key={s} id={s}>{SCENARIO_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Architecture */}
        <div>
          <label className="sr-only" id="arch-label">Architecture</label>
          <Select selectedKey={architecture} onSelectionChange={(k) => updateParams({ arch: String(k) })} aria-labelledby="arch-label">
            <SelectTrigger className="w-40"><SelectValue placeholder="All architectures" /></SelectTrigger>
            <SelectContent>
              <SelectItem id="all">All architectures</SelectItem>
              <SelectItem id="mlp_small">mlp_small</SelectItem>
              <SelectItem id="small_cnn">small_cnn</SelectItem>
              <SelectItem id="resnet18_cifar">resnet18_cifar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onPress={clearFilters} className="gap-1.5" aria-label="Clear all filters">
            <X className="size-3.5" aria-hidden /> Clear filters
          </Button>
        )}
      </div>

      {/* ── Summary ──────────────────────────────────────────────────────── */}
      {query.data && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          <span className="font-medium text-foreground">{totalCount}</span> runs —{" "}
          <span className="text-verdict-accepted-fg font-medium">{counts.accepted} accepted</span>,{" "}
          <span className="text-verdict-rolled-back-fg font-medium">{counts.rolled_back} rolled back</span>,{" "}
          <span className="text-verdict-healthy-fg font-medium">{counts.healthy} healthy</span>
        </p>
      )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {query.isLoading ? (
        <TableSkeleton rows={8} cols={9} />
      ) : query.error ? (
        <ErrorState
          title="Failed to load history"
          error={query.error as Error}
          onRetry={() => void query.refetch()}
        />
      ) : sliced.length === 0 ? (
        <EmptyState
          title="No runs match your filters"
          description="Try adjusting or clearing your search and filter criteria."
          action={
            hasFilters ? (
              <Button variant="outline" size="sm" onPress={clearFilters} className="gap-1.5">
                <X className="size-3.5" aria-hidden /> Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm" aria-label="Recovery run history">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Run ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Model</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Architecture</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Scenario</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Diagnosis</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Verdict</th>
                    <th
                      className="px-4 py-3 text-right font-medium text-muted-foreground"
                      aria-sort={sortKey === "accuracy_gain" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                    >
                      <SortHeader label="Accuracy" sortKey="accuracy_gain" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Compute (CU)</th>
                    <th
                      className="px-4 py-3 text-right font-medium text-muted-foreground"
                      aria-sort={sortKey === "created_at" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                    >
                      <SortHeader label="Date" sortKey="created_at" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sliced.map((run) => {
                    const gain = run.accuracy_after != null
                      ? run.accuracy_after - run.accuracy_before
                      : null;
                    return (
                      <tr key={run.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs">
                          <Link href={`/runs/${run.id}`} className="text-primary underline-offset-2 hover:underline focus-visible:ring-1 focus-visible:ring-ring rounded outline-none">
                            {run.id}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium">{run.model_name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{run.architecture}</td>
                        <td className="px-4 py-3 text-xs">{SCENARIO_LABELS[run.scenario_id] ?? run.scenario_id}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                          {DIAGNOSIS_LABELS_DISPLAY[run.diagnosis_label] ?? run.diagnosis_label}
                        </td>
                        <td className="px-4 py-3">
                          <VerdictBadge verdict={run.verdict} />
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          <span>{formatAccuracy(run.accuracy_before)}</span>
                          {gain != null && (
                            <>
                              <span className="mx-1 text-muted-foreground">→</span>
                              <span className={gain >= 0 ? "text-verdict-accepted-fg font-medium" : "text-verdict-error-fg"}>
                                {formatAccuracy(run.accuracy_before + gain)}
                              </span>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                          {run.compute_units.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {formatUtcDate(run.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    isDisabled={currentPage === 1}
                    onPress={() => setPage(currentPage - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </Button>
                  <span className="px-2 text-xs text-muted-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    isDisabled={currentPage === totalPages}
                    onPress={() => setPage(currentPage + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
