import { describe, expect, it } from "vitest"

import { computeMetricValue, getMetric } from "@/lib/metrics"
import type { DashboardJob } from "@/types"

import {
  monthRangeLabel,
  monthsRemainingInYear,
  type PlanOverrides,
  resolvePlan,
} from "./yearEndPlanMath"

const JANUARY = new Date(Date.UTC(2026, 0, 15))
const MARCH = new Date(Date.UTC(2026, 2, 1)) // 10 months remaining
const AUGUST = new Date(Date.UTC(2026, 7, 1)) // 5 months remaining
const DECEMBER = new Date(Date.UTC(2026, 11, 31))
const JANUARY_2024 = new Date(Date.UTC(2024, 0, 1))

const noOverrides: PlanOverrides = {
  targetRevenue: null,
  revenue: null,
  jobsSold: null,
  avgJobValue: null,
  conversionPct: null,
  monthsRemaining: null,
}

describe("monthsRemainingInYear", () => {
  it("January → 12", () => {
    expect(monthsRemainingInYear(JANUARY)).toBe(12)
  })

  it("August → 5", () => {
    expect(monthsRemainingInYear(AUGUST)).toBe(5)
  })

  it("December → 1, never 0", () => {
    expect(monthsRemainingInYear(DECEMBER)).toBe(1)
  })
})

describe("monthRangeLabel", () => {
  it("today August, 5 months remaining (the calendar default) → Aug–Dec", () => {
    expect(monthRangeLabel(AUGUST, 5)).toBe("Aug–Dec")
  })

  it("today December, 1 month remaining → Dec", () => {
    expect(monthRangeLabel(DECEMBER, 1)).toBe("Dec")
  })

  it("today July, overridden to 2 months remaining → Jul–Aug, not backward from December", () => {
    const july = new Date(Date.UTC(2026, 6, 1))
    expect(monthRangeLabel(july, 2)).toBe("Jul–Aug")
  })

  it("clamps at December rather than spilling into next year", () => {
    const october = new Date(Date.UTC(2026, 9, 1))
    expect(monthRangeLabel(october, 6)).toBe("Oct–Dec")
  })

  it("guards against a fractional months value landing off the end of the month names", () => {
    expect(monthRangeLabel(AUGUST, 2.5)).toBe("Aug–Oct")
  })
})

