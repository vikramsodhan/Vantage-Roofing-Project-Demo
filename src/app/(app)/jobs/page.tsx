import { Plus } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { requireActiveProfile } from "@/lib/supabase/getProfile"
import { createClient } from "@/lib/supabase/server"
import type { JobRow } from "@/types"

import JobFilters from "./_components/JobFilters"
import JobPagination from "./_components/JobPagination"
import JobTable from "./_components/JobTable"

const VALID_SORT = new Set([
  "date_quoted",
  "date_sold",
  "squares",
  "days",
  "total_job_cost",
  "sales_price",
  "mgn",
])
const PER_PAGE_OPTS = [10, 25, 50, 100]

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [profile, rawParams] = await Promise.all([requireActiveProfile(), searchParams])

  // Normalize to Record<string, string>
  const params: Record<string, string> = {}
  for (const [k, v] of Object.entries(rawParams)) {
    if (typeof v === "string") params[k] = v
    else if (Array.isArray(v) && v.length > 0) params[k] = v[0]
  }

  const sortCol = VALID_SORT.has(params.sort ?? "") ? params.sort : "date_entered"
  // Default is desc — only ascending when dir is explicitly "asc"
  const sortAsc = params.dir === "asc"

  const rawPerPage = parseInt(params.per_page ?? "25", 10)
  const perPage = PER_PAGE_OPTS.includes(rawPerPage) ? rawPerPage : 25
  const page = Math.max(1, parseInt(params.page ?? "1", 10))
  const offset = (page - 1) * perPage

  const supabase = await createClient()

  let query = supabase.from("jobs_with_calculations").select(
    `id, job_address, notes, sold,
       salesperson_id, salesperson_name,
       division_id, division_name,
       work_type_id, work_type_name, roof_type,
       date_quoted, date_sold, exclude_from_quote_metrics,
       squares, days,
       total_job_cost, sales_price, mgn`,
    { count: "exact" },
  )

  if (params.sold === "true") query = query.eq("sold", true)
  if (params.sold === "false") query = query.eq("sold", false)
  if (params.division_id) query = query.eq("division_id", params.division_id)
  if (params.salesperson_id) query = query.eq("salesperson_id", params.salesperson_id)
  if (params.work_type_id) query = query.eq("work_type_id", params.work_type_id)
  if (params.date_from) query = query.gte("date_quoted", params.date_from)
  if (params.date_to) query = query.lte("date_quoted", params.date_to)
  if (params.address) query = query.ilike("job_address", `%${params.address}%`)

  const [
    { data: rawJobs, count, error },
    { data: divisions },
    { data: salespersons },
    { data: workTypes },
  ] = await Promise.all([
    // Tiebreak by id so rows with equal sort keys (e.g. batch-migrated jobs share
    // date_entered) keep a stable order — otherwise an edit/toggle can reshuffle them.
    query
      .order(sortCol!, { ascending: sortAsc })
      .order("id", { ascending: true })
      .range(offset, offset + perPage - 1),
    supabase.from("divisions").select("id, name").eq("is_active", true).order("name"),
    supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
    supabase.from("work_types").select("id, name").eq("is_active", true).order("name"),
  ])

  // Single cast at the query boundary — safe because these fields are NOT NULL in the
  // jobs table schema. database.types.ts can't reflect this since PostgreSQL views
  // don't propagate NOT NULL constraints. See src/types/index.ts for the full explanation.
  const jobs = (rawJobs ?? []) as JobRow[]

  // Key forces JobFilters to remount with fresh local state when applied filters change
  const filterKey = [
    "sold",
    "division_id",
    "salesperson_id",
    "work_type_id",
    "date_from",
    "date_to",
    "address",
  ]
    .map((k) => params[k] ?? "")
    .join("|")

  return (
    <div className="p-6 md:p-8 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Jobs</h1>
          <p className="text-sm text-muted-foreground">Browse and manage roofing jobs.</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/jobs/new">
            <Plus className="size-4" />
            New Job
          </Link>
        </Button>
      </div>

      <JobFilters
        key={filterKey}
        divisions={divisions ?? []}
        salespersons={salespersons ?? []}
        workTypes={workTypes ?? []}
        current={params}
      />

      {error && <p className="text-sm text-destructive">Failed to load jobs: {error.message}</p>}

      <JobTable jobs={jobs ?? []} currentUserProfile={profile} searchParams={params} />

      <JobPagination total={count ?? 0} page={page} perPage={perPage} searchParams={params} />
    </div>
  )
}
