import { fetchAllDashboardJobs } from "@/lib/dashboardJobs"
import { isIncludedInDashboard } from "@/lib/metrics"
import { requireActiveProfile } from "@/lib/supabase/getProfile"
import { createClient } from "@/lib/supabase/server"

import DashboardClient from "./_components/DashboardClient"

export default async function DashboardPage() {
  await requireActiveProfile()

  const supabase = await createClient()

  const [rawJobs, { data: salespersons }] = await Promise.all([
    fetchAllDashboardJobs(supabase),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("is_active", true)
      .eq("role", "salesperson")
      .neq("full_name", "Unknown")
      .order("full_name"),
  ])

  // The single inclusion chokepoint every dashboard view inherits: keep a job if
  // it's sold (sold-wins) or its quote still counts. See isIncludedInDashboard.
  const jobs = rawJobs.filter(isIncludedInDashboard)

  return (
    <div className="p-6 md:p-10 mx-auto max-w-7xl">
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Sales performance overview.</p>
      </div>
      <DashboardClient jobs={jobs} salespersons={salespersons ?? []} />
    </div>
  )
}
