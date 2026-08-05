import { describe, expect, it } from "vitest"

import type { DashboardJob } from "@/types"

import {
  buildMetricSeries,
  computeMetricValue,
  getMetric,
  isCrossYearCarryover,
  isIncludedInDashboard,
  type MetricId,
} from "./metrics"

// A valid, sold DashboardJob with both dates in the same year. Each test
// overrides only the fields relevant to the rule it checks.
function makeJob(overrides: Partial<DashboardJob> = {}): DashboardJob {
  return {
    id: "job-1",
    sold: true,
    exclude_from_quote_metrics: false,
    date_quoted: "2024-03-15",
    date_sold: "2024-06-20",
    sales_price: 10000,
    mgn: 3000,
    salesperson_id: "sales-1",
    salesperson_name: "Test Salesperson",
    ...overrides,
  }
}

describe("isCrossYearCarryover", () => {
  it("is true for a sold, excluded job quoted in a prior year", () => {
    const job = makeJob({
      sold: true,
      exclude_from_quote_metrics: true,
      date_quoted: "2023-11-01",
      date_sold: "2024-02-01",
    })
    expect(isCrossYearCarryover(job)).toBe(true)
  })

  it("is false for a forward-entered cross-year deal (flag not set)", () => {
    // Quoted 2023, sold 2024, but entered through the app so the flag is FALSE.
    // It must keep counting in its quote year — this is NOT a carry-over, and is
    // the key distinction the exclude_from_quote_metrics gate protects.
    const job = makeJob({
      sold: true,
      exclude_from_quote_metrics: false,
      date_quoted: "2023-11-01",
      date_sold: "2024-02-01",
    })
    expect(isCrossYearCarryover(job)).toBe(false)
  })

  it("is false when the job is not sold", () => {
    const job = makeJob({
      sold: false,
      exclude_from_quote_metrics: true,
      date_quoted: "2023-11-01",
      date_sold: "2024-02-01",
    })
    expect(isCrossYearCarryover(job)).toBe(false)
  })

  it("is false when quote and sale fall in the same year", () => {
    const job = makeJob({
      sold: true,
      exclude_from_quote_metrics: true,
      date_quoted: "2024-01-10",
      date_sold: "2024-08-10",
    })
    expect(isCrossYearCarryover(job)).toBe(false)
  })

  it("is false when date_sold is missing", () => {
    const job = makeJob({
      sold: true,
      exclude_from_quote_metrics: true,
      date_quoted: "2023-11-01",
      date_sold: null,
    })
    expect(isCrossYearCarryover(job)).toBe(false)
  })
})

describe("isIncludedInDashboard", () => {
  it("keeps a normal open (unsold) quote", () => {
    const job = makeJob({ sold: false, exclude_from_quote_metrics: false })
    expect(isIncludedInDashboard(job)).toBe(true)
  })

  it("keeps any sold job (sold-wins), even when excluded", () => {
    const job = makeJob({ sold: true, exclude_from_quote_metrics: true })
    expect(isIncludedInDashboard(job)).toBe(true)
  })

  it("keeps a sold job that isn't excluded", () => {
    const job = makeJob({ sold: true, exclude_from_quote_metrics: false })
    expect(isIncludedInDashboard(job)).toBe(true)
  })

  it("drops an unsold, set-aside variant quote", () => {
    const job = makeJob({ sold: false, exclude_from_quote_metrics: true })
    expect(isIncludedInDashboard(job)).toBe(false)
  })

  it("drops an unsold migrated carry-over (its quote lives on the prior-year twin)", () => {
    const job = makeJob({
      sold: false,
      exclude_from_quote_metrics: true,
      date_quoted: "2023-11-01",
      date_sold: null,
    })
    expect(isIncludedInDashboard(job)).toBe(false)
  })
})

