import { redirect } from "next/navigation"

import { isManagerOrOwner } from "@/lib/authorization/roles"
import { fetchAllDashboardJobs } from "@/lib/dashboardJobs"
import { computeMetricValue, getMetric, isIncludedInDashboard } from "@/lib/metrics"
import { requireActiveProfile } from "@/lib/supabase/getProfile"
import { createClient } from "@/lib/supabase/server"

import YearEndPlanClient from "./_components/YearEndPlanClient"

export default async function YearEndPlanPage() {
  const profile = await requireActiveProfile()

  if (!isManagerOrOwner(profile)) {
    redirect("/dashboard")
  }

  const today = new Date()
  const year = today.getUTCFullYear()
  const supabase = await createClient()

  const [rawJobs, { data: plan }] = await Promise.all([
    fetchAllDashboardJobs(supabase),
    supabase
      .from("year_end_plans")
      .select("*, updated_by_profile:profiles(full_name)")
      .eq("year", year)
      .maybeSingle(),
  ])

  // Unlike the dashboard, only these three scalars cross to the client — this
  // page needs the numbers, not the hundreds of rows behind them.
  const jobs = rawJobs.filter(isIncludedInDashboard)
  const live = {
    revenue: computeMetricValue(jobs, getMetric("sold_revenue"), year),
    jobsSold: computeMetricValue(jobs, getMetric("sold_jobs"), year),
    conversionPct: computeMetricValue(jobs, getMetric("conversion_jobs"), year),
  }

  return (
    <div className="p-6 md:p-10 mx-auto max-w-4xl">
      <YearEndPlanClient todayIso={today.toISOString()} live={live} plan={plan} />
    </div>
  )
}
