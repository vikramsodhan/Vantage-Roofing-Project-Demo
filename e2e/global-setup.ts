import { execFileSync } from "node:child_process"

/**
 * Runs once before the whole Playwright suite: reseed the local Supabase with
 * fresh, deterministic data (fixed faker seed) so every run asserts against a
 * known fixture set. Requires local Supabase to be running (`supabase start`).
 */
export default function globalSetup() {
  console.log("\n[e2e] Seeding local Supabase (npm run db:seed)…")
  try {
    execFileSync("npm", ["run", "db:seed"], { stdio: "inherit" })
  } catch {
    throw new Error("[e2e] Seed failed. Is local Supabase running? Start it with `supabase start`.")
  }
}
