"use client";

import * as React from "react";
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/status/skeletons";
import { ErrorState } from "@/components/status/error-state";
import type { RunsOverTimePoint } from "@/lib/schemas/dashboard";
import { cn } from "@/lib/utils";

// CSS custom-property colours resolved at runtime so they honour dark mode.
// We read on mount via useLayoutEffect and wrap setState in startTransition
// to satisfy the react-hooks/set-state-in-effect lint rule.
function useCssVar(name: string, fallback: string) {
  const [value, setValue] = React.useState(fallback);
  React.useLayoutEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (v) React.startTransition(() => setValue(v));
  }, [name]);
  return value;
}

interface RunsOverTimeChartProps {
  data: RunsOverTimePoint[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  className?: string;
}

export function RunsOverTimeChart({
  data,
  isLoading,
  error,
  onRetry,
  className,
}: RunsOverTimeChartProps) {
  const acceptedColor  = useCssVar("--verdict-accepted",    "oklch(0.42 0.13 165)");
  const rolledBackColor= useCssVar("--verdict-rolled-back", "oklch(0.65 0.18 50)");
  const healthyColor   = useCssVar("--verdict-healthy",     "oklch(0.40 0.12 200)");
  const tooltipBg      = useCssVar("--card",                "white");
  const tooltipBorder  = useCssVar("--border",              "oklch(0.91 0.02 295)");

  const isReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  if (isLoading) {
    return (
      <ChartSkeleton
        className={className}
        title="Loading runs over time chart"
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

  const total = data.reduce(
    (acc, d) => acc + d.accepted + d.rolledBack + d.healthy,
    0
  );

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle>Runs Over Time</CardTitle>
        <CardDescription>
          Weekly recovery run outcomes over the last 8 weeks
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
            aria-label="Stacked bar chart of weekly recovery run outcomes"
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
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                borderRadius: "12px",
                fontSize: "12px",
                border: `1px solid ${tooltipBorder}`,
                boxShadow: "0 4px 16px oklch(0.52 0.22 288 / 0.12)",
              }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="accepted"
              name="Accepted"
              stackId="a"
              fill={acceptedColor}
              radius={[0, 0, 0, 0]}
              isAnimationActive={!isReducedMotion}
            />
            <Bar
              dataKey="rolledBack"
              name="Rolled Back"
              stackId="a"
              fill={rolledBackColor}
              isAnimationActive={!isReducedMotion}
            />
            <Bar
              dataKey="healthy"
              name="Healthy"
              stackId="a"
              fill={healthyColor}
              radius={[4, 4, 0, 0]}
              isAnimationActive={!isReducedMotion}
            />
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-3 text-xs text-muted-foreground">
          {total} total runs in the period — accepted recoveries are shown in green, roll-backs in amber, and healthy checks in teal.
        </p>
      </CardContent>
    </Card>
  );
}
