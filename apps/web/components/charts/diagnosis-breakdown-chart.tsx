"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/status/skeletons";
import { ErrorState } from "@/components/status/error-state";
import type { DiagnosisCount } from "@/lib/schemas/dashboard";
import { cn } from "@/lib/utils";

/** Human-friendly label for each diagnosis */
const LABEL_MAP: Record<string, string> = {
  overfitting:       "Overfitting",
  miscalibration:    "Miscalibration",
  bn_drift:          "BN Drift",
  unstable_training: "Unstable Training",
  degraded_head:     "Degraded Head",
  healthy:           "Healthy",
};

/** Map each diagnosis to a chart CSS variable */
const COLOR_VARS: Record<string, string> = {
  overfitting:       "--chart-5",
  miscalibration:    "--chart-4",
  bn_drift:          "--chart-3",
  unstable_training: "--chart-1",
  degraded_head:     "--chart-2",
  healthy:           "--verdict-healthy",
};

interface DiagnosisBreakdownChartProps {
  data: DiagnosisCount[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  className?: string;
}

export function DiagnosisBreakdownChart({
  data,
  isLoading,
  error,
  onRetry,
  className,
}: DiagnosisBreakdownChartProps) {
  const [colors, setColors] = React.useState<Record<string, string>>({});
  const [tooltipBg, setTooltipBg] = React.useState("white");
  const [tooltipBorder, setTooltipBorder] = React.useState("oklch(0.91 0.02 295)");

  React.useLayoutEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const resolved: Record<string, string> = {};
    for (const [label, varName] of Object.entries(COLOR_VARS)) {
      resolved[label] = style.getPropertyValue(varName).trim() || "oklch(0.5 0.1 240)";
    }
    const bg = style.getPropertyValue("--card").trim();
    const bd = style.getPropertyValue("--border").trim();
    React.startTransition(() => {
      setColors(resolved);
      if (bg) setTooltipBg(bg);
      if (bd) setTooltipBorder(bd);
    });
  }, []);

  const isReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  if (isLoading) {
    return (
      <ChartSkeleton
        className={className}
        title="Loading diagnosis breakdown chart"
        height={280}
      />
    );
  }

  if (error || !data) {
    return (
      <Card className={cn("p-4", className)}>
        <ErrorState
          title="Failed to load chart"
          error={error}
          onRetry={onRetry}
          className="border-0 bg-transparent p-4"
        />
      </Card>
    );
  }

  const chartData = [...data]
    .sort((a, b) => b.count - a.count)
    .map((d) => ({ ...d, label: LABEL_MAP[d.label] ?? d.label }));

  const topDiagnosis = chartData[0];

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle>Diagnosis Breakdown</CardTitle>
        <CardDescription>
          Primary diagnosis assigned across all recovery runs
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
            aria-label="Horizontal bar chart showing diagnosis counts"
            role="img"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.68 0.06 290 / 0.25)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={110}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                borderRadius: "12px",
                fontSize: "12px",
                border: `1px solid ${tooltipBorder}`,
                boxShadow: "0 4px 16px oklch(0.52 0.22 288 / 0.12)",
              }}
              formatter={(value) => [value, "Runs"]}
            />
            <Bar
              dataKey="count"
              name="Runs"
              radius={[0, 4, 4, 0]}
              isAnimationActive={!isReducedMotion}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.label}
                  fill={colors[entry.label.toLowerCase().replace(/ /g, "_")] ?? "oklch(0.5 0.1 240)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-3 text-xs text-muted-foreground">
          {topDiagnosis
            ? `${topDiagnosis.label} is the most common diagnosis with ${topDiagnosis.count} occurrences.`
            : "No diagnoses recorded yet."}
        </p>
      </CardContent>
    </Card>
  );
}
