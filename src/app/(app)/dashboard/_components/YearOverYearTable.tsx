"use client"

import { getMonth, getYear, parseISO } from "date-fns"
import { ArrowLeftRight } from "lucide-react"
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
import { formatCurrency, formatPercentChange, MONTHS_LONG } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { DashboardJob } from "@/types"

// Compares each metric year-over-year, month by month, with up/down deltas.
interface YearOverYearTableProps {
  jobs: DashboardJob[]
}

const DIRECTION_CLASS = {
  up: "text-success",
  down: "text-destructive",
  flat: "text-muted-foreground",
} as const

type Column = { kind: "year"; year: number } | { kind: "change"; prev: number; curr: number }

function ChangeCell({ prev, curr }: { prev: number; curr: number }) {
  const change = formatPercentChange(prev, curr)
  if (!change) return <span className="text-muted-foreground">—</span>
  return <span className={DIRECTION_CLASS[change.direction]}>{change.text}</span>
}

export default function YearOverYearTable({ jobs }: YearOverYearTableProps) {
  const { years, monthlyByYear, totalsByYear, currentYear } = useMemo(() => {
    const monthly: Record<number, number[]> = {}
    for (const job of jobs) {
      if (!job.sold || !job.date_sold) continue
      const d = parseISO(job.date_sold)
      const y = getYear(d)
      const m = getMonth(d)
      if (!monthly[y]) monthly[y] = Array(12).fill(0)
      monthly[y][m] += job.sales_price
    }
    const yrs = Object.keys(monthly)
      .map(Number)
      .sort((a, b) => a - b)
    const totals: Record<number, number> = {}
    for (const y of yrs) totals[y] = monthly[y].reduce((s, v) => s + v, 0)
    return {
      years: yrs,
      monthlyByYear: monthly,
      totalsByYear: totals,
      currentYear: new Date().getFullYear(),
    }
  }, [jobs])

  const columns = useMemo<Column[]>(() => {
    const out: Column[] = []
    years.forEach((y, i) => {
      out.push({ kind: "year", year: y })
      if (i < years.length - 1) {
        out.push({ kind: "change", prev: y, curr: years[i + 1] })
      }
    })
    return out
  }, [years])

  if (years.length === 0) return null

  const shortYear = (y: number) => String(y % 100).padStart(2, "0")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ArrowLeftRight className="size-4 text-muted-foreground" />
          Year-over-Year Sold Revenue
        </CardTitle>
        <CardDescription>Sold jobs only · monthly comparison across all years</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="tabular-nums">
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                {columns.map((c) => {
                  if (c.kind === "year") {
                    return (
                      <TableHead key={`y-${c.year}`} className="text-right">
                        {c.year === currentYear ? `${c.year} (YTD)` : c.year}
                      </TableHead>
                    )
                  }
                  return (
                    <TableHead key={`c-${c.prev}-${c.curr}`} className="text-right">
                      Change {shortYear(c.prev)}-{shortYear(c.curr)}
                    </TableHead>
                  )
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MONTHS_LONG.map((label, monthIndex) => (
                <TableRow key={label}>
                  <TableCell className="font-medium">{label}</TableCell>
                  {columns.map((c) => {
                    if (c.kind === "year") {
                      const v = monthlyByYear[c.year]?.[monthIndex] ?? 0
                      return (
                        <TableCell key={`y-${c.year}`} className="text-right">
                          {formatCurrency(v)}
                        </TableCell>
                      )
                    }
                    const prevV = monthlyByYear[c.prev]?.[monthIndex] ?? 0
                    const currV = monthlyByYear[c.curr]?.[monthIndex] ?? 0
                    return (
                      <TableCell key={`c-${c.prev}-${c.curr}`} className="text-right">
                        <ChangeCell prev={prevV} curr={currV} />
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
              <TableRow className={cn("border-t-2 bg-muted/40 font-semibold")}>
                <TableCell>Total</TableCell>
                {columns.map((c) => {
                  if (c.kind === "year") {
                    return (
                      <TableCell key={`y-${c.year}`} className="text-right">
                        {formatCurrency(totalsByYear[c.year] ?? 0)}
                      </TableCell>
                    )
                  }
                  return (
                    <TableCell key={`c-${c.prev}-${c.curr}`} className="text-right">
                      <ChangeCell
                        prev={totalsByYear[c.prev] ?? 0}
                        curr={totalsByYear[c.curr] ?? 0}
                      />
                    </TableCell>
                  )
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
