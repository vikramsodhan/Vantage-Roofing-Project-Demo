import { expect, type Page, test } from "@playwright/test"

import {
  currentUserId,
  loginAs,
  loginSupabaseAs,
  MANAGER,
  OWNER,
  SALESPERSON,
  type SeededUser,
  sidebarLink,
  signUpFreshUser,
} from "./helpers"

/**
 * Who can reach what. Feature specs cover what a page *does*; this one covers
 * who gets to see it at all, so a regression in the access model surfaces here
 * rather than as a surprise inside an unrelated feature test.
 *
 * One login per role, checking every gated surface in that session — a matrix
 * of role × surface as separate tests would re-authenticate for each cell, and
 * signing in is the slowest thing these tests do.
 *
 * Each role is checked two ways on purpose: the nav item is a convenience and
 * hiding it proves nothing, so every hidden link is paired with a direct visit
 * that the page itself has to turn away.
 */

test.describe("page access", () => {
  test("an owner reaches both gated pages", async ({ page }) => {
    await loginAs(page, OWNER)

    await expect(sidebarLink(page, "Year-End Plan")).toBeVisible()
    await expect(sidebarLink(page, "Admin")).toBeVisible()

    await page.goto("/year-end-plan")
    await expect(page.getByRole("heading", { name: /Year-End Activity Plan/ })).toBeVisible()

    await page.goto("/admin")
    await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible()
  })

  test("a manager reaches the plan but is turned away from admin", async ({ page }) => {
    await loginAs(page, MANAGER)

    await expect(sidebarLink(page, "Year-End Plan")).toBeVisible()
    await expect(sidebarLink(page, "Admin")).toHaveCount(0)

    await page.goto("/year-end-plan")
    await expect(page.getByRole("heading", { name: /Year-End Activity Plan/ })).toBeVisible()

    await page.goto("/admin")
    await page.waitForURL("**/jobs")
  })

  test("a salesperson is turned away from both, but keeps the shared pages", async ({ page }) => {
    await loginAs(page, SALESPERSON)

    await expect(sidebarLink(page, "Year-End Plan")).toHaveCount(0)
    await expect(sidebarLink(page, "Admin")).toHaveCount(0)

    await page.goto("/year-end-plan")
    await page.waitForURL("**/dashboard")

    await page.goto("/admin")
    await page.waitForURL("**/jobs")

    // The gates are targeted, not a blanket lockout — the rest of the app is theirs.
    await expect(sidebarLink(page, "Dashboard")).toBeVisible()
    await expect(sidebarLink(page, "Jobs")).toBeVisible()
    await expect(sidebarLink(page, "New Job")).toBeVisible()
  })
})

/**
 * One job id — either owned by this person, or owned by anyone but them.
 *
 * The seed spreads its jobs across every salesperson, so both always exist and
 * no dedicated fixture rows are needed. Reading ownership from the database
 * rather than hunting the jobs table for a row with the right name in it keeps
 * these tests about permissions instead of about table layout and pagination.
 */
async function getAJobIdFromSalesPerson(user: SeededUser, ownedByThem: boolean) {
  const client = await loginSupabaseAs(user)
  const accountId = await currentUserId(client)

  const query = client.from("jobs").select("id").order("id").limit(1)
  const { data, error } = await (
    ownedByThem ? query.eq("salesperson_id", accountId) : query.neq("salesperson_id", accountId)
  ).single()
  if (error) throw new Error(`no ${ownedByThem ? "owned" : "unowned"} job: ${error.message}`)
  return data.id
}

// The Salesperson field renders a select for anyone who may reassign a job and
// plain text for anyone who may not. Its label carries no htmlFor, so the field
// is located by the label it wraps rather than by getByLabel.
const salespersonField = (page: Page) => page.locator('div:has(> label:text-is("Salesperson"))')

test.describe("job access", () => {
  test("a salesperson can edit their own job", async ({ page }) => {
    const ownJobId = await getAJobIdFromSalesPerson(SALESPERSON, true)
    await loginAs(page, SALESPERSON)

    await page.goto(`/jobs/${ownJobId}`)
    await expect(page.getByRole("link", { name: "Edit" })).toBeVisible()

    await page.goto(`/jobs/${ownJobId}/edit`)
    await expect(page.getByRole("button", { name: "Save Job" })).toBeVisible()
  })

  test("a salesperson is turned away from someone else's edit page", async ({ page }) => {
    const otherJobId = await getAJobIdFromSalesPerson(SALESPERSON, false)
    await loginAs(page, SALESPERSON)

    // Everyone can read every job — it's changing one they don't own that's barred.
    await page.goto(`/jobs/${otherJobId}`)
    await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0)

    // Landing back on the detail page is the whole assertion — the edit form
    // never renders, so there's nothing further to check for its absence.
    await page.goto(`/jobs/${otherJobId}/edit`)
    await page.waitForURL(`**/jobs/${otherJobId}`)
  })

  test("a manager can edit a job they don't own", async ({ page }) => {
    const salespersonJobId = await getAJobIdFromSalesPerson(SALESPERSON, true)
    await loginAs(page, MANAGER)

    await page.goto(`/jobs/${salespersonJobId}/edit`)
    await expect(page.getByRole("button", { name: "Save Job" })).toBeVisible()
  })

  // Split by role rather than checked in one pass: a test keeps one signed-in
  // session for its lifetime, and /login bounces an already-authenticated user
  // straight back out, so a second sign-in never reaches the form.
  test("a salesperson can't assign a job to anyone else", async ({ page }) => {
    await loginAs(page, SALESPERSON)
    await page.goto("/jobs/new")
    await expect(salespersonField(page).getByRole("combobox")).toHaveCount(0)
  })

  test("a manager can assign a job to someone else", async ({ page }) => {
    await loginAs(page, MANAGER)
    await page.goto("/jobs/new")
    await expect(salespersonField(page).getByRole("combobox")).toBeVisible()
  })

  // A malformed id forces a real query error (not "0 rows") — must render as
  // an error, not a false 404. /edit shares jobs/[id]/error.tsx too.
  test("a malformed job id renders an error, not a 404", async ({ page }) => {
    await loginAs(page, SALESPERSON)

    await page.goto("/jobs/not-a-valid-id")
    await expect(page.getByText("Couldn't load this job.")).toBeVisible()
    await expect(page.getByText("Page not found")).not.toBeVisible()

    await page.goto("/jobs/not-a-valid-id/edit")
    await expect(page.getByText("Couldn't load this job.")).toBeVisible()
    await expect(page.getByText("Page not found")).not.toBeVisible()
  })
})

