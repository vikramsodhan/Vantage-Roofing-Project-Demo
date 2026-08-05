import { MONTHS_SHORT } from "@/lib/formatters"

/** The three live scalars computed server-side from this year's jobs. */
export interface LiveMetrics {
  revenue: number
  jobsSold: number
  conversionPct: number
}

/** Sparse overrides — null means "use the live value." Mirrors year_end_plans' nullable columns. */
export interface PlanOverrides {
  targetRevenue: number | null
  revenue: number | null
  jobsSold: number | null
  avgJobValue: number | null
  conversionPct: number | null
  monthsRemaining: number | null
}

export interface ResolvedPlan {
  year: number
  monthsRemaining: number
  monthRangeLabel: string
  revenue: number
  jobsSold: number
  conversionPct: number
  avgJobValue: number | null
  isOverridden: {
    revenue: boolean
    jobsSold: boolean
    conversionPct: boolean
    avgJobValue: boolean
    monthsRemaining: boolean
  }
  targetRevenue: number | null
  revenueNeeded: number | null
  isTargetMet: boolean
  jobsNeeded: number | null
  quotesNeeded: number | null
  jobsPerMonth: number | null
  quotesPerMonth: number | null
  revenuePerMonth: number | null
}

// The one guarded quotient every downstream field chains through — never NaN/Infinity.
function div(a: number | null, b: number | null): number | null {
  return a == null || b == null || b === 0 ? null : a / b
}

// UTC, not local time: the server (Vercel) runs UTC, and reading UTC here keeps
// this deterministic under any test runner's local timezone too.
export function monthsRemainingInYear(today: Date): number {
  return 12 - today.getUTCMonth()
}

/**
 * Counts forward from today's month. A shorter window is meaningful — "what
 * pace do I need over just the next two months" — but a longer one isn't: this
 * plans one calendar year, so the window can pull back off December yet never
 * past it. Hence the clamp instead of a wrap; Aug + 6 reads "Aug–Dec", never
 * "Aug–Jan", which would quietly describe a different year.
 *
 * The ceil is a guard, not the expected path: the column and schema both hold
 * months to whole numbers, but this is an exported pure function, and a
 * fractional argument would otherwise index between the month names.
 */
export function monthRangeLabel(today: Date, monthsRemaining: number): string {
  const startMonth = today.getUTCMonth()
  const endMonth = Math.min(startMonth + Math.ceil(monthsRemaining) - 1, 11)
  const start = MONTHS_SHORT[startMonth]
  return endMonth <= startMonth ? start : `${start}–${MONTHS_SHORT[endMonth]}`
}

// `today` is a parameter rather than `new Date()` called internally — dependency
// injection so tests can pin the calendar (Jan/Aug/Dec boundaries) instead of
// only ever running correctly on the day they happen to execute. In production
// the caller always passes the real `new Date()`.
export function resolvePlan(
  today: Date,
  live: LiveMetrics,
  overrides: PlanOverrides,
): ResolvedPlan {
  const monthsRemaining = overrides.monthsRemaining ?? monthsRemainingInYear(today)

  const revenue = overrides.revenue ?? live.revenue
  const jobsSold = overrides.jobsSold ?? live.jobsSold
  const conversionPct = overrides.conversionPct ?? live.conversionPct
  const avgJobValue = overrides.avgJobValue ?? div(revenue, jobsSold)

  const revenueNeeded = overrides.targetRevenue == null ? null : overrides.targetRevenue - revenue
  const isTargetMet = revenueNeeded != null && revenueNeeded <= 0
  // Target already met: floor the downstream chain at 0 rather than let a
  // negative revenueNeeded produce negative jobs/quotes.
  const revenueNeededForMath = revenueNeeded == null ? null : Math.max(revenueNeeded, 0)

  const jobsNeeded = div(revenueNeededForMath, avgJobValue)
  const quotesNeeded = div(jobsNeeded, conversionPct / 100)
  const jobsPerMonth = div(jobsNeeded, monthsRemaining)
  const quotesPerMonth = div(quotesNeeded, monthsRemaining)
  const revenuePerMonth = div(revenueNeededForMath, monthsRemaining)

  return {
    year: today.getUTCFullYear(),
    monthsRemaining,
    monthRangeLabel: monthRangeLabel(today, monthsRemaining),
    revenue,
    jobsSold,
    conversionPct,
    avgJobValue,
    isOverridden: {
      revenue: overrides.revenue !== null,
      jobsSold: overrides.jobsSold !== null,
      conversionPct: overrides.conversionPct !== null,
      avgJobValue: overrides.avgJobValue !== null,
      monthsRemaining: overrides.monthsRemaining !== null,
    },
    targetRevenue: overrides.targetRevenue,
    revenueNeeded,
    isTargetMet,
    jobsNeeded,
    quotesNeeded,
    jobsPerMonth,
    quotesPerMonth,
    revenuePerMonth,
  }
}