describe("resolvePlan", () => {
  it("the golden case, asserted post-Math.round", () => {
    const resolved = resolvePlan(
      MARCH,
      { revenue: 500_000, jobsSold: 25, conversionPct: 40 },
      { ...noOverrides, targetRevenue: 750_000 },
    )
    expect(resolved.avgJobValue).toBe(20_000)
    expect(resolved.revenueNeeded).toBe(250_000)
    expect(Math.round(resolved.jobsNeeded!)).toBe(13)
    expect(Math.round(resolved.quotesNeeded!)).toBe(31)
    expect(Math.round(resolved.jobsPerMonth!)).toBe(1)
    expect(Math.round(resolved.quotesPerMonth!)).toBe(3)
    expect(Math.round(resolved.revenuePerMonth!)).toBe(25_000)
  })

  it("keeps intermediates unrounded, so quotesNeeded isn't skewed by an early-rounded jobsNeeded", () => {
    const resolved = resolvePlan(
      MARCH,
      { revenue: 500_000, jobsSold: 25, conversionPct: 40 },
      { ...noOverrides, targetRevenue: 750_000 },
    )
    const naivelyRoundedFirst = Math.round(
      Math.round(resolved.jobsNeeded!) / (resolved.conversionPct / 100),
    )
    expect(Math.round(resolved.quotesNeeded!)).toBe(31)
    expect(naivelyRoundedFirst).toBe(33)
  })

  it("no overrides resolves to the live values exactly", () => {
    const resolved = resolvePlan(
      AUGUST,
      { revenue: 100_000, jobsSold: 10, conversionPct: 50 },
      noOverrides,
    )
    expect(resolved.revenue).toBe(100_000)
    expect(resolved.jobsSold).toBe(10)
    expect(resolved.conversionPct).toBe(50)
    expect(resolved.avgJobValue).toBe(10_000)
    expect(resolved.monthsRemaining).toBe(5)
    expect(Object.values(resolved.isOverridden)).toEqual([false, false, false, false, false])
  })

  it("avgJobValue matches the registry's avg_job_value metric exactly (anti-drift)", () => {
    const jobs: DashboardJob[] = [
      {
        id: "1",
        sold: true,
        exclude_from_quote_metrics: false,
        date_quoted: "2024-01-01",
        date_sold: "2024-02-01",
        sales_price: 10000,
        mgn: 4000,
        salesperson_id: "s1",
        salesperson_name: "A",
      },
      {
        id: "2",
        sold: true,
        exclude_from_quote_metrics: false,
        date_quoted: "2024-03-01",
        date_sold: "2024-04-01",
        sales_price: 30000,
        mgn: 6000,
        salesperson_id: "s1",
        salesperson_name: "A",
      },
      {
        id: "3",
        sold: false,
        exclude_from_quote_metrics: false,
        date_quoted: "2024-05-01",
        date_sold: null,
        sales_price: 20000,
        mgn: 0,
        salesperson_id: "s1",
        salesperson_name: "A",
      },
      {
        id: "4",
        sold: true,
        exclude_from_quote_metrics: false,
        date_quoted: "2024-06-01",
        date_sold: "2024-07-01",
        sales_price: 20000,
        mgn: 5000,
        salesperson_id: "s1",
        salesperson_name: "A",
      },
    ]

    const live = {
      revenue: computeMetricValue(jobs, getMetric("sold_revenue"), 2024),
      jobsSold: computeMetricValue(jobs, getMetric("sold_jobs"), 2024),
      conversionPct: computeMetricValue(jobs, getMetric("conversion_jobs"), 2024),
    }
    const resolved = resolvePlan(JANUARY_2024, live, noOverrides)

    expect(resolved.avgJobValue).toBe(computeMetricValue(jobs, getMetric("avg_job_value"), 2024))
  })

  it("clearing a single override reverts only that field, leaving others overridden", () => {
    const live = { revenue: 100_000, jobsSold: 10, conversionPct: 50 }
    const withBoth = resolvePlan(AUGUST, live, { ...noOverrides, revenue: 50_000, jobsSold: 5 })
    expect(withBoth.revenue).toBe(50_000)
    expect(withBoth.jobsSold).toBe(5)

    const jobsSoldCleared = resolvePlan(AUGUST, live, {
      ...noOverrides,
      revenue: 50_000,
      jobsSold: null,
    })
    expect(jobsSoldCleared.jobsSold).toBe(10)
    expect(jobsSoldCleared.revenue).toBe(50_000)
    expect(jobsSoldCleared.isOverridden.revenue).toBe(true)
    expect(jobsSoldCleared.isOverridden.jobsSold).toBe(false)
  })

  it("a 0% conversion rate resolves quotesNeeded/quotesPerMonth to null, not NaN", () => {
    const resolved = resolvePlan(
      AUGUST,
      { revenue: 100, jobsSold: 5, conversionPct: 0 },
      { ...noOverrides, targetRevenue: 200 },
    )
    expect(resolved.jobsNeeded).toBe(5)
    expect(resolved.quotesNeeded).toBeNull()
    expect(resolved.quotesPerMonth).toBeNull()
  })

  it("0 jobs sold resolves avgJobValue and everything downstream to null", () => {
    const resolved = resolvePlan(
      AUGUST,
      { revenue: 100, jobsSold: 0, conversionPct: 50 },
      { ...noOverrides, targetRevenue: 200 },
    )
    expect(resolved.avgJobValue).toBeNull()
    expect(resolved.jobsNeeded).toBeNull()
    expect(resolved.quotesNeeded).toBeNull()
    expect(resolved.jobsPerMonth).toBeNull()
    expect(resolved.quotesPerMonth).toBeNull()
  })

  it("an avgJobValue override of exactly 0 is respected (not treated as unset) and nulls jobsNeeded", () => {
    const resolved = resolvePlan(
      AUGUST,
      { revenue: 100, jobsSold: 10, conversionPct: 50 },
      { ...noOverrides, targetRevenue: 200, avgJobValue: 0 },
    )
    expect(resolved.avgJobValue).toBe(0)
    expect(resolved.jobsNeeded).toBeNull()
  })

  it("a met target zeroes downstream counts instead of going negative", () => {
    const resolved = resolvePlan(
      AUGUST,
      { revenue: 100_000, jobsSold: 10, conversionPct: 50 },
      { ...noOverrides, targetRevenue: 80_000 },
    )
    expect(resolved.revenueNeeded).toBe(-20_000)
    expect(resolved.isTargetMet).toBe(true)
    expect(resolved.jobsNeeded).toBe(0)
    expect(resolved.quotesNeeded).toBe(0)
    expect(resolved.jobsPerMonth).toBe(0)
    expect(resolved.quotesPerMonth).toBe(0)
    expect(resolved.revenuePerMonth).toBe(0)
  })

  it("no target set leaves every target-derived field null", () => {
    const resolved = resolvePlan(
      AUGUST,
      { revenue: 100_000, jobsSold: 10, conversionPct: 50 },
      noOverrides,
    )
    expect(resolved.targetRevenue).toBeNull()
    expect(resolved.revenueNeeded).toBeNull()
    expect(resolved.isTargetMet).toBe(false)
    expect(resolved.jobsNeeded).toBeNull()
    expect(resolved.quotesNeeded).toBeNull()
    expect(resolved.jobsPerMonth).toBeNull()
    expect(resolved.quotesPerMonth).toBeNull()
    expect(resolved.revenuePerMonth).toBeNull()
  })
})

