import { defineConfig, devices } from "@playwright/test"

// Local Supabase, from `supabase status`. These are the standard local-dev
// keys — identical on every machine and safe to commit; they only ever reach
// the local instance on 127.0.0.1.
const SUPABASE_URL = "http://127.0.0.1:54321"
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"

// Locally we drive a system-installed browser: Playwright's bundled Chromium
// can't be installed on macOS 13. CI installs bundled Chromium normally, so it
// leaves the channel unset. Override locally with PLAYWRIGHT_CHANNEL=chrome.
const channel = process.env.CI ? undefined : (process.env.PLAYWRIGHT_CHANNEL ?? "msedge")

export default defineConfig({
  testDir: "./e2e",
  // Serial: the whole suite shares one local Supabase, so parallel workers
  // would race on the same rows. One worker keeps the seeded data determinate.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // 60s rather than the 30s default: `next dev` compiles each route and server
  // action on first hit, so whichever test lands first pays a cold-compile cost
  // that legitimately outruns 30s on a loaded machine. A genuinely broken test
  // still fails — just later.
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  // Reseed local Supabase once before the whole suite — fresh, deterministic
  // data every run.
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Point the app at LOCAL Supabase and enable the dev email/password login.
    // These win over the repo's root .env.local (which targets the cloud dev
    // DB): @next/env never overrides a var that's already set in the process.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SUPABASE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_DEV_MODE: "true",
    },
  },
})
