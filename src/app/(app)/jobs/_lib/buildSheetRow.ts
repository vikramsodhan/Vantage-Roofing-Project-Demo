import { format, parseISO } from "date-fns"

import type { JobWithCalculations } from "@/types"

// The job fields needed to build a spreadsheet row, in no particular order.
type SheetRowJob = Pick<
  JobWithCalculations,
  | "job_address"
  | "division_name"
  | "date_quoted"
  | "date_sold"
  | "sold"
  | "work_type_name"
  | "roof_type"
  | "salesperson_name"
  | "squares"
  | "days"
  | "materials"
  | "labour"
  | "disposal"
  | "warranty"
  | "other"
  | "gutters"
  | "total_job_cost"
  | "sales_price"
>

// Raw number for the cell — empty string when missing so the spreadsheet cell stays blank.
function numCell(value: number | null | undefined): string {
  return value == null ? "" : String(value)
}

// Strip tabs/newlines so a text value can't break the tab-separated row layout.
function textCell(value: string | null | undefined): string {
  return (value ?? "").replace(/[\t\n\r]+/g, " ")
}

// 3-letter month (e.g. "Jun") from a YYYY-MM-DD date string; empty when absent.
function monthCell(value: string | null | undefined): string {
  return value ? format(parseISO(value), "MMM") : ""
}

/**
 * Build a single tab-separated line matching the legacy Google Sheet column order, so a user
 * can paste it into the first cell of a new row and have every cell fill in. Emits 18 values;
 * the sheet's trailing MGN/Day and EE MGN/Day formula columns are intentionally left out.
 */
export function buildSheetRow(job: SheetRowJob): string {
  // Jobs with a roof type prefix the work type, e.g. "RR_Vista" / "NR_Metal".
  const roofPrefix = job.roof_type === "reroof" ? "RR_" : job.roof_type === "newroof" ? "NR_" : ""

  const cells = [
    textCell(job.job_address), // Job Address
    (job.division_name ?? "").charAt(0).toUpperCase(), // div (single capital letter)
    monthCell(job.date_quoted), // MQ
    monthCell(job.date_sold), // MS
    job.sold ? "Y" : "", // Sold
    textCell(roofPrefix + (job.work_type_name ?? "")), // Type of Work (RR_/NR_ prefix)
    textCell(job.salesperson_name).trim().split(/\s+/)[0] ?? "", // Salesperson (first name)
    numCell(job.squares), // Sq
    numCell(job.days), // Days
    numCell(job.materials), // Materials
    numCell(job.labour), // Labour
    numCell(job.disposal), // Disposal
    numCell(job.warranty), // Warranty
    numCell(job.other), // OTH
    numCell(job.gutters), // Gutters
    numCell(job.total_job_cost), // Total Job Cost
    "", // Total Cost % — blank in the sheet; placeholder keeps later columns aligned
    numCell(job.sales_price), // Sales Price
  ]

  return cells.join("\t")
}