describe("computeMetricValue", () => {
  const jobs = [
    makeJob({ sold: true, date_quoted: "2024-03-01", date_sold: "2024-05-01", sales_price: 10000 }),
    makeJob({ sold: true, date_quoted: "2024-06-01", date_sold: "2024-07-01", sales_price: 20000 }),
    makeJob({ sold: false, date_quoted: "2024-02-01", date_sold: null, sales_price: 5000 }),
    makeJob({ sold: true, date_quoted: "2025-01-01", date_sold: "2025-02-01", sales_price: 40000 }),
  ]

  it("sums sold revenue for one year, bucketed by date_sold", () => {
    expect(computeMetricValue(jobs, getMetric("sold_revenue"), 2024)).toBe(30000)
    expect(computeMetricValue(jobs, getMetric("sold_revenue"), 2025)).toBe(40000)
  })

  it("sums across every year when the year is 'all'", () => {
    expect(computeMetricValue(jobs, getMetric("sold_revenue"), "all")).toBe(70000)
  })

  it("counts quoted vs sold jobs by each metric's own date column", () => {
    expect(computeMetricValue(jobs, getMetric("quoted_jobs"), 2024)).toBe(3)
    expect(computeMetricValue(jobs, getMetric("sold_jobs"), 2024)).toBe(2)
  })

  it("expresses a conversion ratio as a percentage", () => {
    // 2 sold ÷ 3 quoted in 2024 → 66.67%
    expect(computeMetricValue(jobs, getMetric("conversion_jobs"), 2024)).toBeCloseTo(66.67, 1)
  })

  it("returns 0 for a ratio with an empty denominator (no divide-by-zero)", () => {
    expect(computeMetricValue([], getMetric("conversion_jobs"), 2024)).toBe(0)
  })

  it("counts a sold carry-over on the sold side but excludes it from the quote side", () => {
    const carryover = makeJob({
      sold: true,
      exclude_from_quote_metrics: true,
      date_quoted: "2023-11-01",
      date_sold: "2024-02-01",
      sales_price: 30000,
    })
    // The sale still counts in 2024...
    expect(computeMetricValue([carryover], getMetric("sold_revenue"), 2024)).toBe(30000)
    // ...but its quote does not count in 2023 — the prior-year twin already carries it.
    expect(computeMetricValue([carryover], getMetric("quoted_revenue"), 2023)).toBe(0)
  })

  it("keeps a normal quote but drops a carry-over in the same quote year", () => {
    const carryover = makeJob({
      sold: true,
      exclude_from_quote_metrics: true,
      date_quoted: "2023-11-01",
      date_sold: "2024-02-01",
    })
    const normalQuote = makeJob({ sold: false, date_quoted: "2023-05-01" })
    // 2023's quote side sees only the normal quote — the carry-over's quote lives on its twin.
    expect(computeMetricValue([carryover, normalQuote], getMetric("quoted_jobs"), 2023)).toBe(1)
  })
})

describe("computeMetricValue across the whole registry", () => {
  // Four jobs, all quoted in 2024 (none flagged) so every quote-side metric sees them.
  const jobs = [
    makeJob({
      sold: true,
      date_quoted: "2024-01-01",
      date_sold: "2024-02-01",
      sales_price: 10000,
      mgn: 4000,
    }),
    makeJob({
      sold: true,
      date_quoted: "2024-03-01",
      date_sold: "2024-04-01",
      sales_price: 30000,
      mgn: 6000,
    }),
    makeJob({
      sold: false,
      date_quoted: "2024-05-01",
      date_sold: null,
      sales_price: 20000,
      mgn: 0,
    }),
    makeJob({
      sold: true,
      date_quoted: "2024-06-01",
      date_sold: "2024-07-01",
      sales_price: 20000,
      mgn: 5000,
    }),
  ]

  // [metric id, its exact 2024 value]. Adding a metric to the registry = one row here.
  const expected: [MetricId, number][] = [
    ["quoted_jobs", 4],
    ["sold_jobs", 3],
    ["conversion_jobs", 75],
    ["quoted_revenue", 80000],
    ["sold_revenue", 60000],
    ["conversion_dollar", 75],
    ["sold_margin", 15000],
    ["avg_margin", 25],
    ["avg_job_value", 20000],
  ]

  it.each(expected)("%s for 2024 → %d", (metricId, value) => {
    expect(computeMetricValue(jobs, getMetric(metricId), 2024)).toBe(value)
  })
})

describe("buildMetricSeries", () => {
  const jobs = [
    makeJob({ sold: true, date_sold: "2024-01-15", sales_price: 100 }),
    makeJob({ sold: true, date_sold: "2024-03-15", sales_price: 200 }),
  ]

  it("buckets each month independently in monthly mode", () => {
    const { rows, years } = buildMetricSeries(jobs, getMetric("sold_revenue"), "monthly")
    expect(years).toEqual([2024])
    expect(rows[0]["2024"]).toBe(100) // Jan
    expect(rows[1]["2024"]).toBe(0) // Feb — nothing sold
    expect(rows[2]["2024"]).toBe(200) // Mar
  })

  it("reports a running year-to-date total in cumulative mode", () => {
    const { rows } = buildMetricSeries(jobs, getMetric("sold_revenue"), "cumulative")
    expect(rows[0]["2024"]).toBe(100) // Jan
    expect(rows[1]["2024"]).toBe(100) // Feb — carries January forward
    expect(rows[2]["2024"]).toBe(300) // Mar — 100 + 200
    expect(rows[11]["2024"]).toBe(300) // Dec — still 300
  })
})
