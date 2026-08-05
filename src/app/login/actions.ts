"use server"

/**
 * src/app/login/actions.ts — demo sign-in.
 *
 * Runs server-side so the shared demo password lives in DEMO_PASSWORD (no
 * NEXT_PUBLIC_ prefix) and never reaches the browser bundle. signInWithPassword
 * on the server client writes the session cookie through the same cookie
 * handler the rest of the app reads, so the caller only has to navigate.
 */

import type { ServerActionResult } from "@/lib/actions"
import { DEMO_ROLES, type DemoRole, IS_DEMO_MODE } from "@/lib/demo"
import { createClient } from "@/lib/supabase/server"

/**
 * The accounts scripts/seed.ts creates. Kept server-side: not secret (the seed
 * script is in the repo) but there's no reason to ship them to every visitor.
 */
const DEMO_ACCOUNTS: Record<DemoRole, string> = {
  owner: "owner@vantage.test",
  manager: "manager@vantage.test",
  salesperson: "sales1@vantage.test",
}

export async function enterDemo(role: DemoRole): Promise<ServerActionResult> {
  // A server action is a public endpoint. Without this, demo sign-in would
  // still be callable on a non-demo deployment built from the same code.
  if (!IS_DEMO_MODE) {
    return { success: false, error: "Demo mode is not enabled." }
  }

  // Never index DEMO_ACCOUNTS with an unvalidated argument.
  if (!DEMO_ROLES.some((option) => option.role === role)) {
    return { success: false, error: "Unknown demo role." }
  }

  const password = process.env.DEMO_PASSWORD
  if (!password) {
    return { success: false, error: "Demo mode is misconfigured — DEMO_PASSWORD is unset." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNTS[role],
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, id: role }
}
