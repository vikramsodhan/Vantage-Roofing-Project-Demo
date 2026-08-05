/**
 * scripts/demoData.ts — the demo dataset's definition.
 *
 * Shared by seed.ts (full bootstrap, creates users) and resetDemo.ts (restores
 * a vandalised demo without touching auth). Kept in scripts/ rather than src/
 * because the app never reads it — only these two scripts do.
 *
 * `supabase/seed.sql` carries the same reference rows for local dev and CI,
 * where `supabase start` loads SQL with no build step in front of it. The two
 * are held in step by demoData.test.ts, which parses the SQL and fails if they
 * diverge.
 */

export const DEMO_DIVISIONS = ["Residential", "Commercial", "Multi-Family"] as const

export type DemoWorkType = { name: string; isRoofTypeRequired: boolean }

export const DEMO_WORK_TYPES: readonly DemoWorkType[] = [
  // Roof systems — quoted as either a reroof or a new roof.
  { name: "Asphalt Shingle", isRoofTypeRequired: true },
  { name: "Architectural Shingle", isRoofTypeRequired: true },
  { name: "Cedar Shake", isRoofTypeRequired: true },
  { name: "Standing Seam Metal", isRoofTypeRequired: true },
  { name: "Modified Bitumen", isRoofTypeRequired: true },
  { name: "Clay Tile", isRoofTypeRequired: true },
  { name: "Slate", isRoofTypeRequired: true },
  // Services and components — no roof type applies.
  { name: "TPO Membrane", isRoofTypeRequired: false },
  { name: "EPDM Membrane", isRoofTypeRequired: false },
  { name: "Built-Up Roof", isRoofTypeRequired: false },
  { name: "Inspection", isRoofTypeRequired: false },
  { name: "Repair", isRoofTypeRequired: false },
  { name: "Skylights", isRoofTypeRequired: false },
  { name: "Gutters", isRoofTypeRequired: false },
  { name: "Soffit & Fascia", isRoofTypeRequired: false },
  { name: "Ventilation", isRoofTypeRequired: false },
  { name: "Maintenance", isRoofTypeRequired: false },
  { name: "Waterproofing", isRoofTypeRequired: false },
  { name: "Miscellaneous", isRoofTypeRequired: false },
]

export type SeededRole = "owner" | "manager" | "salesperson"

// Re-exported so scripts have one import for the whole demo dataset. The value
// and the reasoning live in src/lib/demoPassword.ts, shared with the app's
// sign-in action so the two can't disagree.
export { DEMO_PASSWORD } from "../src/lib/demoPassword"

/**
 * Every account seed.ts creates, and the role each must hold.
 *
 * resetDemo.ts restores `role` and `is_active` from this list rather than
 * deleting and recreating the users: the auth rows are what live demo sessions
 * hang off, so removing them would sign visitors out mid-visit.
 */
export const DEMO_ACCOUNTS: readonly { email: string; role: SeededRole }[] = [
  { email: "owner@vantage.test", role: "owner" },
  { email: "manager@vantage.test", role: "manager" },
  { email: "sales1@vantage.test", role: "salesperson" },
  { email: "sales2@vantage.test", role: "salesperson" },
  { email: "sales3@vantage.test", role: "salesperson" },
  { email: "sales4@vantage.test", role: "salesperson" },
  { email: "sales5@vantage.test", role: "salesperson" },
]

export const SALESPERSON_COUNT = DEMO_ACCOUNTS.filter((a) => a.role === "salesperson").length
