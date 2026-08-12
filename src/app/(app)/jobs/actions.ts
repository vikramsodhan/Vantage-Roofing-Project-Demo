"use server"

// Server actions for job CRUD — no API routes. Never throw; always return
// ServerActionResult so the client branches on { success }. See docs/DESIGN.md:
// "Server actions over API routes".

import { revalidatePath } from "next/cache"

import { requireActiveAccount, type ServerActionResult } from "@/lib/actions"
import { canChangeSalesperson, canUserModifyJob } from "@/lib/authorization/jobPermissions"
import { getProfile } from "@/lib/supabase/getProfile"
import { createClient } from "@/lib/supabase/server"
import { insertWorkType } from "@/lib/workTypes"
import type { JobInsert, JobUpdate, Profile, WorkType } from "@/types"

import { zeroActualsWhenUnsold } from "./_lib/actualCosts"

type PendingWorkType = Pick<WorkType, "name" | "is_roof_type_required">
type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// trim() the text, then turn a blank result into null. `"".trim() || null`
// evaluates to null because an empty string is falsy — so whitespace-only input
// is stored as null rather than "". Used for optional text fields like notes.
function trimToNull(value: string | null | undefined): string | null {
  return value?.trim() || null
}

async function getAuthContext() {
  const supabase = await createClient()
  const profile = await getProfile()
  return { supabase, profile }
}

// Loads the job's current salesperson_id from the DB and verifies the caller is
// allowed to modify it. Returns ServerActionResult so callers can `return auth` on
// failure and propagate the error shape unchanged. RLS enforces this same
// ownership rule at the DB layer for every caller of this helper — this check is
// defense in depth, not the only gate.
//
// The salesperson_id MUST be fetched server-side from a trusted source — never
// read it off the client payload, since that would let a caller spoof ownership
// and authorize themselves.
async function requireJobModifyPermission(
  supabase: SupabaseClient,
  profile: Profile,
  jobId: string,
): Promise<ServerActionResult> {
  const { data: job } = await supabase
    .from("jobs")
    .select("salesperson_id")
    .eq("id", jobId)
    .single()

  if (!job) return { success: false, error: "Job not found." }

  if (!canUserModifyJob(profile, job.salesperson_id)) {
    return { success: false, error: "You don't have permission to modify this job." }
  }

  return { success: true, id: jobId }
}

// Inserts a brand-new work type entered inline from the job form and returns its id.
// Wraps the shared insertWorkType helper with this flow’s ServerActionResult shape
// and a revalidation of /admin so the new entry appears in the admin list.
async function insertPendingWorkType(
  supabase: SupabaseClient,
  pending: PendingWorkType,
): Promise<ServerActionResult> {
  try {
    const id = await insertWorkType(supabase, pending)
    revalidatePath("/admin")
    return { success: true, id }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create work type." }
  }
}

/**
 * Creates a new job. Stamps entered_by with the server-side user id and pins
 * salesperson_id for anyone who may not choose it, so neither authorship nor
 * attribution can be spoofed. RLS also requires an active user to insert,
 * mirroring requireActiveAccount below.
 */
export async function createJob(
  payloadData: JobInsert & { pending_work_type: PendingWorkType | null },
): Promise<ServerActionResult> {
  const { supabase, profile } = await getAuthContext()

  const auth = requireActiveAccount(profile)
  if (!auth.ok) return auth.result

  const { pending_work_type, ...jobData } = payloadData
  let workTypeId = jobData.work_type_id

  if (pending_work_type) {
    const result = await insertPendingWorkType(supabase, pending_work_type)
    if (!result.success) return result
    workTypeId = result.id
  }

  // Only managers and owners may attribute a job to someone else.
  const salespersonId = canChangeSalesperson(auth.profile)
    ? jobData.salesperson_id
    : auth.profile.id

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      ...jobData,
      ...zeroActualsWhenUnsold(jobData.sold),
      job_address: jobData.job_address.trim(),
      notes: trimToNull(jobData.notes),
      work_type_id: workTypeId,
      salesperson_id: salespersonId,
      entered_by: auth.profile.id,
    })
    .select("id")
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/jobs")
  revalidatePath("/dashboard")
  return { success: true, id: data.id }
}

/**
 * Updates a job. Re-checks modify permission server-side — the edit UI is
 * gated, but this action can be invoked directly. entered_by is dropped from
 * the payload; only createJob may set a job's original creator.
 */
export async function updateJob(
  payloadData: JobUpdate & { pending_work_type: PendingWorkType | null },
  id: string,
): Promise<ServerActionResult> {
  const { supabase, profile } = await getAuthContext()

  const auth = requireActiveAccount(profile)
  if (!auth.ok) return auth.result

  const permission = await requireJobModifyPermission(supabase, auth.profile, id)
  if (!permission.success) return permission

  const { pending_work_type, ...jobData } = payloadData
  let workTypeId = jobData.work_type_id

  if (pending_work_type) {
    const result = await insertPendingWorkType(supabase, pending_work_type)
    if (!result.success) return result
    workTypeId = result.id
  }

  // entered_by records the job's ORIGINAL creator — only createJob may set it.
  // A client-supplied value can't be trusted, so drop it before the update.
  delete jobData.entered_by

  const { error } = await supabase
    .from("jobs")
    .update({
      ...jobData,
      ...zeroActualsWhenUnsold(jobData.sold),
      job_address: jobData.job_address?.trim(),
      notes: trimToNull(jobData.notes),
      work_type_id: workTypeId,
    })
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/jobs")
  revalidatePath(`/jobs/${id}`)
  revalidatePath("/dashboard")
  return { success: true, id }
}

/**
 * Toggles whether an unsold job counts in the dashboard's quote metrics. Same
 * permission model as editing. See isIncludedInDashboard in lib/metrics.ts
 * for the inclusion rule this controls.
 */
export async function setJobExcludeFromQuoteMetrics(
  jobId: string,
  exclude: boolean,
): Promise<ServerActionResult> {
  const { supabase, profile } = await getAuthContext()

  const auth = requireActiveAccount(profile)
  if (!auth.ok) return auth.result

  const permission = await requireJobModifyPermission(supabase, auth.profile, jobId)
  if (!permission.success) return permission

  const { error } = await supabase
    .from("jobs")
    .update({ exclude_from_quote_metrics: exclude })
    .eq("id", jobId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/jobs")
  revalidatePath("/dashboard")
  return { success: true, id: jobId }
}

/**
 * Deletes a job after re-checking modify permission server-side.
 */
export async function deleteJob(jobId: string): Promise<ServerActionResult> {
  const { supabase, profile } = await getAuthContext()

  const auth = requireActiveAccount(profile)
  if (!auth.ok) return auth.result

  const permission = await requireJobModifyPermission(supabase, auth.profile, jobId)
  if (!permission.success) return permission

  const { error } = await supabase.from("jobs").delete().eq("id", jobId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/jobs")
  revalidatePath("/dashboard")
  return { success: true, id: jobId }
}
