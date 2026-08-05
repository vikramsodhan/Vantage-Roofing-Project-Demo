/**
 * scripts/seed.ts — deterministic test / demo data for a Supabase database.
 *
 * Creates auth users (a fixed owner, a manager, salespeople) + matching profiles,
 * then a few hundred realistic jobs. Idempotent (wipes existing users + jobs first)
 * and deterministic (fixed faker seed) so end-to-end assertions stay stable.
 *
 * Needs a SERVICE-ROLE / secret key: it bypasses RLS and uses the auth admin API.
 * Config comes from SEED_-prefixed env vars — deliberately distinct from the app's
 * own NEXT_PUBLIC_SUPABASE_* vars, so this can never pick up a real-DB connection
 * by accident. It also refuses non-local targets unless SEED_ALLOW_REMOTE=true
 * (this script WIPES all users + jobs).
 *
 * `npm run db:seed` loads scripts/.env.local; or pass inline:
 *   SEED_SUPABASE_URL=http://127.0.0.1:54321 \
 *   SEED_SUPABASE_SECRET_KEY=sb_secret_... \
 *   npm run db:seed
 */
import { faker } from "@faker-js/faker"
import { createClient } from "@supabase/supabase-js"

import type { Database } from "../src/types/database.types"
import { buildJobs, type JobInsert, type JobUsers } from "./buildJobs"
import { DEMO_ACCOUNTS, DEMO_PASSWORD, type SeededRole as Role } from "./demoData"

const SUPABASE_URL = process.env.SEED_SUPABASE_URL
const SECRET_KEY = process.env.SEED_SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error(
    "Set SEED_SUPABASE_URL and SEED_SUPABASE_SECRET_KEY (the service-role / secret key).",
  )
  process.exit(1)
}

// This script WIPES all users and jobs, so refuse any non-local target unless
// explicitly opted in — a hard stop against ever pointing it at a real database.
const targetHost = new URL(SUPABASE_URL).hostname
const isLocalTarget = ["127.0.0.1", "localhost", "::1"].includes(targetHost)
if (!isLocalTarget && process.env.SEED_ALLOW_REMOTE !== "true") {
  console.error(
    `Refusing to seed a non-local database: ${SUPABASE_URL}\n` +
      `This wipes ALL users and jobs. To seed a remote project (e.g. the demo) on\n` +
      `purpose, set SEED_ALLOW_REMOTE=true.`,
  )
  process.exit(1)
}

const supabase = createClient<Database>(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Fixed seed → the same names every run. buildJobs re-seeds independently, so
// the jobs are identical whether they came from here or from resetDemo.ts.
faker.seed(20260731)

// The account the E2E login test signs in as (via the dev email/password form).
const PRIMARY_OWNER_EMAIL = DEMO_ACCOUNTS.find((a) => a.role === "owner")!.email

async function wipe() {
  // Jobs reference profiles (no cascade), so clear jobs first. Deleting an auth
  // user cascade-deletes its profile, so that clears profiles too.
  await supabase.from("jobs").delete().not("id", "is", null)
  // The plan row survives a user wipe on its own — updated_by is ON DELETE SET
  // NULL, so the saved target would outlive the reseed and the next run would
  // open against a stale plan instead of a blank one.
  await supabase.from("year_end_plans").delete().not("year", "is", null)
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  for (const user of data?.users ?? []) {
    await supabase.auth.admin.deleteUser(user.id)
  }
}

async function createUser(
  email: string,
  password: string,
  fullName: string,
  role: Role,
): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`)

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    email,
    full_name: fullName,
    role,
    is_active: true,
  })
  if (profileError) throw new Error(`profile ${email}: ${profileError.message}`)

  return data.user.id
}

async function createUsers(): Promise<JobUsers> {
  // Driven off DEMO_ACCOUNTS so this and resetDemo.ts can't disagree about who
  // exists — the reset restores roles by email against that same list.
  const byRole: Record<Role, string[]> = { owner: [], manager: [], salesperson: [] }

  for (const { email, role } of DEMO_ACCOUNTS) {
    // The owner's name is fixed; it appears in the README and screenshots.
    const fullName = role === "owner" ? "Alex Rivera" : faker.person.fullName()
    byRole[role].push(await createUser(email, DEMO_PASSWORD, fullName, role))
  }

  return { owner: byRole.owner[0], manager: byRole.manager[0], salespeople: byRole.salesperson }
}

async function fetchReferenceData() {
  const { data: divisions } = await supabase.from("divisions").select("id")
  const { data: workTypes } = await supabase.from("work_types").select("id, is_roof_type_required")
  if (!divisions?.length || !workTypes?.length) {
    throw new Error("No divisions / work_types found — did seed.sql run? (npx supabase db reset)")
  }
  return { divisionIds: divisions.map((d) => d.id), workTypes }
}

async function insertJobs(jobs: JobInsert[]) {
  // Insert in chunks to stay well under any request-size limit.
  for (let i = 0; i < jobs.length; i += 100) {
    const { error } = await supabase.from("jobs").insert(jobs.slice(i, i + 100))
    if (error) throw new Error(`insert jobs: ${error.message}`)
  }
}

async function main() {
  console.log(`Seeding ${SUPABASE_URL} …`)
  await wipe()
  const users = await createUsers()
  const ref = await fetchReferenceData()
  await insertJobs(buildJobs(ref, users))

  const { count } = await supabase.from("jobs").select("*", { count: "exact", head: true })
  console.log(`Done — ${DEMO_ACCOUNTS.length} users, ${count} jobs.`)
  console.log(`Owner login (dev form): ${PRIMARY_OWNER_EMAIL} / ${DEMO_PASSWORD}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
