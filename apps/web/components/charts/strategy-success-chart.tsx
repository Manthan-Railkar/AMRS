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
  LabelList,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/status/skeletons";
import { ErrorState } from "@/components/status/error-state";
import type { StrategyStat } from "@/lib/schemas/dashboard";
import { cn } from "@/lib/utils";

const STRATEGY_LABELS: Record<string, string> = {
  temperature_scaling:     "Temp Scaling",
  bn_recalibration:        "BN Recalib.",
  last_layer_retraining:   "Last Layer",
  selective_finetune_l2sp: "Selective FT",
  checkpoint_reversion:    "Checkpoint Rev.",
  weight_interpolation:    "Weight Interp.",
};

interface StrategySuccessChartProps {
  data: StrategyStat[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  className?: string;
}

export function StrategySuccessChart({
  data,
  isLoading,
  error,
  onRetry,
  className,
}: StrategySuccessChartProps) {
  const [barColor, setBarColor] = React.useState("oklch(0.42 0.13 165)");
  const [tooltipBg, setTooltipBg] = React.useState("white");
  const [tooltipBorder, setTooltipBorder] = React.useState("oklch(0.91 0.02 295)");

  React.useLayoutEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const c = style.getPropertyValue("--chart-1").trim();
    const bg = style.getPropertyValue("--card").trim();
    const bd = style.getPropertyValue("--border").trim();
    React.startTransition(() => {
      if (c) setBarColor(c);
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
        title="Loading strategy success rate chart"
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
    .sort((a, b) => b.successRate - a.successRate)
    .map((s) => ({
      name: STRATEGY_LABELS[s.strategy] ?? s.strategy,
      successPct: Math.round(s.successRate * 100),
      attempts: s.attempts,
      accepted: s.accepted,
    }));

  const best = chartData[0];

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle>Strategy Success Rate</CardTitle>
        <CardDescription>
          % of gate-accepted runs per recovery strategy (with attempt counts)
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 4, right: 48, left: 8, bottom: 0 }}
            aria-label="Horizontal bar chart of recovery strategy success rates"
            role="img"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.68 0.06 290 / 0.25)" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                borderRadius: "12px",
                fontSize: "12px",
                border: `1px solid ${tooltipBorder}`,
                boxShadow: "0 4px 16px oklch(0.52 0.22 288 / 0.12)",
              }}
              formatter={(value, _name, item) => [
                `${String(value)}% (${(item.payload as { accepted: number; attempts: number }).accepted}/${(item.payload as { accepted: number; attempts: number }).attempts} runs)`,
                "Accepted",
              ]}
            />
            <Bar
              dataKey="successPct"
              name="Success %"
              fill={barColor}
              radius={[0, 4, 4, 0]}
              isAnimationActive={!isReducedMotion}
            >
              <LabelList
                dataKey="successPct"
                position="right"
                formatter={(v) => `${String(v)}%`}
                style={{ fontSize: 11, fill: "currentColor" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-3 text-xs text-muted-foreground">
          {best
            ? `${best.name} has the highest gate-acceptance rate at ${best.successPct}% (${best.accepted} of ${best.attempts} attempts).`
            : "No strategy data available."}
        </p>
      </CardContent>
    </Card>
  );
}
