// NEXT_PUBLIC_* vars must be read via static `process.env.X` dot-notation, not
// a dynamic process.env[name] lookup — Next.js inlines these at build time by
// string-matching the literal expression, including in client bundles, which
// have no real process.env. A dynamic lookup isn't statically analyzable, so
// it silently resolves to undefined in the browser.
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

export const SUPABASE_URL = requireEnv(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
)
export const SUPABASE_PUBLISHABLE_KEY = requireEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
)
