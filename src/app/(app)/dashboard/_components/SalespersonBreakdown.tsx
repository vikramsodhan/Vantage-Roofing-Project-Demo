"use client"

import { getMonth, getYear, parseISO } from "date-fns"
import { Users } from "lucide-react"
import { useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatRatioPercent, MONTHS_LONG } from "@/lib/formatters"
import { isCrossYearCarryover } from "@/lib/metrics"
import type { DashboardJob } from "@/types"

interface SalespersonBreakdownProps {
  jobs: DashboardJob[]
  selectedYear: number | "all"
}

interface PersonRow {
  id: string
  name: string
  quotedJobs: number
  quotedRevenue: number
  soldJobs: number
  soldRevenue: number
  soldMargin: number
}

export default function SalespersonBreakdown({ jobs, selectedYear }: SalespersonBreakdownProps) {
  // Months (0-11) with any quoted or sold activity in the selected year — drives the month
  // dropdown. Mirrors availableYears in DashboardClient: only surface months that have data.
  const activeMonths = useMemo(() => {
    const months = new Set<number>()
    for (const job of jobs) {
      if (job.date_quoted && !isCrossYearCarryover(job)) {
        const d = parseISO(job.date_quoted)
        if (selectedYear === "all" || getYear(d) === selectedYear) months.add(getMonth(d))
      }
      if (job.sold && job.date_sold) {
        const d = parseISO(job.date_sold)
        if (selectedYear === "all" || getYear(d) === selectedYear) months.add(getMonth(d))
      }
    }
    return [...months].sort((a, b) => a - b)
  }, [jobs, selectedYear])

  // The selected period is either a specific month (0-11) or "ytd" (year-to-date — the whole
  // selected year). Default to the latest active month, matching the sheet opening on one.
  const [selectedPeriod, setSelectedPeriod] = useState<number | "ytd">(
    () => activeMonths.at(-1) ?? "ytd",
  )

  // Clamp: keep an explicit YTD choice, but if a year switch drops the selected month from the
  // active set, fall back to that year's latest month (no effect loop needed).
  const effectivePeriod: number | "ytd" =
    selectedPeriod === "ytd"
      ? "ytd"
      : activeMonths.includes(selectedPeriod)
        ? selectedPeriod
        : (activeMonths.at(-1) ?? "ytd")

  const rows = useMemo<PersonRow[]>(() => {
    const byPerson = new Map<string, PersonRow>()

    for (const job of jobs) {
      const id = job.salesperson_id
      const name = job.salesperson_name ?? "Unknown"

      if (!byPerson.has(id)) {
        byPerson.set(id, {
          id,
          name,
          quotedJobs: 0,
          quotedRevenue: 0,
          soldJobs: 0,
          soldRevenue: 0,
          soldMargin: 0,
        })
      }
      const row = byPerson.get(id)!

      // Quoted: count this job if date_quoted falls in the selected year and month
      // (cross-year carry-overs are excluded — their quote belongs to a prior year)
      if (job.date_quoted && !isCrossYearCarryover(job)) {
        const d = parseISO(job.date_quoted)
        const inYear = selectedYear === "all" || getYear(d) === selectedYear
        const inMonth = effectivePeriod === "ytd" || getMonth(d) === effectivePeriod
        if (inYear && inMonth) {
          row.quotedJobs += 1
          row.quotedRevenue += job.sales_price
        }
      }

      // Sold: count this job if sold and date_sold falls in the selected year and month
      if (job.sold && job.date_sold) {
        const d = parseISO(job.date_sold)
        const inYear = selectedYear === "all" || getYear(d) === selectedYear
        const inMonth = effectivePeriod === "ytd" || getMonth(d) === effectivePeriod
        if (inYear && inMonth) {
          row.soldJobs += 1
          row.soldRevenue += job.sales_price
          row.soldMargin += job.mgn
        }
      }
    }

    return [...byPerson.values()]
      .filter((r) => r.quotedJobs > 0 || r.soldJobs > 0)
      .sort((a, b) => b.soldRevenue - a.soldRevenue)
  }, [jobs, selectedYear, effectivePeriod])

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          quotedJobs: acc.quotedJobs + r.quotedJobs,
          quotedRevenue: acc.quotedRevenue + r.quotedRevenue,
          soldJobs: acc.soldJobs + r.soldJobs,
          soldRevenue: acc.soldRevenue + r.soldRevenue,
          soldMargin: acc.soldMargin + r.soldMargin,
        }),
        { quotedJobs: 0, quotedRevenue: 0, soldJobs: 0, soldRevenue: 0, soldMargin: 0 },
      ),
    [rows],
  )

  const yearLabel = selectedYear === "all" ? "All years" : String(selectedYear)
  const periodLabel =
    effectivePeriod === "ytd" ? yearLabel : `${MONTHS_LONG[effectivePeriod]} ${yearLabel}`

  if (rows.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Users className="size-4 text-muted-foreground" />
              By Salesperson
            </CardTitle>
            <CardDescription>{periodLabel} · sorted by sold revenue</CardDescription>
          </div>
          <Select
            value={String(effectivePeriod)}
            onValueChange={(v) => setSelectedPeriod(v === "ytd" ? "ytd" : Number(v))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ytd">YTD</SelectItem>
              {activeMonths.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {MONTHS_LONG[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="tabular-nums">
            <TableHeader>
              <TableRow>
                <TableHead>Salesperson</TableHead>
                <TableHead className="text-right">Quoted Jobs</TableHead>
                <TableHead className="text-right">Quoted Revenue</TableHead>
                <TableHead className="text-right">Sold Jobs</TableHead>
                <TableHead className="text-right">Conv #</TableHead>
                <TableHead className="text-right">Sold Revenue</TableHead>
                <TableHead className="text-right">Conv $</TableHead>
                <TableHead className="text-right">Sold Margin</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right">{r.quotedJobs}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.quotedRevenue)}</TableCell>
                  <TableCell className="text-right">{r.soldJobs}</TableCell>
                  <TableCell className="text-right">
                    {formatRatioPercent(r.soldJobs, r.quotedJobs)}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(r.soldRevenue)}</TableCell>
                  <TableCell className="text-right">
                    {formatRatioPercent(r.soldRevenue, r.quotedRevenue)}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(r.soldMargin)}</TableCell>
                  <TableCell className="text-right">
                    {formatRatioPercent(r.soldMargin, r.soldRevenue)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 bg-muted/40 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{totals.quotedJobs}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.quotedRevenue)}</TableCell>
                <TableCell className="text-right">{totals.soldJobs}</TableCell>
                <TableCell className="text-right">
                  {formatRatioPercent(totals.soldJobs, totals.quotedJobs)}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(totals.soldRevenue)}</TableCell>
                <TableCell className="text-right">
                  {formatRatioPercent(totals.soldRevenue, totals.quotedRevenue)}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(totals.soldMargin)}</TableCell>
                <TableCell className="text-right">
                  {formatRatioPercent(totals.soldMargin, totals.soldRevenue)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
