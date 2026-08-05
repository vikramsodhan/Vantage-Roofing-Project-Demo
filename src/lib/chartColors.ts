/**
 * Single source of truth for chart series colors.
 *
 * Backed by the --chart-1..8 CSS custom properties declared in
 * src/app/globals.css (light + dark variants).
 */

const CHART_TOKEN_COUNT = 8

/**
 * Returns a CSS `var(--chart-N)` reference for a sorted-index series position.
 * Charts call this once per series (e.g. once per year), passing the index in
 * their sorted array. When a new entry is added, it picks up the next token in
 * rotation.
 *
 * Note: this is sorted-index based, not value-based — if older years drop off
 * the dataset, the remaining years' colors will shift. If we ever need stable
 * per-value mapping (e.g. 2026 is always the same color forever), key off the
 * year value: `(year % CHART_TOKEN_COUNT) + 1`.
 */
export function getYearColor(yearIndex: number): string {
  return `var(--chart-${(yearIndex % CHART_TOKEN_COUNT) + 1})`
}
