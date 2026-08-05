import { describe, expect, it } from "vitest"

import { canChangeSalesperson, canUserModifyJob } from "@/lib/authorization/jobPermissions"
import type { Profile } from "@/types"

// A valid Profile with sensible defaults. Each test overrides only the field it
// cares about (role/id), so the intent of each case stays obvious.
function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-1",
    full_name: "Test User",
    email: "test@example.com",
    role: "salesperson",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("canUserModifyJob", () => {
  it("lets an owner modify any job", () => {
    const owner = makeProfile({ role: "owner", id: "owner-1" })
    expect(canUserModifyJob(owner, "someone-else")).toBe(true)
  })

  it("lets a manager modify any job", () => {
    const manager = makeProfile({ role: "manager", id: "manager-1" })
    expect(canUserModifyJob(manager, "someone-else")).toBe(true)
  })

  it("lets a salesperson modify their own job", () => {
    const salesperson = makeProfile({ role: "salesperson", id: "sales-1" })
    expect(canUserModifyJob(salesperson, "sales-1")).toBe(true)
  })

  it("stops a salesperson from modifying someone else's job", () => {
    const salesperson = makeProfile({ role: "salesperson", id: "sales-1" })
    expect(canUserModifyJob(salesperson, "sales-2")).toBe(false)
  })

  it("stops a salesperson from modifying a job with no salesperson", () => {
    const salesperson = makeProfile({ role: "salesperson", id: "sales-1" })
    expect(canUserModifyJob(salesperson, null)).toBe(false)
  })
})

describe("canChangeSalesperson", () => {
  it("allows owners and managers", () => {
    expect(canChangeSalesperson(makeProfile({ role: "owner" }))).toBe(true)
    expect(canChangeSalesperson(makeProfile({ role: "manager" }))).toBe(true)
  })

  it("denies salespeople", () => {
    expect(canChangeSalesperson(makeProfile({ role: "salesperson" }))).toBe(false)
  })
})
