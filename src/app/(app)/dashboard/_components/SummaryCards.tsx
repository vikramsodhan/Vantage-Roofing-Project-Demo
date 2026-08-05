import { useMemo } from "react"

import { Card, CardContent } from "@/components/ui/card"
import {
  computeMetricValue,
  DASHBOARD_METRICS,
  type DashboardMetric,
  formatMetricValue,
  type MetricId,
} from "@/lib/metrics"
import { cn } from "@/lib/utils"
import type { DashboardJob } from "@/types"

interface SummaryCardsProps {
  jobs: DashboardJob[] // salesperson-filtered (all years)
  selectedYear: number | "all"
  selectedMetricId: MetricId
  onSelectMetric: (id: MetricId) => void
}

interface KpiProps {
  metric: DashboardMetric
  value: string
  subtitle: string
  active: boolean
  onSelect: (id: MetricId) => void
}

function Kpi({ metric, value, subtitle, active, onSelect }: KpiProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onSelect(metric.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(metric.id)
        }
      }}
      className={cn(
        "cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none",
        active && "ring-2 ring-primary",
      )}
    >
      <CardContent>
        <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

export default function SummaryCards({
  jobs,
  selectedYear,
  selectedMetricId,
  onSelectMetric,
}: SummaryCardsProps) {
  const yearLabel = selectedYear === "all" ? "all years" : String(selectedYear)

  // One formatted value + caption per metric over the current selection. The
  // registry is the single source for what each card measures and how it reads.
  const cards = useMemo(
    () =>
      DASHBOARD_METRICS.map((metric) => ({
        metric,
        value: formatMetricValue(metric, computeMetricValue(jobs, metric, selectedYear)),
        subtitle: metric.subtitle(yearLabel),
      })),
    [jobs, selectedYear, yearLabel],
  )

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ metric, value, subtitle }) => (
        <Kpi
          key={metric.id}
          metric={metric}
          value={value}
          subtitle={subtitle}
          active={metric.id === selectedMetricId}
          onSelect={onSelectMetric}
        />
      ))}
    </div>
  )
}
