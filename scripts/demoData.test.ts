import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { DEMO_DIVISIONS, DEMO_WORK_TYPES } from "./demoData"

/**
 * demoData.ts and supabase/seed.sql describe the same reference rows for two
 * different consumers: the reset script reads the TypeScript, while
 * `supabase start` loads the SQL with no build step available to generate it.
 *
 * Nothing at runtime would notice them drifting — the demo would simply reset
 * to a different set of work types than local dev and CI use, which is exactly
 * the kind of bug that survives for months. These tests fail instead.
 */
const seedSql = readFileSync(
  fileURLToPath(new URL("../supabase/seed.sql", import.meta.url)),
  "utf8",
)

/** Pull the `('Name', true, false)` tuples out of one insert statement. */
function parseInsert(table: string): string[][] {
  const start = seedSql.search(new RegExp(`insert\\s+into\\s+public\\.${table}\\b`, "i"))
  if (start === -1) throw new Error(`no insert found for ${table}`)

  const end = seedSql.indexOf(";", start)
  if (end === -1) throw new Error(`unterminated insert for ${table}`)

  const rows = [
    ...seedSql.slice(start, end).matchAll(/\(\s*'([^']*)'\s*((?:,\s*(?:true|false)\s*)+)\)/g),
  ].map((match) => [
    match[1],
    ...match[2]
      .split(",")
      .map((flag) => flag.trim())
      .filter(Boolean),
  ])

  // An empty result means the parser silently stopped matching, which would
  // make every assertion below pass vacuously.
  if (rows.length === 0) throw new Error(`parsed no rows for ${table}`)
  return rows
}

describe("demoData matches supabase/seed.sql", () => {
  it("has the same divisions, in the same order", () => {
    const fromSql = parseInsert("divisions").map(([name]) => name)
    expect(fromSql).toEqual([...DEMO_DIVISIONS])
  })

  it("has the same work types, with matching is_roof_type_required", () => {
    // Columns are (name, is_active, is_roof_type_required).
    const fromSql = parseInsert("work_types").map(([name, , roofTypeRequired]) => ({
      name,
      isRoofTypeRequired: roofTypeRequired === "true",
    }))
    expect(fromSql).toEqual([...DEMO_WORK_TYPES])
  })

  it("marks every seeded row active", () => {
    const activeFlags = [
      ...parseInsert("divisions").map(([, isActive]) => isActive),
      ...parseInsert("work_types").map(([, isActive]) => isActive),
    ]
    expect(activeFlags.every((flag) => flag === "true")).toBe(true)
  })
})
