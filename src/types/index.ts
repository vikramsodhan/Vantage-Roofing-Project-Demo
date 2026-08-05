import type { Database } from "./database.types"

// Makes specific keys on T non-nullable without touching the rest
type WithRequired<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> }

type _ViewRow = Database["public"]["Views"]["jobs_with_calculations"]["Row"]

// PostgreSQL views cannot carry NOT NULL constraints — the catalog marks every view
// column as nullable regardless of the base table. These fields come from NOT NULL
// columns in the jobs table and are guaranteed non-null in practice.
export type JobWithCalculations = WithRequired<
  _ViewRow,
  | "id"
  | "job_address"
  | "division_id"
  | "work_type_id"
  | "salesperson_id"
  | "sold"
  | "exclude_from_quote_metrics"
  | "date_quoted"
  | "squares"
  | "days"
  | "materials"
  | "labour"
  | "disposal"
  | "warranty"
  | "other"
  | "gutters"
  | "actual_materials"
  | "actual_labour"
  | "actual_disposal"
  | "actual_warranty"
  | "actual_other"
  | "actual_gutters"
  | "sales_price"
  | "total_job_cost"
  | "mgn"
  | "markup_pct"
  | "actual_total_job_cost"
  | "date_entered"
  | "entered_by"
  | "updated_at"
>

// The subset of view columns used by the dashboard
export type DashboardJob = Pick<
  JobWithCalculations,
  | "id"
  | "sold"
  | "exclude_from_quote_metrics"
  | "date_quoted"
  | "date_sold"
  | "sales_price"
  | "mgn"
  | "salesperson_id"
  | "salesperson_name"
>

// The subset of view columns used by the jobs table UI
export type JobRow = Pick<
  JobWithCalculations,
  | "id"
  | "job_address"
  | "notes"
  | "sold"
  | "salesperson_id"
  | "salesperson_name"
  | "division_id"
  | "division_name"
  | "work_type_id"
  | "work_type_name"
  | "roof_type"
  | "date_quoted"
  | "date_sold"
  | "exclude_from_quote_metrics"
  | "squares"
  | "days"
  | "total_job_cost"
  | "sales_price"
  | "mgn"
>

export type Job = Database["public"]["Tables"]["jobs"]["Row"]
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Division = Database["public"]["Tables"]["divisions"]["Row"]
export type WorkType = Database["public"]["Tables"]["work_types"]["Row"]
export type YearEndPlan = Database["public"]["Tables"]["year_end_plans"]["Row"]

export type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"]
export type JobUpdate = Database["public"]["Tables"]["jobs"]["Update"]

// Columns JobForm prefills when editing — keep in sync with the select in
// jobs/[id]/edit/page.tsx (typecheck fails if the select drops a needed column).
export type JobFormDefaults = Pick<
  Job,
  | "id"
  | "job_address"
  | "notes"
  | "division_id"
  | "work_type_id"
  | "roof_type"
  | "salesperson_id"
  | "sold"
  | "exclude_from_quote_metrics"
  | "date_quoted"
  | "date_sold"
  | "squares"
  | "days"
  | "materials"
  | "labour"
  | "disposal"
  | "warranty"
  | "other"
  | "gutters"
  | "actual_materials"
  | "actual_labour"
  | "actual_disposal"
  | "actual_warranty"
  | "actual_other"
  | "actual_gutters"
  | "total_job_cost"
  | "sales_price"
  | "mgn"
  | "markup_pct"
>

// Enums — derived from DB schema so they stay in sync automatically
export type Role = Database["public"]["Enums"]["user_role"]
export type RoofType = Database["public"]["Enums"]["job_roof_type"]
