import { getMonth, getYear, parseISO } from "date-fns"

import {
  formatCurrency,
  formatCurrencyShort,
  formatNumber,
  formatPercent,
  MONTHS_SHORT,
} from "@/lib/formatters"
import type { DashboardJob } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** How the chart aggregates a metric across the months of a year. */
export type ChartMode = "cumulative" | "monthly"

/** Drives axis/tooltip formatting and whether a ratio is shown as a percentage. */
type MetricValueType = "currency" | "count" | "percent"

/**
 * The specification for one side of a metric — its numerator or denominator. A
 * spec is fully self-contained: it knows which jobs to include, how much each
 * job contributes, and which date column to bucket those jobs by. Because each
 * spec carries its own date column, a metric's two specs can read different
 * dates. e.g. Conversion % (Jobs):
 *   numerator   → sold jobs,   bucketed by date_sold
 *   denominator → quoted jobs, bucketed by date_quoted
 */
interface MetricSpec {
  /** Date column used to place a job in a year/month bucket. */
  dateField: "date_sold" | "date_quoted"
  /** Whether this job contributes to the spec at all. */
  includes: (job: DashboardJob) => boolean
  /** Amount this job adds to the running total (1 for counts, $ for sums). */
  amount: (job: DashboardJob) => number
}

/**
 * A metric's definition, minus its id (the id is the registry key).
 * A metric with no `denominator` is a plain sum/count; with a `denominator` it
 * is a ratio (numerator ÷ denominator) — shown as a percentage when `valueType`
 * is "percent", or as a plain quotient otherwise (Avg $/Square).
 */
interface MetricDefinition {
  label: string
  valueType: MetricValueType
  numerator: MetricSpec
  denominator?: MetricSpec
  /** Caption under the summary card; receives the active year label. */
  subtitle: (yearLabel: string) => string
}

/** A metric definition together with its registry id. */
export type DashboardMetric = MetricDefinition & { id: MetricId }

// ─────────────────────────────────────────────────────────────────────────────
// Metrics registry — the single source of truth for every dashboard metric.
//
// The object key IS the metric id, so each id is written exactly once: the
// MetricId union and every summary card are derived from this object. Adding a
// metric here automatically gives it a card and makes it selectable in the
// chart — there is no second place to keep in sync.
// ─────────────────────────────────────────────────────────────────────────────

// Reusable spec pieces, named for what they express at the call site.
const isSold = (job: DashboardJob) => job.sold

/**
 * A cross-year "carry-over" is a historical sold job whose quote belongs to a
 * prior year, flagged exclude_from_quote_metrics so it isn't double-counted
 * on the quote side (it still counts as sold). See docs/DESIGN.md: "The metrics
 * registry" for the full rule and why the flag — not a bare date comparison —
 * is what keeps forward-entered cross-year deals correct.
 */
export function isCrossYearCarryover(job: DashboardJob): boolean {
  // Must be a completed sale with a sold date — otherwise there's nothing to compare.
  if (!job.sold || !job.date_sold) return false
  // Must be a migration-flagged re-listing; a forward-entered deal (flag false) is never one.
  if (!job.exclude_from_quote_metrics) return false
  // Carry-over only when the quote year genuinely precedes the sold year.
  return getYear(parseISO(job.date_quoted)) < getYear(parseISO(job.date_sold))
}

/**
 * Whether a job appears on the dashboard at all — the inclusion rule every view
 * inherits: `sold OR NOT exclude_from_quote_metrics`.
 *   - Unsold + excluded → dropped. Covers both a set-aside variant quote and an
 *     unsold migrated carry-over (whose quote already lives on its prior-year twin).
 *   - Sold → always kept ("sold-wins"), so sold-side totals are never hidden. A
 *     sold carry-over is then removed from the *quote* side by isCrossYearCarryover,
 *     not here.
 */
export function isIncludedInDashboard(job: DashboardJob): boolean {
  return job.sold || !job.exclude_from_quote_metrics
}

// Quote-side specs count every job except cross-year carry-overs.
const countsAsQuote = (job: DashboardJob) => !isCrossYearCarryover(job)

const countOne = () => 1
const salesPrice = (job: DashboardJob) => job.sales_price
const margin = (job: DashboardJob) => job.mgn

