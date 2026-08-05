import { createBrowserClient } from "@supabase/ssr"

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env"
import { Database } from "@/types/database.types"

// Browser (Client-Side) Supabase Client. Use this in Client Components.
// Runs in the user's browser and handles login/logout, session reading,
// and non-sensitive Supabase queries. See docs/DESIGN.md: "Auth & session model".
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
}
