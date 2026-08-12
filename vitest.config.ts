import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    // Mirror the "@/..." path alias from tsconfig.json so tests import modules
    // the same way the app does (e.g. "@/lib/...").
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // The code under test is pure functions — no browser/DOM — so the fast Node
    // environment is all we need.
    environment: "node",
    // Co-locate tests next to the code they cover: foo.ts → foo.test.ts.
    // scripts/ is included for the demo dataset's drift test, which guards
    // scripts/demoData.ts against supabase/seed.sql.
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    env: {
      // Run tests in UTC everywhere, matching CI and Vercel. Without this a
      // developer machine set to America/Vancouver can pass a timezone-
      // sensitive test that fails on the runner.
      TZ: "UTC",
      // Dummy values so imports of lib/env.ts don't throw. Tests don't call
      // Supabase; these just let the module imports succeed.
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_test_key",
    },
  },
})
