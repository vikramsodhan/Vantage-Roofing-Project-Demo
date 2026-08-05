import { expect, test } from "@playwright/test"

import { loginAs, OWNER } from "./helpers"

test("a created job appears in the jobs table", async ({ page }) => {
  await loginAs(page, OWNER)

  // A unique token so we can find exactly this job in the table afterwards,
  // regardless of sort order or pagination.
  const token = `E2E-${Date.now()}`
  const address = `${token} Test St, Vancouver`

  await page.goto("/jobs/new")

  // The address commits to the form only in manual-entry mode — autocomplete
  // mode waits for a Mapbox suggestion, which needs a token we don't set in
  // tests. Clicking the label toggles the switch into manual mode.
  await page.getByText("Enter manually").click()
  await page.locator('input[name="job_address"]').fill(address)

  // Division/work type options are picked via type-ahead rather than
  // scrolling to the option and clicking it: Radix's Select listbox doesn't
  // scroll into view the way Playwright's click auto-scroll expects, so
  // clicking an option below the visible window hangs until timeout. A small
  // per-key delay avoids a Radix type-ahead race that throws when keys land
  // faster than any real user could type.
  await page.getByRole("combobox").filter({ hasText: "Select division" }).click()
  await page.keyboard.type("Residential", { delay: 50 })
  await page.keyboard.press("Enter")

  // Type of work — a non-roofing type so no Roof Type field is required.
  await page.getByRole("combobox").filter({ hasText: "Select type" }).click()
  await page.keyboard.type("Repair", { delay: 50 })
  await page.keyboard.press("Enter")

  await page.locator('input[name="date_quoted"]').fill("2025-06-15")
  await page.locator('input[name="days"]').fill("1")

  await page.getByRole("button", { name: "Save Job" }).click()

  // On success the app redirects to the new job's detail page. Exclude "new"
  // so this doesn't match the form page itself while the save is still pending.
  await page.waitForURL(/\/jobs\/(?!new$)[^/]+$/)
  await expect(page.getByText(address)).toBeVisible()

  // The job shows up in the jobs table (found via the address search filter).
  await page.goto(`/jobs?address=${encodeURIComponent(token)}`)
  await expect(page.getByRole("link", { name: new RegExp(token) })).toBeVisible()
})
