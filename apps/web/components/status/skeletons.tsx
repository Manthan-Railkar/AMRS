import type * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface CardSkeletonProps {
  className?: string;
  hasFooter?: boolean;
}

export function CardSkeleton({ className, hasFooter = false }: CardSkeletonProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="gap-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </CardContent>
      {hasFooter && (
        <CardFooter className="pt-2">
          <Skeleton className="h-4 w-1/4" />
        </CardFooter>
      )}
    </Card>
  );
}

export interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
  showHeader?: boolean;
}

export function TableSkeleton({
  rows = 5,
  cols = 4,
  className,
  showHeader = true,
}: TableSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading table data"
      className={cn(
        "w-full overflow-hidden rounded-xl border border-border bg-card",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {showHeader && (
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {Array.from({ length: cols }).map((_, cIndex) => (
                  <th key={`th-${cIndex}`} className="h-10 px-4 text-left">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-border">
            {Array.from({ length: rows }).map((_, rIndex) => (
              <tr key={`tr-${rIndex}`} className="transition-colors">
                {Array.from({ length: cols }).map((_, cIndex) => (
                  <td key={`td-${rIndex}-${cIndex}`} className="p-4">
                    <Skeleton
                      className={cn(
                        "h-4",
                        cIndex === 0
                          ? "w-28"
                          : cIndex === cols - 1
                            ? "w-16"
                            : "w-24"
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className="sr-only">Loading table data...</span>
    </div>
  );
}

export interface ChartSkeletonProps {
  height?: number | string;
  className?: string;
  title?: string;
  summaryText?: string;
}

export function ChartSkeleton({
  height = 280,
  className,
  title = "Loading chart",
  summaryText = "Loading chart visualization and metric trends...",
}: ChartSkeletonProps) {
  return (
    <div
      role="status"
      aria-label={title}
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card p-4 sm:p-6",
        className
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3.5 w-48" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Simulated Chart Area */}
      <div
        style={{ height: typeof height === "number" ? `${height}px` : height }}
        className="relative flex items-end justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 p-4"
        aria-hidden="true"
      >
        {[40, 65, 30, 85, 55, 90, 45, 75, 60, 95].map((pct, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end">
            <Skeleton
              className="w-full rounded-t-sm"
              style={{ height: `${pct}%` }}
            />
          </div>
        ))}
      </div>

      {/* Accessible Text Summary under chart (per AGENTS.md requirement) */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Skeleton className="size-3 shrink-0 rounded-full" />
        <Skeleton className="h-3 w-56" />
        <span className="sr-only">{summaryText}</span>
      </div>
    </div>
  );
}
