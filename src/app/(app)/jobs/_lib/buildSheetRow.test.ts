import { describe, expect, it } from "vitest"

import { buildSheetRow } from "./buildSheetRow"

// Reuse the function's own parameter type so we don't depend on an exported one.
type SheetRowJob = Parameters<typeof buildSheetRow>[0]

function makeJob(overrides: Partial<SheetRowJob> = {}): SheetRowJob {
  return {
    job_address: "1 Test Rd",
    division_name: "Residential",
    date_quoted: "2024-01-15",
    date_sold: "2024-02-15",
    sold: true,
    work_type_name: "Asphalt Shingle",
    roof_type: "reroof",
    salesperson_name: "Test Person",
    squares: 10,
    days: 1,
    materials: 0,
    labour: 0,
    disposal: 0,
    warranty: 0,
    other: 0,
    gutters: 0,
    total_job_cost: 0,
    sales_price: 0,
    ...overrides,
  }
}

// Cell index in the tab-separated row, for readable assertions.
const CELL = {
  address: 0,
  divisionLetter: 1,
  monthQuoted: 2,
  monthSold: 3,
  sold: 4,
  workType: 5,
  salesperson: 6,
  squares: 7,
} as const

function cells(job: SheetRowJob): string[] {
  return buildSheetRow(job).split("\t")
}

describe("buildSheetRow", () => {
  it("emits the sheet's tab-separated columns in order", () => {
    const row = cells(
      makeJob({
        job_address: "123 Main St",
        division_name: "Residential",
        date_quoted: "2024-03-10",
        date_sold: "2024-06-20",
        sold: true,
        work_type_name: "Asphalt Shingle",
        roof_type: "reroof",
        salesperson_name: "Alex Carter",
        squares: 20,
        days: 3,
        materials: 1000,
        labour: 2000,
        disposal: 100,
        warranty: 50,
        other: 0,
        gutters: 25,
        total_job_cost: 3175,
        sales_price: 5000,
      }),
    )

    expect(row).toEqual([
      "123 Main St", // Job Address
      "R", // Division → single capital letter
      "Mar", // Month Quoted
      "Jun", // Month Sold
      "Y", // Sold
      "RR_Asphalt Shingle", // Type of Work, reroof prefix
      "Alex", // Salesperson, first name only
      "20", // Squares
      "3", // Days
      "1000", // Materials
      "2000", // Labour
      "100", // Disposal
      "50", // Warranty
      "0", // Other
      "25", // Gutters
      "3175", // Total Job Cost
      "", // Total Cost % — blank placeholder
      "5000", // Sales Price
    ])
  })

  it("prefixes the work type by roof type", () => {
    const workType = (roof_type: SheetRowJob["roof_type"]) =>
      cells(makeJob({ roof_type, work_type_name: "Slate" }))[CELL.workType]
    expect(workType("reroof")).toBe("RR_Slate")
    expect(workType("newroof")).toBe("NR_Slate")
    expect(workType(null)).toBe("Slate")
  })

  it("marks sold with Y and unsold with a blank cell", () => {
    expect(cells(makeJob({ sold: true }))[CELL.sold]).toBe("Y")
    expect(cells(makeJob({ sold: false }))[CELL.sold]).toBe("")
  })

  it("uses only the salesperson's first name", () => {
    expect(cells(makeJob({ salesperson_name: "Alex Carter" }))[CELL.salesperson]).toBe("Alex")
  })

  it("leaves cells blank for missing values", () => {
    const row = cells(
      makeJob({
        division_name: null,
        date_sold: null,
        salesperson_name: null,
      }),
    )
    expect(row[CELL.divisionLetter]).toBe("")
    expect(row[CELL.monthSold]).toBe("")
    expect(row[CELL.salesperson]).toBe("")
  })

  it("strips tabs and newlines so text can't break the row layout", () => {
    expect(cells(makeJob({ job_address: "12\tMain\nSt" }))[CELL.address]).toBe("12 Main St")
  })
})
