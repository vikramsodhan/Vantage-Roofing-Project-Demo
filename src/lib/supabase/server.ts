import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env"
import { Database } from "@/types/database.types"

// Server-Side Supabase Client. Use this in Server Components, API Routes, and Server Actions.
// Handles cookie management for session persistence — see docs/DESIGN.md: "Auth & session model".
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      // Read all cookies from the incoming request
      getAll() {
        return cookieStore.getAll()
      },
      // Write cookies back to the response (e.g. refreshing a session token)
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // setAll can be called from a Server Component where
          // setting cookies isn't allowed. This is safe to ignore
          // because middleware handles session refreshing instead.
        }
      },
    },
  })
}
