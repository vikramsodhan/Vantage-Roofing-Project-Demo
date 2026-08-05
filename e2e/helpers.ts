import { expect, type Page } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database.types"

// Local Supabase, matching playwright.config.ts. Standard local-dev keys —
// identical on every machine and safe to commit; they only ever reach the local
// instance on 127.0.0.1.
const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321"
const LOCAL_PUBLISHABLE_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"

// The fixed accounts created by scripts/seed.ts. We sign in through the
// dev-only email/password form, which the app shows when
// NEXT_PUBLIC_DEV_MODE=true and NODE_ENV !== "production".
export type SeededUser = { email: string; password: string }

const PASSWORD = "password123"

export const OWNER: SeededUser = { email: "owner@vantage.test", password: PASSWORD }
export const MANAGER: SeededUser = { email: "manager@vantage.test", password: PASSWORD }
export const SALESPERSON: SeededUser = { email: "sales1@vantage.test", password: PASSWORD }

// A nav item, scoped to the sidebar menu. Page bodies link to the same places —
// /jobs has its own "New Job" button — so an unscoped role lookup matches more
// than one element and fails on strict mode rather than on what's being tested.
export function sidebarLink(page: Page, name: string) {
  return page.locator('[data-slot="sidebar-menu"]').getByRole("link", { name, exact: true })
}

/**
 * A Supabase client signed in as the given user, over the same anon-key path
 * the browser uses — so every query runs under that person's RLS policies.
 *
 * Lets a test reach past the UI to the rules underneath it. Driving the browser
 * can only prove a button is hidden; it can never prove what happens when
 * someone skips the button, which is the half that actually protects the data.
 */
export async function loginSupabaseAs(user: SeededUser) {
  const client = createClient<Database>(LOCAL_SUPABASE_URL, LOCAL_PUBLISHABLE_KEY)
  const { error } = await client.auth.signInWithPassword(user)
  if (error) throw new Error(`sign in as ${user.email}: ${error.message}`)
  return client
}

// Log in and wait until the dashboard has loaded. Every role lands there, so
// this doubles as each spec's "the session is live" checkpoint.
export async function loginAs(page: Page, user: SeededUser) {
  await page.goto("/login")
  await page.getByLabel("Email", { exact: true }).fill(user.email)
  await page.getByLabel("Password", { exact: true }).fill(user.password)
  await page.getByRole("button", { name: "Sign in (Dev)" }).click()

  await page.waitForURL("**/dashboard")
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
}
