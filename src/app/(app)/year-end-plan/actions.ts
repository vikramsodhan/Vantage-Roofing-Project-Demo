"use server"

import { revalidatePath } from "next/cache"

import { requireRole, type ServerActionResult } from "@/lib/actions"
import { isManagerOrOwner } from "@/lib/authorization/roles"
import { createClient } from "@/lib/supabase/server"

import { makeYearEndPlanSchema } from "./_lib/planSchema"
import { monthsRemainingInYear } from "./_lib/yearEndPlanMath"

// The plan row is a network-reachable write to a single shared company record,
// so — unlike other actions, which trust the client's declared TS type — this
// re-validates with the same schema the form uses, not just the type checker.
export async function saveYearEndPlan(input: unknown): Promise<ServerActionResult> {
  const auth = await requireRole(
    isManagerOrOwner,
    "Only managers and owners can perform this action.",
  )
  if (!auth.ok) return auth.result

  // The months ceiling is whatever is left of this year, so the schema is built
  // against the same clock the row is keyed by.
  const today = new Date()
  const parsed = makeYearEndPlanSchema(monthsRemainingInYear(today)).safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid plan values." }
  }

  const year = today.getUTCFullYear()
  const supabase = await createClient()
  const { error } = await supabase.from("year_end_plans").upsert({
    year,
    target_revenue: parsed.data.targetRevenue,
    revenue_override: parsed.data.revenue,
    jobs_sold_override: parsed.data.jobsSold,
    avg_job_value_override: parsed.data.avgJobValue,
    conversion_pct_override: parsed.data.conversionPct,
    months_remaining_override: parsed.data.monthsRemaining,
    updated_by: auth.profile.id,
  })
  if (error) return { success: false, error: error.message }

  revalidatePath("/year-end-plan")
  return { success: true, id: String(year) }
}
