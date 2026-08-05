import { describe, expect, it } from "vitest"

import { zeroActualsWhenUnsold } from "./actualCosts"

describe("zeroActualsWhenUnsold", () => {
  it("zeros every actual_* field when the job is not sold", () => {
    expect(zeroActualsWhenUnsold(false)).toEqual({
      actual_materials: 0,
      actual_labour: 0,
      actual_disposal: 0,
      actual_warranty: 0,
      actual_other: 0,
      actual_gutters: 0,
    })
  })

  it("returns no overrides for a sold job", () => {
    expect(zeroActualsWhenUnsold(true)).toEqual({})
  })

  it("leaves actuals untouched when the sold state is unknown", () => {
    // A partial update without `sold` shouldn't wipe actuals — only an explicit
    // `false` clears them.
    expect(zeroActualsWhenUnsold(null)).toEqual({})
    expect(zeroActualsWhenUnsold(undefined)).toEqual({})
  })
})
