import { z } from "zod"

/**
 * Blank/undefined means "no override" (falls back to the live value) — unlike a
 * typical form field, this must NOT coerce to 0, since 0 is itself a valid,
 * distinct override value (e.g. an explicit avgJobValue of 0).
 *
 * Exported so the form converts its strings exactly the way the schema will,
 * rather than keeping a second near-identical parser next to this one.
 * Unparseable input stays NaN so z.number() rejects it — mapping it to null
 * would silently turn a typo into "no override", and a wrong value saved
 * quietly is worse than a visible error.
 */
export function coerceNullableNumber(value: unknown): number | null {
  if (typeof value === "number") return value
  if (value == null) return null
  const trimmed = String(value).trim()
  if (trimmed === "") return null
  return Number(trimmed)
}

// A small factory: builds one field's schema with its bounds baked in, so the
// six fields below each get their own rules without repeating the preprocess
// + nullable boilerplate six times.
function nullableNum(bounds: { min?: number; max?: number; int?: boolean } = {}) {
  let schema = z.number()
  if (bounds.int) schema = schema.int()
  if (bounds.min !== undefined) schema = schema.min(bounds.min)
  if (bounds.max !== undefined) schema = schema.max(bounds.max)
  return z.preprocess(coerceNullableNumber, schema.nullable())
}

/**
 * Mirrors year_end_plans' CHECK constraints and PlanOverrides' shape — shared by
 * both the form and saveYearEndPlan, so a malformed request can't reach the
 * shared company row from either path.
 *
 * Months remaining is the one bound the database can't express on its own: its
 * CHECK allows 1–12 year-round, but the real ceiling is however many months are
 * left in *this* year, since the plan can't run past December. That depends on
 * today, so it's a parameter — same shape as jobFormSchema's makeSchema, which
 * takes the work types its cross-field rules need.
 */
export function makeYearEndPlanSchema(maxMonthsRemaining: number) {
  return z.object({
    targetRevenue: nullableNum({ min: 0 }),
    revenue: nullableNum({ min: 0 }),
    jobsSold: nullableNum({ min: 0, int: true }),
    avgJobValue: nullableNum({ min: 0 }),
    conversionPct: nullableNum({ min: 0, max: 100 }),
    monthsRemaining: nullableNum({ min: 1, max: maxMonthsRemaining, int: true }),
  })
}

export type YearEndPlanInput = z.infer<ReturnType<typeof makeYearEndPlanSchema>>