const METRICS_REGISTRY = {
  quoted_jobs: {
    label: "Quoted Jobs",
    valueType: "count",
    numerator: { dateField: "date_quoted", includes: countsAsQuote, amount: countOne },
    subtitle: (year) => `Quoted jobs, ${year}`,
  },
  sold_jobs: {
    label: "Sold Jobs",
    valueType: "count",
    numerator: { dateField: "date_sold", includes: isSold, amount: countOne },
    subtitle: (year) => `Sold jobs, ${year}`,
  },
  conversion_jobs: {
    label: "Conversion % (Jobs)",
    valueType: "percent",
    numerator: { dateField: "date_sold", includes: isSold, amount: countOne },
    denominator: { dateField: "date_quoted", includes: countsAsQuote, amount: countOne },
    subtitle: (year) => `Sold jobs ÷ Quoted jobs, ${year}`,
  },
  quoted_revenue: {
    label: "Quoted Revenue",
    valueType: "currency",
    numerator: { dateField: "date_quoted", includes: countsAsQuote, amount: salesPrice },
    subtitle: (year) => `Quoted jobs, ${year}`,
  },
  sold_revenue: {
    label: "Sold Revenue",
    valueType: "currency",
    numerator: { dateField: "date_sold", includes: isSold, amount: salesPrice },
    subtitle: (year) => `Sold jobs, ${year}`,
  },
  conversion_dollar: {
    label: "Conversion % ($)",
    valueType: "percent",
    numerator: { dateField: "date_sold", includes: isSold, amount: salesPrice },
    denominator: { dateField: "date_quoted", includes: countsAsQuote, amount: salesPrice },
    subtitle: (year) => `Sold revenue ÷ Quoted revenue, ${year}`,
  },
  sold_margin: {
    label: "Sold Margin",
    valueType: "currency",
    numerator: { dateField: "date_sold", includes: isSold, amount: margin },
    subtitle: (year) => `Sold jobs, ${year}`,
  },
  avg_margin: {
    label: "Avg Margin %",
    valueType: "percent",
    numerator: { dateField: "date_sold", includes: isSold, amount: margin },
    denominator: { dateField: "date_sold", includes: isSold, amount: salesPrice },
    subtitle: (year) => `Sold jobs, ${year}`,
  },
  avg_job_value: {
    label: "Avg Job $",
    valueType: "currency",
    // Sold revenue ÷ sold jobs — same specs as sold_revenue/sold_jobs, so this
    // metric's value is that quotient by construction.
    numerator: { dateField: "date_sold", includes: isSold, amount: salesPrice },
    denominator: { dateField: "date_sold", includes: isSold, amount: countOne },
    subtitle: (year) => `Sold revenue ÷ Sold jobs, ${year}`,
  },
} satisfies Record<string, MetricDefinition>

/** Union of valid metric ids, derived from the registry keys. */
export type MetricId = keyof typeof METRICS_REGISTRY

/** All metrics, in registry (and summary-card grid) order. Stable references. */
export const DASHBOARD_METRICS: DashboardMetric[] = (
  Object.keys(METRICS_REGISTRY) as MetricId[]
).map((id) => ({ id, ...METRICS_REGISTRY[id] }))

/** The metric shown on first load. */
export const DEFAULT_METRIC_ID: MetricId = "sold_revenue"

