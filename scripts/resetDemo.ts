/**
 * scripts/resetDemo.ts — restore the public demo to its seeded state.
 *
 * Every visitor enters as a real role, so anything they can reach they can
 * break: jobs, the shared year-end plan, work types, divisions, and — via the
 * admin page — other people's roles and active flags. This puts all of it back.
 *
 * The important difference from seed.ts: this NEVER touches auth.users.
 * Deleting the auth rows would sign out anyone mid-visit and, because a reset
 * is meant to be routine, would make the demo feel broken rather than fresh.
 * Roles are restored with an UPDATE against DEMO_ACCOUNTS instead.
 *
 * Run by .github/workflows/demo-reseed.yml (nightly, plus manual dispatch).
 * Locally:
 *   DEMO_SUPABASE_URL=https://<ref>.supabase.co \
 *   DEMO_SUPABASE_SECRET_KEY=sb_secret_... \
 *   npm run demo:reset
 */

import { createClient } from "@supabase/supabase-js"

import type { Database } from "../src/types/database.types"
import { buildJobs, type JobInsert } from "./buildJobs"
import { DEMO_ACCOUNTS, DEMO_DIVISIONS, DEMO_WORK_TYPES, type SeededRole } from "./demoData"

const SUPABASE_URL = process.env.DEMO_SUPABASE_URL
const SECRET_KEY = process.env.DEMO_SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error("Set DEMO_SUPABASE_URL and DEMO_SUPABASE_SECRET_KEY (the service-role key).")
  process.exit(1)
}

const supabase = createClient<Database>(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SEEDED_EMAILS = new Set(DEMO_ACCOUNTS.map((account) => account.email))

/**
 * Refuse to run against anything that isn't the demo.
 *
 * A URL check would only prove someone typed the right host. This checks the
 * contents: the demo's accounts are all @vantage.test, so a database holding
 * any other account is somebody's real one. A stale or mistyped secret in the
 * workflow would otherwise wipe a live database.
 */
async function assertLooksLikeDemo() {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw new Error(`listUsers: ${error.message}`)

  const users = data?.users ?? []
  if (users.length === 0) {
    throw new Error("Refusing to reset: no accounts found — is this the right project?")
  }

  const foreign = users.filter((user) => !user.email || !SEEDED_EMAILS.has(user.email))
  if (foreign.length > 0) {
    const sample = foreign
      .slice(0, 3)
      .map((user) => user.email ?? "(no email)")
      .join(", ")
    throw new Error(
      `Refusing to reset: found ${foreign.length} account(s) outside the seeded demo set ` +
        `(${sample}). This does not look like the demo project.`,
    )
  }
}

/** Jobs first — they reference profiles, divisions and work types. */
async function clearJobData() {
  const { error: jobsError } = await supabase.from("jobs").delete().not("id", "is", null)
  if (jobsError) throw new Error(`delete jobs: ${jobsError.message}`)

  // updated_by is ON DELETE SET NULL, so a saved plan outlives everything else
  // and the next visitor would open against someone's stale target.
  const { error: planError } = await supabase
    .from("year_end_plans")
    .delete()
    .not("year", "is", null)
  if (planError) throw new Error(`delete year_end_plans: ${planError.message}`)
}

/**
 * Rebuild divisions and work types from scratch.
 *
 * A visitor can add work types and deactivate existing ones, and neither is
 * repairable by an upsert alone — the added rows have to go. Safe to delete
 * outright only because jobs (the sole foreign key) are already gone.
 */
async function resetReferenceData() {
  const { error: deleteDivisions } = await supabase.from("divisions").delete().not("id", "is", null)
  if (deleteDivisions) throw new Error(`delete divisions: ${deleteDivisions.message}`)

  const { error: deleteWorkTypes } = await supabase
    .from("work_types")
    .delete()
    .not("id", "is", null)
  if (deleteWorkTypes) throw new Error(`delete work_types: ${deleteWorkTypes.message}`)

  const { error: insertDivisions } = await supabase
    .from("divisions")
    .insert(DEMO_DIVISIONS.map((name) => ({ name, is_active: true })))
  if (insertDivisions) throw new Error(`insert divisions: ${insertDivisions.message}`)

  const { error: insertWorkTypes } = await supabase.from("work_types").insert(
    DEMO_WORK_TYPES.map((workType) => ({
      name: workType.name,
      is_active: true,
      is_roof_type_required: workType.isRoofTypeRequired,
    })),
  )
  if (insertWorkTypes) throw new Error(`insert work_types: ${insertWorkTypes.message}`)
}

/**
 * Put every seeded account back to its intended role and active state, without
 * going near auth.users. This is what undoes a visitor demoting the owner or
 * deactivating half the team from /admin.
 */
async function restoreProfiles() {
  for (const { email, role } of DEMO_ACCOUNTS) {
    const { error } = await supabase
      .from("profiles")
      .update({ role, is_active: true })
      .eq("email", email)
    if (error) throw new Error(`restore ${email}: ${error.message}`)
  }
}

async function fetchSeededUsers() {
  const { data, error } = await supabase.from("profiles").select("id, email, role")
  if (error) throw new Error(`read profiles: ${error.message}`)

  const idFor = (wanted: SeededRole) =>
    (data ?? []).filter((profile) => profile.role === wanted).map((profile) => profile.id)

  const owner = idFor("owner")[0]
  const manager = idFor("manager")[0]
  const salespeople = idFor("salesperson")

  if (!owner || !manager || salespeople.length === 0) {
    throw new Error("Expected owner, manager and salesperson profiles — run db:seed first.")
  }
  return { owner, manager, salespeople }
}

async function fetchReferenceData() {
  const { data: divisions } = await supabase.from("divisions").select("id")
  const { data: workTypes } = await supabase.from("work_types").select("id, is_roof_type_required")
  if (!divisions?.length || !workTypes?.length) {
    throw new Error("Reference data missing after reset — insert failed silently?")
  }
  return { divisionIds: divisions.map((d) => d.id), workTypes }
}

async function insertJobs(jobs: JobInsert[]) {
  for (let i = 0; i < jobs.length; i += 100) {
    const { error } = await supabase.from("jobs").insert(jobs.slice(i, i + 100))
    if (error) throw new Error(`insert jobs: ${error.message}`)
  }
}

async function main() {
  console.log(`Resetting demo data at ${SUPABASE_URL} …`)
  await assertLooksLikeDemo()

  await clearJobData()
  await resetReferenceData()
  await restoreProfiles()

  const users = await fetchSeededUsers()
  const ref = await fetchReferenceData()
  await insertJobs(buildJobs(ref, users))

  const { count } = await supabase.from("jobs").select("*", { count: "exact", head: true })
  console.log(
    `Done — ${DEMO_DIVISIONS.length} divisions, ${DEMO_WORK_TYPES.length} work types, ` +
      `${DEMO_ACCOUNTS.length} profiles restored, ${count} jobs. Auth accounts untouched.`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