describe("resolvePlan — each override actually drives the downstream math, not just its own field", () => {
  const live = { revenue: 100_000, jobsSold: 10, conversionPct: 50 }
  const targetOnly: PlanOverrides = { ...noOverrides, targetRevenue: 200_000 }

  it("revenue override changes revenueNeeded", () => {
    const resolved = resolvePlan(AUGUST, live, { ...targetOnly, revenue: 150_000 })
    expect(resolved.revenueNeeded).toBe(50_000)
  })

  it("jobsSold override cascades through avgJobValue into jobsNeeded", () => {
    const resolved = resolvePlan(AUGUST, live, { ...targetOnly, jobsSold: 20 })
    expect(resolved.avgJobValue).toBe(5_000)
    expect(resolved.jobsNeeded).toBe(20)
  })

  it("conversionPct override changes quotesNeeded but not jobsNeeded", () => {
    const resolved = resolvePlan(AUGUST, live, { ...targetOnly, conversionPct: 25 })
    expect(resolved.jobsNeeded).toBe(10)
    expect(resolved.quotesNeeded).toBe(40)
  })

  it("avgJobValue override wins over a simultaneous jobsSold cascade, and jobsNeeded uses it", () => {
    const resolved = resolvePlan(AUGUST, live, {
      ...targetOnly,
      jobsSold: 20,
      avgJobValue: 20_000,
    })
    expect(resolved.avgJobValue).toBe(20_000)
    expect(resolved.jobsNeeded).toBe(5)
  })

  it("monthsRemaining override changes jobsPerMonth, quotesPerMonth, and revenuePerMonth", () => {
    const resolved = resolvePlan(AUGUST, live, { ...targetOnly, monthsRemaining: 2 })
    expect(resolved.jobsPerMonth).toBe(5)
    expect(resolved.quotesPerMonth).toBe(10)
    expect(resolved.revenuePerMonth).toBe(50_000)
  })
})
