import { expect, test } from "@playwright/test"

import { loginAs, OWNER } from "./helpers"

test("owner can log in and see a populated dashboard", async ({ page }) => {
  await loginAs(page, OWNER)

  // The dashboard's metric components rendered…
  await expect(page.getByText("Year-over-Year Sold Revenue")).toBeVisible()

  // …populated with the seeded jobs (formatted currency values are present).
  await expect(page.getByText(/\$[\d,]+/).first()).toBeVisible()
})
