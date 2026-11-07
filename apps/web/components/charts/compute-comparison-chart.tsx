"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/status/skeletons";
import { ErrorState } from "@/components/status/error-state";
import type { RunsOverTimePoint } from "@/lib/schemas/dashboard";
import { cn } from "@/lib/utils";

interface ComputeComparisonChartProps {
  data: RunsOverTimePoint[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  className?: string;
}

export function ComputeComparisonChart({
  data,
  isLoading,
  error,
  onRetry,
  className,
}: ComputeComparisonChartProps) {
  const [amrsColor, setAmrsColor]   = React.useState("oklch(0.42 0.13 165)");
  const [fullColor, setFullColor]   = React.useState("oklch(0.50 0.20 25)");
  const [tooltipBg, setTooltipBg]   = React.useState("white");
  const [tooltipBorder, setTooltipBorder] = React.useState("oklch(0.91 0.02 295)");

  React.useLayoutEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const c1 = style.getPropertyValue("--chart-1").trim();
    const c5 = style.getPropertyValue("--chart-5").trim();
    const bg = style.getPropertyValue("--card").trim();
    const bd = style.getPropertyValue("--border").trim();
    React.startTransition(() => {
      if (c1) setAmrsColor(c1);
      if (c5) setFullColor(c5);
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
        title="Loading compute comparison chart"
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

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle>Compute Comparison</CardTitle>
        <CardDescription>
          AMRS compute units vs. full retraining compute units per week
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
            aria-label="Line chart comparing AMRS vs full retraining compute costs per week"
            role="img"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.68 0.06 290 / 0.25)" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              unit=" CU"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                borderRadius: "12px",
                fontSize: "12px",
                border: `1px solid ${tooltipBorder}`,
                boxShadow: "0 4px 16px oklch(0.52 0.22 288 / 0.12)",
              }}
              formatter={(value) => [`${Number(value).toFixed(1)} CU`]}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="amrsCompute"
              name="AMRS"
              stroke={amrsColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={!isReducedMotion}
            />
            <Line
              type="monotone"
              dataKey="fullRetrainCompute"
              name="Full Retrain"
              stroke={fullColor}
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={!isReducedMotion}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-3 text-xs text-muted-foreground">
          AMRS consistently uses far fewer compute units than full retraining, saving up to 72% of compute resources on accepted runs.
        </p>
      </CardContent>
    </Card>
  );
}
