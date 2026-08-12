import { describe, expect, it } from "vitest"

import {
  EMPTY,
  formatCurrency,
  formatCurrencyShort,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatPercentChange,
  formatRatioPercent,
} from "./formatters"

describe("formatCurrency", () => {
  it("returns EMPTY for null, undefined, or non-numeric input", () => {
    expect(formatCurrency(null)).toBe(EMPTY)
    expect(formatCurrency(undefined)).toBe(EMPTY)
    expect(formatCurrency("abc")).toBe(EMPTY)
  })

  it("formats a number as CAD currency", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50")
  })
})

describe("formatCurrencyShort", () => {
  it("abbreviates millions to one decimal", () => {
    expect(formatCurrencyShort(1_500_000)).toBe("$1.5M")
  })

  it("abbreviates thousands with no decimals", () => {
    expect(formatCurrencyShort(12_345)).toBe("$12K")
  })

  it("formats sub-thousand values in full", () => {
    expect(formatCurrencyShort(850)).toBe("$850")
  })

  it("keeps the sign for negative values", () => {
    expect(formatCurrencyShort(-2_000_000)).toBe("-$2.0M")
    expect(formatCurrencyShort(-5_000)).toBe("-$5K")
  })
})

describe("formatPercent", () => {
  it("renders two decimals and keeps the sign", () => {
    expect(formatPercent(25)).toBe("25.00%")
    expect(formatPercent(-5.5)).toBe("-5.50%")
  })
})

describe("formatRatioPercent", () => {
  it("renders the ratio as a percentage", () => {
    expect(formatRatioPercent(1, 4)).toBe("25.00%")
  })

  it("returns EMPTY when the denominator is 0 (no 0% or NaN)", () => {
    expect(formatRatioPercent(5, 0)).toBe(EMPTY)
    expect(formatRatioPercent(0, 0)).toBe(EMPTY)
  })
})

describe("formatPercentChange", () => {
  it("returns null when there is no basis for comparison", () => {
    expect(formatPercentChange(null, 100)).toBeNull()
    expect(formatPercentChange(0, 100)).toBeNull()
  })

  it("marks an increase up, with a + sign", () => {
    expect(formatPercentChange(100, 150)).toEqual({ text: "+50.00%", direction: "up" })
  })

  it("marks a decrease down", () => {
    expect(formatPercentChange(100, 50)).toEqual({ text: "-50.00%", direction: "down" })
  })

  it("treats a negligible change as flat", () => {
    expect(formatPercentChange(100, 100)).toEqual({ text: "0.00%", direction: "flat" })
  })
})

describe("formatNumber", () => {
  it("returns EMPTY for null, undefined, or non-numeric input", () => {
    expect(formatNumber(null)).toBe(EMPTY)
    expect(formatNumber("abc")).toBe(EMPTY)
  })

  it("formats with grouping and up to two decimals", () => {
    expect(formatNumber(1234.5)).toBe("1,234.5")
  })
})

describe("formatDate", () => {
  it("returns EMPTY for a missing value", () => {
    expect(formatDate(null)).toBe(EMPTY)
    expect(formatDate(undefined)).toBe(EMPTY)
  })

  it("formats a date-only string with no timezone shift", () => {
    expect(formatDate("2024-07-15")).toBe("July 15, 2024")
  })
})

describe("formatDateTime", () => {
  it("returns EMPTY for a missing value", () => {
    expect(formatDateTime(null)).toBe(EMPTY)
  })

  it("formats a timestamp in the business timezone", () => {
    expect(formatDateTime("2024-07-15T21:30:00Z")).toBe("Jul 15, 2024, 2:30 PM")
  })
})
