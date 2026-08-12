import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env"

/**
 * Route protection via session validation. Runs on every request before pages/routes.
 * Refreshes session tokens and redirects unauthenticated users to /login.
 *
 * Deactivation is deliberately NOT handled here — this only knows whether a session
 * exists, not whether the account behind it is still active. That check lives in
 * requireActiveProfile() on the server components and in the RLS policies, both of
 * which read is_active. See docs/DESIGN.md: "Auth & session model".
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  // getUser() re-validates with Supabase's servers; getSession() only reads
  // the local cookie and isn't safe for a security check.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/auth")

  if (user && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Excluding /login and /auth avoids a redirect loop.
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return supabaseResponse
}

// Skip static assets (_next bundles, favicon, images) — no auth check needed.
// robots.txt is excluded too: it must stay readable by crawlers, and without
// this the auth guard redirects it to /login, leaving the file unreachable.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