/** Look up a metric by id, returning its shared stable object from the registry. */
export function getMetric(id: MetricId): DashboardMetric {
  return DASHBOARD_METRICS.find((metric) => metric.id === id)!
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per value-type formatters:
 *   `axis` — compact, for the chart's Y-axis ticks ("$1.2M", "250", "45%")
 *   `full` — precise, for summary cards and chart tooltips ("$1,234,567.00")
 */
const FORMATTERS_BY_TYPE: Record<
  MetricValueType,
  { axis: (value: number) => string; full: (value: number) => string }
> = {
  currency: { axis: formatCurrencyShort, full: formatCurrency },
  count: { axis: (value) => String(Math.round(value)), full: formatNumber },
  percent: { axis: (value) => `${value.toFixed(0)}%`, full: formatPercent },
}

/** Axis (compact) and full (precise) formatters for a metric's value type. */
export function metricFormatters(metric: DashboardMetric) {
  return FORMATTERS_BY_TYPE[metric.valueType]
}

/** Format a single metric value for display on its summary card. */
export function formatMetricValue(metric: DashboardMetric, value: number): string {
  return FORMATTERS_BY_TYPE[metric.valueType].full(value)
}

// ─────────────────────────────────────────────────────────────────────────────
// Calculation — shared math used by both the summary cards and the chart, so a
// metric is defined and evaluated in exactly one place.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Combine numerator and denominator totals into the metric's displayed value.
 * Plain sums ignore the denominator; ratios divide (guarding ÷0) and scale to a
 * percentage for "percent" metrics.
 */
function resolveValue(
  metric: DashboardMetric,
  numeratorTotal: number,
  denominatorTotal: number,
): number {
  if (!metric.denominator) return numeratorTotal
  const quotient = denominatorTotal !== 0 ? numeratorTotal / denominatorTotal : 0
  return metric.valueType === "percent" ? quotient * 100 : quotient
}

/** Round currency/counts to whole units, percentages to 2 decimals (chart points). */
function roundValue(metric: DashboardMetric, value: number): number {
  return metric.valueType === "percent" ? Math.round(value * 100) / 100 : Math.round(value)
}

/** True when a job falls in the selected year by this spec's own date column. */
function specMatchesYear(spec: MetricSpec, job: DashboardJob, year: number | "all"): boolean {
  if (!spec.includes(job)) return false
  const date = job[spec.dateField]
  if (!date) return false
  return year === "all" || getYear(parseISO(date)) === year
}

/**
 * The metric's value over a set of jobs for one year (or "all" years) — the
 * single scalar shown on a summary card. Numerator and denominator are summed
 * in one pass over the jobs.
 *
 * @example computeMetricValue(jobs, getMetric("conversion_jobs"), 2026) // → 42.7
 */
export function computeMetricValue(
  jobs: DashboardJob[],
  metric: DashboardMetric,
  year: number | "all",
): number {
  let numeratorTotal = 0
  let denominatorTotal = 0
  for (const job of jobs) {
    if (specMatchesYear(metric.numerator, job, year)) {
      numeratorTotal += metric.numerator.amount(job)
    }
    if (metric.denominator && specMatchesYear(metric.denominator, job, year)) {
      denominatorTotal += metric.denominator.amount(job)
    }
  }
  return resolveValue(metric, numeratorTotal, denominatorTotal)
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart series
// ─────────────────────────────────────────────────────────────────────────────

/** Accumulator keyed by year → 12 monthly totals (index 0 = Jan … 11 = Dec). */
type MonthlyTotalsByYear = Record<number, number[]>

/**
 * One chart row per month. `month` is the short label; every other key is a
 * year string mapping to that year's value for the month.
 * @example { month: "Mar", "2025": 410000, "2026": 530000 }
 */
type MetricChartRow = Record<string, string | number>

interface MetricSeries {
  rows: MetricChartRow[]
  /** Years present in the data, ascending — one chart line/bar each. */
  years: number[]
}

/** Add a job's contribution to a year/month accumulator for one spec. */
function accumulate(totals: MonthlyTotalsByYear, spec: MetricSpec, job: DashboardJob): void {
  if (!spec.includes(job)) return
  const date = job[spec.dateField]
  if (!date) return
  const parsed = parseISO(date)
  const year = getYear(parsed)
  if (!totals[year]) totals[year] = Array(12).fill(0)
  totals[year][getMonth(parsed)] += spec.amount(job)
}

/**
 * Build the month-by-year series the chart renders for a metric.
 *
 * Numerator and denominator are bucketed in a single pass over the jobs.
 * `cumulative` reports each month's running year-to-date value; `monthly`
 * reports each month on its own. Ratio metrics divide numerator by denominator
 * at each point (using cumulative totals in cumulative mode).
 *
 * @example
 *   buildMetricSeries(jobs, getMetric("sold_revenue"), "monthly")
 *   // → { years: [2025, 2026],
 *   //     rows: [{ month: "Jan", "2025": 120000, "2026": 90000 }, …] }
 */
export function buildMetricSeries(
  jobs: DashboardJob[],
  metric: DashboardMetric,
  mode: ChartMode,
): MetricSeries {
  const numeratorByYear: MonthlyTotalsByYear = {}
  const denominatorByYear: MonthlyTotalsByYear = {}
  for (const job of jobs) {
    accumulate(numeratorByYear, metric.numerator, job)
    if (metric.denominator) accumulate(denominatorByYear, metric.denominator, job)
  }

  const years = [
    ...new Set([
      ...Object.keys(numeratorByYear).map(Number),
      ...Object.keys(denominatorByYear).map(Number),
    ]),
  ].sort((a, b) => a - b)

  // Resolve each year's 12 monthly values up front, honouring the chart mode.
  const valuesByYear: MonthlyTotalsByYear = {}
  for (const year of years) {
    const numeratorMonths = numeratorByYear[year] ?? Array(12).fill(0)
    const denominatorMonths = denominatorByYear[year] ?? Array(12).fill(0)
    const monthlyValues: number[] = Array(12).fill(0)

    let cumulativeNumerator = 0
    let cumulativeDenominator = 0
    for (let month = 0; month < 12; month++) {
      cumulativeNumerator += numeratorMonths[month]
      cumulativeDenominator += denominatorMonths[month]
      const [numerator, denominator] =
        mode === "cumulative"
          ? [cumulativeNumerator, cumulativeDenominator]
          : [numeratorMonths[month], denominatorMonths[month]]
      monthlyValues[month] = roundValue(metric, resolveValue(metric, numerator, denominator))
    }
    valuesByYear[year] = monthlyValues
  }

  const rows: MetricChartRow[] = MONTHS_SHORT.map((label, month) => {
    const row: MetricChartRow = { month: label }
    for (const year of years) row[String(year)] = valuesByYear[year][month]
    return row
  })

  return { rows, years }
}
