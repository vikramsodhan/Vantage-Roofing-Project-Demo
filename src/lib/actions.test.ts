import { describe, expect, it } from "vitest"

import { requireActiveAccount } from "@/lib/actions"
import type { Profile } from "@/types"

const activeProfile: Profile = {
  id: "user-1",
  email: "user@example.com",
  full_name: "Test User",
  role: "salesperson",
  is_active: true,
  created_at: "2026-01-01T00:00:00.000Z",
}

describe("requireActiveAccount", () => {
  it("rejects a null profile", () => {
    const result = requireActiveAccount(null)
    expect(result).toEqual({
      ok: false,
      result: { success: false, error: "You must be logged in to do this." },
    })
  })

  it("rejects an inactive profile", () => {
    const result = requireActiveAccount({ ...activeProfile, is_active: false })
    expect(result).toEqual({
      ok: false,
      result: { success: false, error: "Your account is inactive." },
    })
  })

  it("accepts an active profile and hands it back", () => {
    const result = requireActiveAccount(activeProfile)
    expect(result).toEqual({ ok: true, profile: activeProfile })
  })
})
