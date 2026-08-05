import { describe, expect, it } from "vitest"

import { coerceNullableNumber, makeYearEndPlanSchema } from "./planSchema"

describe("coerceNullableNumber", () => {
  it("passes a number through untouched", () => {
    expect(coerceNullableNumber(42)).toBe(42)
  })

  it("keeps 0 as 0 rather than collapsing it to null", () => {
    expect(coerceNullableNumber(0)).toBe(0)
    expect(coerceNullableNumber("0")).toBe(0)
  })

  it("reads a numeric string", () => {
    expect(coerceNullableNumber("12.5")).toBe(12.5)
  })

  it("trims before reading", () => {
    expect(coerceNullableNumber("  7  ")).toBe(7)
  })

  it("treats empty, whitespace-only, null and undefined as no override", () => {
    expect(coerceNullableNumber("")).toBeNull()
    expect(coerceNullableNumber("   ")).toBeNull()
    expect(coerceNullableNumber(null)).toBeNull()
    expect(coerceNullableNumber(undefined)).toBeNull()
  })

  it("returns NaN for unparseable input so the schema can reject it", () => {
    expect(coerceNullableNumber("banana")).toBeNaN()
    expect(coerceNullableNumber("12abc")).toBeNaN()
  })
})

// A January-style ceiling, so the shared cases aren't constrained by the month.
const yearEndPlanSchema = makeYearEndPlanSchema(12)

const valid = {
  targetRevenue: 500000,
  revenue: 100000,
  jobsSold: 10,
  avgJobValue: 20000,
  conversionPct: 50,
  monthsRemaining: 5,
}

describe("yearEndPlanSchema", () => {
  it("accepts a fully populated plan", () => {
    const result = yearEndPlanSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it("treats blank strings as null, not 0", () => {
    const result = yearEndPlanSchema.safeParse({ ...valid, revenue: "" })
    expect(result.success).toBe(true)
    expect(result.data?.revenue).toBeNull()
  })

  it("treats undefined as null", () => {
    const result = yearEndPlanSchema.safeParse({ ...valid, avgJobValue: undefined })
    expect(result.success).toBe(true)
    expect(result.data?.avgJobValue).toBeNull()
  })

  it("keeps an explicit 0 as 0, not null", () => {
    const result = yearEndPlanSchema.safeParse({ ...valid, avgJobValue: 0 })
    expect(result.success).toBe(true)
    expect(result.data?.avgJobValue).toBe(0)
  })

  it("coerces a numeric string to a number", () => {
    const result = yearEndPlanSchema.safeParse({ ...valid, jobsSold: "12" })
    expect(result.success).toBe(true)
    expect(result.data?.jobsSold).toBe(12)
  })

  it("rejects a non-integer jobsSold", () => {
    const result = yearEndPlanSchema.safeParse({ ...valid, jobsSold: 10.5 })
    expect(result.success).toBe(false)
  })

  it("rejects a negative revenue", () => {
    const result = yearEndPlanSchema.safeParse({ ...valid, revenue: -1 })
    expect(result.success).toBe(false)
  })

  it("rejects a conversionPct above 100", () => {
    const result = yearEndPlanSchema.safeParse({ ...valid, conversionPct: 101 })
    expect(result.success).toBe(false)
  })

  it("rejects a monthsRemaining of 0", () => {
    const result = yearEndPlanSchema.safeParse({ ...valid, monthsRemaining: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects a monthsRemaining above 12", () => {
    const result = yearEndPlanSchema.safeParse({ ...valid, monthsRemaining: 13 })
    expect(result.success).toBe(false)
  })

  it("rejects a fractional monthsRemaining", () => {
    const result = yearEndPlanSchema.safeParse({ ...valid, monthsRemaining: 2.5 })
    expect(result.success).toBe(false)
  })

  it("rejects unparseable input rather than treating it as no-override", () => {
    const result = yearEndPlanSchema.safeParse({ ...valid, revenue: "banana" })
    expect(result.success).toBe(false)
  })

  it("treats a whitespace-only string as null", () => {
    const result = yearEndPlanSchema.safeParse({ ...valid, revenue: "   " })
    expect(result.success).toBe(true)
    expect(result.data?.revenue).toBeNull()
  })

  it("rejects a monthsRemaining beyond what's left of the year", () => {
    // Standing in August there are 5 months left, so a 6-month window would run
    // into next year — the one bound the DB's flat 1-12 CHECK can't express.
    const august = makeYearEndPlanSchema(5)
    expect(august.safeParse({ ...valid, monthsRemaining: 6 }).success).toBe(false)
    expect(august.safeParse({ ...valid, monthsRemaining: 5 }).success).toBe(true)
    expect(august.safeParse({ ...valid, monthsRemaining: 2 }).success).toBe(true)
  })

  it("still allows a 1-month window in December", () => {
    const december = makeYearEndPlanSchema(1)
    expect(december.safeParse({ ...valid, monthsRemaining: 1 }).success).toBe(true)
    expect(december.safeParse({ ...valid, monthsRemaining: 2 }).success).toBe(false)
  })

  it("accepts every field blank at once (a brand-new, all-live plan)", () => {
    const result = yearEndPlanSchema.safeParse({
      targetRevenue: "",
      revenue: "",
      jobsSold: "",
      avgJobValue: "",
      conversionPct: "",
      monthsRemaining: "",
    })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      targetRevenue: null,
      revenue: null,
      jobsSold: null,
      avgJobValue: null,
      conversionPct: null,
      monthsRemaining: null,
    })
  })
})
