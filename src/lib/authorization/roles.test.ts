import { describe, expect, it } from "vitest"

import { isManager, isManagerOrOwner, isOwner } from "@/lib/authorization/roles"

describe("isManager", () => {
  it("matches only managers", () => {
    expect(isManager({ role: "manager" })).toBe(true)
    expect(isManager({ role: "owner" })).toBe(false)
    expect(isManager({ role: "salesperson" })).toBe(false)
  })
})

describe("isOwner", () => {
  it("matches only owners", () => {
    expect(isOwner({ role: "owner" })).toBe(true)
    expect(isOwner({ role: "manager" })).toBe(false)
    expect(isOwner({ role: "salesperson" })).toBe(false)
  })
})

describe("isManagerOrOwner", () => {
  it("allows owners and managers", () => {
    expect(isManagerOrOwner({ role: "owner" })).toBe(true)
    expect(isManagerOrOwner({ role: "manager" })).toBe(true)
  })

  it("denies salespeople", () => {
    expect(isManagerOrOwner({ role: "salesperson" })).toBe(false)
  })
})
