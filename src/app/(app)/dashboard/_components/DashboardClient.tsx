"use client"

import { getYear, parseISO } from "date-fns"
import { useMemo, useState } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DEFAULT_METRIC_ID, getMetric, isCrossYearCarryover, type MetricId } from "@/lib/metrics"
import { cn } from "@/lib/utils"
import type { DashboardJob, Profile } from "@/types"

import MetricChart from "./MetricChart"
import MonthlyBreakdown from "./MonthlyBreakdown"
import SalespersonBreakdown from "./SalespersonBreakdown"
import SummaryCards from "./SummaryCards"
import YearOverYearTable from "./YearOverYearTable"

type DashboardSalesperson = Pick<Profile, "id" | "full_name">

interface DashboardClientProps {
  jobs: DashboardJob[]
  salespersons: DashboardSalesperson[]
}

export default function DashboardClient({ jobs, salespersons }: DashboardClientProps) {
  // A year gets a filter pill as soon as it has any activity the dashboard shows.
  // That's the union of two things, so a year that so far has only sales (e.g. a
  // January sale before that year's first quote) is still selectable:
  //   • quote years — jobs quoted that year, excluding cross-year carry-overs
  //     (their placeholder quote date, e.g. 2022-01-01, would surface a phantom
  //     all-zeros pill since carry-overs don't count as quotes)
  //   • sold years — years any job was sold in (a carry-over's date_sold is a
  //     real sale year, so including it never brings back the phantom pill)
  const availableYears = useMemo(
    () =>
      [
        ...new Set([
          ...jobs
            .filter((j) => j.date_quoted && !isCrossYearCarryover(j))
            .map((j) => getYear(parseISO(j.date_quoted!))),
          ...jobs.filter((j) => j.sold && j.date_sold).map((j) => getYear(parseISO(j.date_sold!))),
        ]),
      ].sort((a, b) => a - b),
    [jobs],
  )
  const [selectedYear, setSelectedYear] = useState<number | "all">(availableYears.at(-1) ?? "all")
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>("all")
  const [selectedMetricId, setSelectedMetricId] = useState<MetricId>(DEFAULT_METRIC_ID)

  // Filter by salesperson — applies to all metrics. Year is applied per-metric
  // inside the metric calculations (each metric filters by its own date column).
  const salespersonFiltered = useMemo(() => {
    if (selectedSalesperson === "all") return jobs
    return jobs.filter((j) => j.salesperson_id === selectedSalesperson)
  }, [jobs, selectedSalesperson])

  // Each available year plus an "All Years" sentinel — drives the year filter pills.
  const yearOptionsWithAll: Array<{ value: number | "all"; label: string }> = [
    ...availableYears.map((y) => ({ value: y as number | "all", label: String(y) })),
    { value: "all", label: "All Years" },
  ]

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Year
          </label>
          <div className="flex flex-wrap gap-2">
            {yearOptionsWithAll.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedYear(opt.value)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  selectedYear === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Salesperson
          </label>
          <Select value={selectedSalesperson} onValueChange={setSelectedSalesperson}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Salespersons</SelectItem>
              {salespersons.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name ?? "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards — clicking a card drives the metric chart below */}
      <SummaryCards
        jobs={salespersonFiltered}
        selectedYear={selectedYear}
        selectedMetricId={selectedMetricId}
        onSelectMetric={setSelectedMetricId}
      />

      {/* Chart — selected metric, all years side-by-side, filtered by salesperson */}
      <MetricChart jobs={salespersonFiltered} metric={getMetric(selectedMetricId)} />

      {/* Monthly breakdown */}
      <MonthlyBreakdown jobs={salespersonFiltered} selectedYear={selectedYear} />

      {/* Salesperson breakdown */}
      <SalespersonBreakdown jobs={salespersonFiltered} selectedYear={selectedYear} />

      {/* Year-over-Year — intentionally ignores Year and Salesperson filters */}
      <YearOverYearTable jobs={jobs} />
    </div>
  )
}