/**
 * The database's own rules, checked without a browser.
 *
 * Not exhaustive — a sanity check that the last line of defence is actually
 * armed. The UI tests above can only show that a control is hidden; these show
 * what happens to someone who skips the UI entirely, which is the case the
 * hiding was never protecting against.
 */
test.describe("database rules", () => {
  // A year nothing in the UI reads, so writing here can't disturb the plan the
  // year-end-plan spec asserts against.
  const SCRATCH_YEAR = 2099

  test("the shared plan is manager-and-owner only", async () => {
    const manager = await loginSupabaseAs(MANAGER)
    // Positive control first: without a row to find, "the salesperson sees
    // nothing" would pass even if RLS were switched off entirely.
    const { error: managerWrite } = await manager
      .from("year_end_plans")
      .upsert({ year: SCRATCH_YEAR, target_revenue: 1_000_000 })
    expect(managerWrite).toBeNull()

    const salesperson = await loginSupabaseAs(SALESPERSON)
    const { data: visible } = await salesperson
      .from("year_end_plans")
      .select("year")
      .eq("year", SCRATCH_YEAR)
    expect(visible).toEqual([])

    const { error: blocked } = await salesperson
      .from("year_end_plans")
      .upsert({ year: SCRATCH_YEAR, target_revenue: 2_000_000 })
    expect(blocked).not.toBeNull()
  })

  test("a new user can't sign themselves up as an owner", async () => {
    const { client, userId, email } = await signUpFreshUser()
    const profile = { id: userId, email, full_name: "Newcomer", is_active: true }

    // The escalation attempt runs FIRST, while there genuinely is no profile row.
    // Run after the positive control below, this insert would be rejected by the
    // primary key instead of by the policy, and would pass with RLS wide open.
    const { error: escalation } = await client
      .from("profiles")
      .insert({ ...profile, role: "owner" })
    expect(escalation).not.toBeNull()

    // Positive control: the exact payload auth/callback/route.ts sends still
    // lands, so the rejection above is the role constraint doing its job and not
    // a blanket denial that would break every first-time sign-in.
    const { error: allowed } = await client
      .from("profiles")
      .insert({ ...profile, role: "salesperson" })
    expect(allowed).toBeNull()
  })

  test("a salesperson can't create a job attributed to a colleague", async () => {
    const client = await loginSupabaseAs(SALESPERSON)
    const userId = await currentUserId(client)

    const { data: colleagueJob, error: lookupError } = await client
      .from("jobs")
      .select("salesperson_id, division_id, work_type_id")
      .neq("salesperson_id", userId)
      .limit(1)
      .single()
    if (lookupError) throw new Error(`no colleague-owned job: ${lookupError.message}`)

    const newJob = {
      job_address: "1 Attribution Test Rd",
      date_quoted: "2026-01-15",
      division_id: colleagueJob.division_id,
      work_type_id: colleagueJob.work_type_id,
      entered_by: userId,
    }

    const { error: denied } = await client
      .from("jobs")
      .insert({ ...newJob, salesperson_id: colleagueJob.salesperson_id })
    expect(denied).not.toBeNull()

    const { data: created, error: allowed } = await client
      .from("jobs")
      .insert({ ...newJob, salesperson_id: userId })
      .select("id, salesperson_id")
      .single()
    expect(allowed).toBeNull()
    expect(created!.salesperson_id).toBe(userId)

    // Drop it again — a stray job would drift the figures a later spec reads.
    await client.from("jobs").delete().eq("id", created!.id)
  })

  test("a salesperson can only change their own jobs", async () => {
    const client = await loginSupabaseAs(SALESPERSON)
    const ownJobId = await getAJobIdFromSalesPerson(SALESPERSON, true)
    const otherJobId = await getAJobIdFromSalesPerson(SALESPERSON, false)

    // Their own job updates normally...
    const { data: allowed } = await client
      .from("jobs")
      .update({ notes: "touched by its owner" })
      .eq("id", ownJobId)
      .select()
    expect(allowed).toHaveLength(1)

    // ...and someone else's matches no rows, so the write silently does nothing.
    const { data: denied, error } = await client
      .from("jobs")
      .update({ notes: "touched by a stranger" })
      .eq("id", otherJobId)
      .select()
    expect(error).toBeNull()
    expect(denied).toEqual([])
  })
})
