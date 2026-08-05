import { describe, expect, it } from "vitest"

import { canModifyAccount } from "@/lib/authorization/userPermissions"
import type { Profile } from "@/types"

const owner: Profile = {
  id: "owner-1",
  email: "owner@example.com",
  full_name: "Test Owner",
  role: "owner",
  is_active: true,
  created_at: "2026-01-01T00:00:00.000Z",
}

describe("canModifyAccount", () => {
  it("allows acting on another account", () => {
    expect(canModifyAccount(owner, "someone-else")).toBe(true)
  })

  it("refuses acting on your own account", () => {
    expect(canModifyAccount(owner, owner.id)).toBe(false)
  })

  it("keys off the id, not the role — a demoted owner still can't target itself", () => {
    expect(canModifyAccount({ ...owner, role: "salesperson" }, owner.id)).toBe(false)
  })
})
