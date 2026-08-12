import { expect, type Page, test } from "@playwright/test"

import { EMPTY } from "@/lib/formatters"

import { loginAs, OWNER, sidebarLink } from "./helpers"

// The summary renders each figure as a <p> label immediately followed by a <p>
// value, so the adjacent-sibling selector reads the value for a given label.
// Scoping this way matters because most labels appear twice on the page — once
// on a summary figure and once on the <label> of the input that drives it.
const summaryValue = (page: Page, label: string) => page.locator(`p:text-is("${label}") + p`)

const planInput = (page: Page, label: string) => page.getByLabel(label, { exact: true })

// The seed's figures move with the calendar, so assertions stay relative —
// "populated", "changed", "back to the live value" — with the exact arithmetic
// pinned in yearEndPlanMath.test.ts instead.
test("an owner can set a target, override a figure, and have both persist", async ({ page }) => {
  await loginAs(page, OWNER)

  await expect(sidebarLink(page, "Year-End Plan")).toBeVisible()
  await sidebarLink(page, "Year-End Plan").click()
  await page.waitForURL("**/year-end-plan")
  await expect(page.getByRole("heading", { name: /Year-End Activity Plan/ })).toBeVisible()

  // Current performance comes from the seeded jobs, so none of it should be "—".
  for (const label of ["Revenue", "Total Jobs Sold", "Avg Job $", "Conversion Rate"]) {
    await expect(summaryValue(page, label)).not.toHaveText(EMPTY)
  }

  // Nothing downstream resolves until there's a target to aim at.
  await expect(summaryValue(page, "Revenue Needed")).toHaveText(EMPTY)
  await planInput(page, "Target Revenue").fill("9000000")

  for (const label of ["Revenue Needed", "Jobs Needed", "Quotes Needed"]) {
    await expect(summaryValue(page, label)).not.toHaveText(EMPTY)
  }

  // Overriding Avg Job $ has to move Jobs Needed — it's the divisor.
  const jobsNeededBefore = await summaryValue(page, "Jobs Needed").textContent()
  await planInput(page, "Avg Job $").fill("50000")
  await expect(summaryValue(page, "Jobs Needed")).not.toHaveText(jobsNeededBefore!)

  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Plan saved")).toBeVisible()

  await page.reload()
  await expect(planInput(page, "Target Revenue")).toHaveValue("9000000")
  await expect(planInput(page, "Avg Job $")).toHaveValue("50000")
})

test("clearing one override reverts only that field", async ({ page }) => {
  await loginAs(page, OWNER)
  await page.goto("/year-end-plan")

  await planInput(page, "Avg Job $").fill("50000")
  await planInput(page, "Total Jobs Sold").fill("42")

  await page.getByRole("button", { name: /Clear the overridden Avg Job \$/ }).click()

  await expect(planInput(page, "Avg Job $")).toHaveValue("")
  await expect(planInput(page, "Total Jobs Sold")).toHaveValue("42")
})

test("clearing every override restores the live figures but keeps the target", async ({ page }) => {
  await loginAs(page, OWNER)
  await page.goto("/year-end-plan")

  const liveRevenue = await summaryValue(page, "Revenue").textContent()

  await planInput(page, "Target Revenue").fill("9000000")
  await planInput(page, "Revenue").fill("1234567")
  await expect(summaryValue(page, "Revenue")).not.toHaveText(liveRevenue!)

  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Plan saved")).toBeVisible()
  // Every save renders the same "Plan saved" text and sonner leaves it up for
  // about four seconds. Without waiting for this one to clear, the identical
  // assertion after the second save matches *this* toast and passes before that
  // save has landed — letting the reload below race an unfinished write.
  await expect(page.getByText("Plan saved")).toBeHidden()

  await page.getByRole("button", { name: "Clear Overrides" }).click()
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Plan saved")).toBeVisible()

  await page.reload()
  await expect(planInput(page, "Revenue")).toHaveValue("")
  await expect(summaryValue(page, "Revenue")).toHaveText(liveRevenue!)
  // Clear Overrides is not "start over" — the target is the plan, not an override.
  await expect(planInput(page, "Target Revenue")).toHaveValue("9000000")
})
