import { format, parseISO } from "date-fns"

export const EMPTY = "—"

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" })
const cadShort = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
})
const num = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 2 })

export function formatCurrency(value: number | string | null | undefined): string {
  if (value == null) return EMPTY
  const n = Number(value)
  return isNaN(n) ? EMPTY : cad.format(n)
}

/**
 * Compact currency for axis ticks and dense KPI labels. Negatives (e.g. a
 * negative sold-margin total) are abbreviated too, keeping their sign.
 * Examples: 1_500_000 → "$1.5M", 12_345 → "$12K", 850 → "$850",
 * -2_000_000 → "-$2.0M".
 */
export function formatCurrencyShort(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? "-" : ""
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return cadShort.format(value)
}

export const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const
export const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

/**
 * Format a percentage with two decimal places. Negative values keep their
 * sign; positives don't get a "+" prefix here — callers that want the sign
 * (e.g. percent-change cells) should add it explicitly.
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

/**
 * A ratio (numerator ÷ denominator) rendered as a percentage — used by the
 * dashboard breakdown tables for the conversion and margin columns. Returns
 * EMPTY ("—") when the denominator is 0 so empty periods don't show 0% or NaN.
 */
export function formatRatioPercent(numerator: number, denominator: number): string {
  return denominator > 0 ? formatPercent((numerator / denominator) * 100) : EMPTY
}

/**
 * Percent change with a sign indicator. Used by Year-over-Year cells.
 * Returns null for "no comparison possible" (prev is 0 or null).
 */
export function formatPercentChange(
  prev: number | null | undefined,
  curr: number,
): { text: string; direction: "up" | "down" | "flat" } | null {
  if (prev == null || prev === 0) return null
  const pct = ((curr - prev) / prev) * 100
  const sign = pct > 0 ? "+" : ""
  return {
    text: `${sign}${formatPercent(pct)}`,
    direction: pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat",
  }
}

// Date-only strings (YYYY-MM-DD): parseISO is safe, no timezone shift
export function formatDate(value: string | null | undefined): string {
  if (!value) return EMPTY
  return format(parseISO(value), "MMMM d, yyyy")
}

// Full timestamps from the DB (e.g. date_entered, updated_at)
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return EMPTY
  return format(parseISO(value), "MMM d, yyyy, h:mm a")
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value == null) return EMPTY
  const n = Number(value)
  return isNaN(n) ? EMPTY : num.format(n)
}
