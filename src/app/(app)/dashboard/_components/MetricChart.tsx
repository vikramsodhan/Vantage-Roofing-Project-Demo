"use client"

import { TrendingUp } from "lucide-react"
import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { ChartTooltipContent } from "@/components/custom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getYearColor } from "@/lib/chartColors"
import {
  buildMetricSeries,
  type ChartMode,
  type DashboardMetric,
  metricFormatters,
} from "@/lib/metrics"
import { cn } from "@/lib/utils"
import type { DashboardJob } from "@/types"

interface MetricChartProps {
  jobs: DashboardJob[]
  metric: DashboardMetric
}

const MODES: Array<{ value: ChartMode; label: string }> = [
  { value: "cumulative", label: "Cumulative" },
  { value: "monthly", label: "Monthly" },
]

export default function MetricChart({ jobs, metric }: MetricChartProps) {
  const [mode, setMode] = useState<ChartMode>("cumulative")

  const { rows, years } = useMemo(() => buildMetricSeries(jobs, metric, mode), [jobs, metric, mode])
  const { axis, full } = metricFormatters(metric)

  // LineChart and BarChart share the categorical-chart props we use (data,
  // margin, children), so the wrapper and the per-year series are the only
  // things that vary between modes. Cast keeps the shared JSX in one place.
  const isCumulative = mode === "cumulative"
  const ChartRoot = (isCumulative ? LineChart : BarChart) as typeof LineChart

  const description =
    mode === "cumulative"
      ? "All years · year-to-date running total per month"
      : "All years · each month's own value, side-by-side"

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <TrendingUp className="size-4 text-muted-foreground" />
            {metric.label}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex shrink-0 gap-1 rounded-full bg-muted p-1">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                mode === m.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <ChartRoot data={rows} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={axis}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip content={<ChartTooltipContent format={full} />} />
            <Legend wrapperStyle={{ fontSize: "13px", paddingTop: "16px" }} />
            {years.map((year, i) =>
              isCumulative ? (
                <Line
                  key={year}
                  type="monotone"
                  dataKey={String(year)}
                  stroke={getYearColor(i)}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              ) : (
                <Bar
                  key={year}
                  dataKey={String(year)}
                  fill={getYearColor(i)}
                  radius={[4, 4, 0, 0]}
                />
              ),
            )}
          </ChartRoot>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
