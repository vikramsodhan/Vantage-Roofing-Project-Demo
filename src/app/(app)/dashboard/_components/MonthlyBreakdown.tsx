import { getMonth, getYear, parseISO } from "date-fns"
import { CalendarDays } from "lucide-react"
import { useMemo } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

// Month-by-month table for a single selected year (or all years combined).
interface MonthlyBreakdownProps {
  jobs: DashboardJob[]
  selectedYear: number | "all"
}

interface MonthRow {
  label: string
  quotedJobs: number
  quotedRevenue: number
  soldJobs: number
  soldRevenue: number
  soldMargin: number
}

export default function MonthlyBreakdown({ jobs, selectedYear }: MonthlyBreakdownProps) {
  const rows = useMemo<MonthRow[]>(() => {
    return MONTHS_LONG.map((label, monthIndex) => {
      const quotedInMonth = jobs.filter((j) => {
        if (!j.date_quoted || isCrossYearCarryover(j)) return false
        const d = parseISO(j.date_quoted)
        if (selectedYear !== "all" && getYear(d) !== selectedYear) return false
        return getMonth(d) === monthIndex
      })

      const soldInMonth = jobs.filter((j) => {
        if (!j.sold || !j.date_sold) return false
        const d = parseISO(j.date_sold)
        if (selectedYear !== "all" && getYear(d) !== selectedYear) return false
        return getMonth(d) === monthIndex
      })

      return {
        label,
        quotedJobs: quotedInMonth.length,
        quotedRevenue: quotedInMonth.reduce((s, j) => s + j.sales_price, 0),
        soldJobs: soldInMonth.length,
        soldRevenue: soldInMonth.reduce((s, j) => s + j.sales_price, 0),
        soldMargin: soldInMonth.reduce((s, j) => s + j.mgn, 0),
      }
    }).filter((r) => r.quotedJobs > 0 || r.soldJobs > 0)
  }, [jobs, selectedYear])

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

  if (rows.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <CalendarDays className="size-4 text-muted-foreground" />
          Monthly Breakdown
        </CardTitle>
        <CardDescription>
          {selectedYear === "all" ? "Across all years" : `${selectedYear} · by month`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="tabular-nums">
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
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
                <TableRow key={r.label}>
                  <TableCell className="font-medium">{r.label}</TableCell>
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
