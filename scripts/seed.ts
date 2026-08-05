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

type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"]
type Role = "salesperson" | "manager" | "owner"

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

// Fixed seed → the same data every run, so E2E assertions don't drift.
faker.seed(20260731)

const JOB_COUNT = 400

// Quotes span this year and the two before it, anchored to the real clock
// rather than fixed dates: the year-end plan reads *this* year's jobs, so a
// hardcoded end date would leave that page empty the moment the year rolled
// over. Faker still runs off a fixed seed, so the figures stay deterministic —
// only the window they land in moves.
const TODAY = new Date()
const OLDEST_QUOTE = new Date(Date.UTC(TODAY.getUTCFullYear() - 2, 0, 1))

// The account the E2E login test signs in as (via the dev email/password form).
const PRIMARY_OWNER = { email: "owner@vantage.test", password: "password123" }

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

async function createUsers() {
  const owner = await createUser(
    PRIMARY_OWNER.email,
    PRIMARY_OWNER.password,
    "Alex Rivera",
    "owner",
  )
  const manager = await createUser(
    "manager@vantage.test",
    "password123",
    faker.person.fullName(),
    "manager",
  )
  const salespeople: string[] = []
  for (let i = 1; i <= 5; i++) {
    salespeople.push(
      await createUser(
        `sales${i}@vantage.test`,
        "password123",
        faker.person.fullName(),
        "salesperson",
      ),
    )
  }
  return { owner, manager, salespeople }
}

async function fetchReferenceData() {
  const { data: divisions } = await supabase.from("divisions").select("id")
  const { data: workTypes } = await supabase.from("work_types").select("id, is_roof_type_required")
  if (!divisions?.length || !workTypes?.length) {
    throw new Error("No divisions / work_types found — did seed.sql run? (npx supabase db reset)")
  }
  return { divisionIds: divisions.map((d) => d.id), workTypes }
}

const ymd = (date: Date) => date.toISOString().slice(0, 10)
const money = (min: number, max: number) => faker.number.int({ min, max })

function buildJobs(
  ref: Awaited<ReturnType<typeof fetchReferenceData>>,
  users: Awaited<ReturnType<typeof createUsers>>,
): JobInsert[] {
  const enteredByPool = [...users.salespeople, users.owner, users.manager]

  return Array.from({ length: JOB_COUNT }, () => {
    const workType = faker.helpers.arrayElement(ref.workTypes)
    const roof_type = workType.is_roof_type_required
      ? faker.helpers.arrayElement(["reroof", "newroof"] as const)
      : null

    const dateQuoted = faker.date.between({ from: OLDEST_QUOTE, to: TODAY })
    const sold = faker.datatype.boolean(0.45)
    // A sale can't land in the future, so a close date past today collapses to
    // today — otherwise a recently quoted job could report revenue next year.
    const soldAt = faker.date.soon({
      days: faker.number.int({ min: 5, max: 200 }),
      refDate: dateQuoted,
    })
    const dateSold = sold ? (soldAt > TODAY ? TODAY : soldAt) : null

    const materials = money(2000, 15000)
    const labour = money(1500, 12000)
    const disposal = money(200, 2000)
    const warranty = money(0, 1500)
    const other = money(0, 1000)
    const gutters = money(0, 2000)
    const total_job_cost = materials + labour + disposal + warranty + other + gutters
    const markup_pct = faker.number.int({ min: 30, max: 55 })
    const sales_price = Math.round(total_job_cost * (1 + markup_pct / 100))

    // Actual costs only exist once a job is sold (mirrors zeroActualsWhenUnsold).
    const actual = (v: number) =>
      sold ? Math.round(v * faker.number.float({ min: 0.85, max: 1.15 })) : 0

    // A few genuine cross-year sold jobs are flagged as carry-overs, to exercise
    // the dashboard's carry-over handling on real data.
    const crossYear = dateSold != null && dateSold.getFullYear() > dateQuoted.getFullYear()
    const exclude_from_quote_metrics = crossYear && faker.datatype.boolean(0.5)

    return {
      job_address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
      division_id: faker.helpers.arrayElement(ref.divisionIds),
      work_type_id: workType.id,
      roof_type,
      salesperson_id: faker.helpers.arrayElement(users.salespeople),
      entered_by: faker.helpers.arrayElement(enteredByPool),
      date_quoted: ymd(dateQuoted),
      date_sold: dateSold ? ymd(dateSold) : null,
      sold,
      exclude_from_quote_metrics,
      squares: faker.number.int({ min: 8, max: 60 }),
      days: faker.number.float({ min: 0.5, max: 12, fractionDigits: 1 }),
      materials,
      labour,
      disposal,
      warranty,
      other,
      gutters,
      actual_materials: actual(materials),
      actual_labour: actual(labour),
      actual_disposal: actual(disposal),
      actual_warranty: actual(warranty),
      actual_other: actual(other),
      actual_gutters: actual(gutters),
      total_job_cost,
      sales_price,
      mgn: sales_price - total_job_cost,
      markup_pct,
    }
  })
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
  console.log(`Done — ${users.salespeople.length + 2} users, ${count} jobs.`)
  console.log(`Owner login (dev form): ${PRIMARY_OWNER.email} / ${PRIMARY_OWNER.password}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
