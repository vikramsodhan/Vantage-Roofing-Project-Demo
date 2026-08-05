import { describe, expect, it } from "vitest"

import { makeSchema } from "./jobFormSchema"

// Work-type lists to inject into makeSchema, which decides roof-type rules from them.
const nonRoofing = [{ id: "wt-nonroof", is_roof_type_required: false }]
const roofing = [{ id: "wt-roof", is_roof_type_required: true }]

// A fully valid job: non-roofing work type, not sold, days > 0. Each test overrides
// only the field(s) whose rule it exercises. Numbers are passed directly (the schema's
// preprocessors also accept the strings the form supplies).
function validInput(overrides: Record<string, unknown> = {}) {
  return {
    job_address: "123 Main St",
    notes: null,
    division_id: "div-1",
    work_type_id: "wt-nonroof",
    roof_type: null,
    salesperson_id: "sales-1",
    sold: false,
    exclude_from_quote_metrics: false,
    date_quoted: "2024-01-01",
    date_sold: null,
    squares: 10,
    days: 2,
    materials: 0,
    labour: 0,
    disposal: 0,
    warranty: 0,
    other: 0,
    gutters: 0,
    actual_materials: 0,
    actual_labour: 0,
    actual_disposal: 0,
    actual_warranty: 0,
    actual_other: 0,
    actual_gutters: 0,
    total_job_cost: 0,
    sales_price: 0,
    mgn: 0,
    markup_pct: 40,
    ...overrides,
  }
}

// Validate an input and return just the error messages ([] when it passes).
function errorMessages(schema: ReturnType<typeof makeSchema>, input: unknown): string[] {
  const result = schema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe("makeSchema", () => {
  it("accepts a fully valid job", () => {
    expect(errorMessages(makeSchema(nonRoofing, null), validInput())).toEqual([])
  })

  it.each([
    ["job_address", "Job address is required"],
    ["division_id", "Division is required"],
    ["work_type_id", "Type of work is required"],
    ["salesperson_id", "Salesperson is required"],
    ["date_quoted", "Date quoted is required"],
  ])("requires %s", (field, message) => {
    const messages = errorMessages(makeSchema(nonRoofing, null), validInput({ [field]: "" }))
    expect(messages).toContain(message)
  })

  it("requires date_sold when the job is sold", () => {
    const messages = errorMessages(
      makeSchema(nonRoofing, null),
      validInput({ sold: true, date_sold: null }),
    )
    expect(messages).toContain("Date sold is required when job is sold")
  })

  it("accepts a sold job that has a date_sold", () => {
    const messages = errorMessages(
      makeSchema(nonRoofing, null),
      validInput({ sold: true, date_sold: "2024-02-01" }),
    )
    expect(messages).toEqual([])
  })

  it("rejects a quote dated after the sale", () => {
    const messages = errorMessages(
      makeSchema(nonRoofing, null),
      validInput({ sold: true, date_quoted: "2024-05-01", date_sold: "2024-02-01" }),
    )
    expect(messages).toContain("Date quoted must be on or before date sold")
  })

  it("requires days greater than 0", () => {
    const messages = errorMessages(makeSchema(nonRoofing, null), validInput({ days: 0 }))
    expect(messages).toContain("Days must be greater than 0")
  })

  it("requires a roof type for a roofing work type", () => {
    const messages = errorMessages(
      makeSchema(roofing, null),
      validInput({ work_type_id: "wt-roof", roof_type: null }),
    )
    expect(messages).toContain("Roof type is required for this work type")
  })

  it("requires squares for a re-roof job", () => {
    const messages = errorMessages(
      makeSchema(roofing, null),
      validInput({ work_type_id: "wt-roof", roof_type: "reroof", squares: 0 }),
    )
    expect(messages).toContain("Squares is required for re-roofing jobs")
  })

  it("applies roof-type rules to a pending (not-yet-saved) work type", () => {
    const messages = errorMessages(
      makeSchema([], { is_roof_type_required: true }),
      validInput({ work_type_id: "__new__", roof_type: null }),
    )
    expect(messages).toContain("Roof type is required for this work type")
  })

  it("rejects notes longer than 5000 characters", () => {
    const schema = makeSchema(nonRoofing, null)
    expect(errorMessages(schema, validInput({ notes: "x".repeat(5001) }))).toContain(
      "Notes must be 5000 characters or fewer",
    )
  })

  it("coerces blank and numeric-string number inputs (the form sends strings)", () => {
    // A blank cost field becomes 0 (not an error); numeric strings parse.
    const schema = makeSchema(nonRoofing, null)
    expect(errorMessages(schema, validInput({ materials: "", squares: "15" }))).toEqual([])
  })

  it("rejects a negative cost (num) but allows a negative margin (anyNum)", () => {
    const schema = makeSchema(nonRoofing, null)
    expect(schema.safeParse(validInput({ materials: -5 })).success).toBe(false)
    expect(schema.safeParse(validInput({ mgn: -5 })).success).toBe(true)
  })

  it("enforces the -100% markup floor", () => {
    const schema = makeSchema(nonRoofing, null)
    expect(errorMessages(schema, validInput({ markup_pct: -150 }))).toContain(
      "Markup can't be below -100%",
    )
    expect(errorMessages(schema, validInput({ markup_pct: -100 }))).toEqual([])
  })
})
