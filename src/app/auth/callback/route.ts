import { type NextRequest, NextResponse } from "next/server"

import { getProfile } from "@/lib/supabase/getProfile"
import { createClient } from "@/lib/supabase/server"

const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN

/**
 * Only reached via a Google OAuth redirect — the dev email/password form
 * (LoginPageClient) signs in directly with signInWithPassword and never hits
 * this route. Exchanges the OAuth code for a Supabase session, then
 * re-validates the email domain server-side — a technically savvy user
 * could strip the `hd` param that gates Google's account picker, so this
 * check is the real enforcement. See docs/DESIGN.md: "Auth & session model".
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (!code) {
    return NextResponse.redirect(`${origin}/login?reason=no_code`)
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?reason=exchange_failed`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.redirect(`${origin}/login?reason=no_user`)
  }

  const emailDomain = user.email.split("@")[1]
  const isAllowedDomain = emailDomain === ALLOWED_DOMAIN

  if (!isAllowedDomain) {
    // They got through Google but failed our check — sign them out immediately.
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?reason=unauthorized_domain`)
  }

  const existingProfile = await getProfile()

  if (existingProfile) {
    if (!existingProfile.is_active) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?reason=deactivated`)
    }
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // First-time sign-in — auto-create a profile. Role defaults to salesperson;
  // the owner promotes people via user management if needed.
  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: user.user_metadata?.full_name ?? user.email,
    email: user.email,
    role: "salesperson",
    is_active: true,
  })

  if (profileError) {
    // Sign out rather than leave them authenticated with no profile row.
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?reason=profile_creation_failed`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
