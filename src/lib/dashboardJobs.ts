import type { createClient } from "@/lib/supabase/server"
import type { DashboardJob } from "@/types"

// The dashboard aggregates every job client-side, so it needs the full set. A
// single .select() is capped by the project's PostgREST "Max rows" limit
// (default 1000), which silently truncates the rows and skews every metric — and
// that limit is a per-project setting, not part of a DB dump, so clones (dev,
// demo) revert to the default. Page through in fixed batches so the result is
// independent of the setting.
const DASHBOARD_JOB_COLUMNS =
  "id, sold, exclude_from_quote_metrics, date_quoted, date_sold, sales_price, mgn, salesperson_id, salesperson_name"

// Keep the batch at/under the default Max rows so each page comes back whole,
// and order by a stable key so pages don't overlap or skip rows.
const DASHBOARD_PAGE_SIZE = 1000

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export async function fetchAllDashboardJobs(
  supabase: SupabaseServerClient,
): Promise<DashboardJob[]> {
  const pageQuery = (from: number) =>
    supabase
      .from("jobs_with_calculations")
      .select(DASHBOARD_JOB_COLUMNS)
      .order("id", { ascending: true })
      .range(from, from + DASHBOARD_PAGE_SIZE - 1)

  type Row = NonNullable<Awaited<ReturnType<typeof pageQuery>>["data"]>[number]

  const all: Row[] = []
  for (let from = 0; ; from += DASHBOARD_PAGE_SIZE) {
    const { data, error } = await pageQuery(from)
    if (error) throw error
    if (!data?.length) break
    all.push(...data)
    if (data.length < DASHBOARD_PAGE_SIZE) break
  }
  // Safe cast at the query boundary — these fields are NOT NULL in the jobs table.
  // Views in database.types.ts mark all columns as nullable; see src/types/index.ts.
  return all as DashboardJob[]
}
