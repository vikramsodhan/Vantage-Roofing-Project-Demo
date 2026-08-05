"use client"

import { AlertCircle, Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { BrandLogo } from "@/components/custom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DEMO_ROLES, type DemoRole, IS_DEMO_MODE } from "@/lib/demo"
import { createClient } from "@/lib/supabase/client"

import { enterDemo } from "./actions"

// Gates the dev email/password form only. Hard-gated to non-production:
// NODE_ENV is "production" on every Vercel deploy, so the form is eliminated
// from the production bundle regardless of NEXT_PUBLIC_DEV_MODE. The flag is
// the in-dev on/off toggle.
const IS_DEV_MODE =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEV_MODE === "true"

/**
 * Google-only login, restricted via the `hd` param (client) and a
 * server-side domain re-check (auth/callback) — hd alone isn't real
 * enforcement since it's client-controlled. The dev email/password form is
 * hard-gated off NODE_ENV, not just NEXT_PUBLIC_DEV_MODE, so it can't reach
 * production.
 *
 * On the demo deployment (IS_DEMO_MODE) the Google button is shown but
 * disabled — it documents how production authenticates, which no visitor can
 * do — and entry is via the role buttons instead.
 * See docs/DESIGN.md: "Auth & session model".
 */
export default function LoginPage() {
  const searchParams = useSearchParams()
  const reason = searchParams.get("reason")
  const router = useRouter()
  const supabase = createClient()

  // Google OAuth State
  const [oAuthloading, setOAuthLoading] = useState(false)
  const [oAutherror, setOAuthError] = useState<string | null>(null)

  // Dev email/password state (not used in production)
  const [devEmail, setDevEmail] = useState("")
  const [devPassword, setDevPassword] = useState("")
  const [devLoading, setDevLoading] = useState(false)
  const [devError, setDevError] = useState<string | null>(null)

  // Demo entry state. `demoRole` doubles as the per-button spinner flag, so
  // only the clicked role shows one.
  const [demoRole, setDemoRole] = useState<DemoRole | null>(null)
  const [demoError, setDemoError] = useState<string | null>(null)

  async function handleEnterDemo(role: DemoRole) {
    setDemoRole(role)
    setDemoError(null)

    // The session cookie is written server-side, so there's nothing to persist
    // here — just navigate and let the proxy pick the session up.
    const result = await enterDemo(role)

    if (!result.success) {
      setDemoError(result.error)
      setDemoRole(null)
      return
    }

    router.push("/")
  }

  async function handleGoogleLogin() {
    setOAuthLoading(true)
    setOAuthError(null)

    const test = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          // Always restrict the Google account picker to the allowed domain.
          hd: process.env.NEXT_PUBLIC_ALLOWED_DOMAIN ?? "",
        },
      },
    })

    const error = test.error

    if (error) {
      setOAuthError(error.message)
      setOAuthLoading(false)
    }
  }

  async function handleDevLogin() {
    if (!devEmail.trim() || !devPassword.trim()) {
      setDevError("Email and password are required.")
      return
    }

    setDevLoading(true)
    setDevError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: devEmail.trim(),
      password: devPassword.trim(),
    })

    if (error) {
      setDevError(error.message)
      setDevLoading(false)
      return
    }

    router.push("/")
  }

  function getReasonMessage() {
    switch (reason) {
      case "deactivated":
        return "Your account has been deactivated. Please contact your administrator."
      case "no_code":
        return "Received no code from Google. Please try signing in again."
      case "exchange_failed":
        return "Code exchange failed. Please try signing in again."
      case "no_user":
        return "No user email address received. Please try signing in again."
      case "unauthorized_domain":
        return `Your email domain is not allowed. Please use your ${process.env.NEXT_PUBLIC_ALLOWED_DOMAIN} account.`
      case "profile_creation_failed":
        return "Failed to create user profile. Please contact your administrator."
      default:
        return null
    }
  }

  const reasonMessage = getReasonMessage()

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-sm shadow-lg border-border/60">
        <CardHeader className="text-center">
          <BrandLogo className="mx-auto mb-3 h-11" />
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reasonMessage && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{reasonMessage}</span>
            </div>
          )}

          {oAutherror && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{oAutherror}</span>
            </div>
          )}
          {/* Demo entry. Listed first and styled as the primary action: on the
              public demo this is the only route in, and Google below it is an
              exhibit rather than a working option. */}
          {IS_DEMO_MODE && (
            <>
              {demoError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{demoError}</span>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-xs text-center text-muted-foreground">
                  Explore with sample data — pick a role to see how access differs.
                </p>
                {DEMO_ROLES.map(({ role, label, blurb }) => (
                  <Button
                    key={role}
                    onClick={() => handleEnterDemo(role)}
                    disabled={demoRole !== null}
                    variant="secondary"
                    // h-auto + flex-col + whitespace-normal override the base
                    // button's fixed height and single-line layout, so the
                    // blurb can sit inside the target it describes.
                    className="w-full h-auto flex-col gap-0.5 whitespace-normal px-3 py-2.5 text-center"
                  >
                    <span className="flex items-center gap-2">
                      {demoRole === role && <Loader2 className="size-4 animate-spin" />}
                      {demoRole === role ? "Entering…" : `Enter as ${label}`}
                    </span>
                    <span className="text-[11px] leading-snug font-normal opacity-75">{blurb}</span>
                  </Button>
                ))}
              </div>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">How production works</span>
                </div>
              </div>
            </>
          )}

          <Button
            onClick={handleGoogleLogin}
            // On the demo this button is documentation, not a control: the real
            // app signs in through the client's Google Workspace, which no
            // visitor can authenticate against. Disabled beats a dead-end click.
            disabled={oAuthloading || IS_DEMO_MODE}
            variant="outline"
            className="w-full h-11"
          >
            {oAuthloading ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {oAuthloading ? "Signing in…" : "Sign in with Google"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {IS_DEMO_MODE ? (
              <>
                In production, sign-in is Google Workspace SSO restricted to the company domain.
                Disabled here — no visitor can hold an account on it.
              </>
            ) : (
              <>
                Access restricted to{" "}
                <span className="font-medium text-foreground">
                  {process.env.NEXT_PUBLIC_ALLOWED_DOMAIN}
                </span>{" "}
                accounts
              </>
            )}
          </p>
          {/* Dev-only email/password form — never visible in production */}
          {IS_DEV_MODE && (
            <>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-orange-500 font-medium">Dev only</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="dev-email" className="text-xs text-muted-foreground">
                    Email
                  </label>
                  <Input
                    id="dev-email"
                    type="email"
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleDevLogin()}
                    placeholder="dev@example.com"
                    disabled={devLoading}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="dev-password" className="text-xs text-muted-foreground">
                    Password
                  </label>
                  <Input
                    id="dev-password"
                    type="password"
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleDevLogin()}
                    placeholder="••••••••"
                    disabled={devLoading}
                    className="h-8 text-sm"
                  />
                </div>

                {devError && <p className="text-xs text-red-600">{devError}</p>}

                <Button
                  onClick={handleDevLogin}
                  disabled={devLoading}
                  variant="secondary"
                  className="w-full h-8 text-sm"
                >
                  {devLoading ? "Signing in..." : "Sign in (Dev)"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
