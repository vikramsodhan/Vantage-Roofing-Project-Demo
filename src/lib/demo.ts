import type { Role } from "@/types"

/**
 * Demo mode — the public portfolio deployment, which anyone may enter without
 * credentials by picking a role.
 *
 * This is the demo's only way in. Production signs in through Google Workspace
 * SSO, which no visitor can authenticate against, so the demo needs its own
 * door rather than a relaxed version of the real one.
 *
 * Not gated off NODE_ENV — the deployed demo *is* a production build, which is
 * exactly why this flag must only ever be set on the demo project.
 *
 * Read via literal `process.env.X`: Next.js inlines NEXT_PUBLIC_ vars by
 * string-matching the expression, so a dynamic lookup resolves to undefined in
 * the browser bundle. See lib/env.ts.
 */
export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

type DemoRoleOption = { role: Role; label: string; blurb: string }

/**
 * The roles offered at the demo's front door, in presentation order — the
 * first is styled as the primary action. One list rather than parallel
 * label/blurb maps, so a role can't half-exist.
 */
export const DEMO_ROLES = [
  {
    role: "owner",
    label: "Owner",
    blurb: "Full access, including user administration.",
  },
  {
    role: "manager",
    label: "Manager",
    blurb: "Everything except user administration.",
  },
  {
    role: "salesperson",
    label: "Salesperson",
    blurb: "No year-end plan or admin; can only edit their own jobs.",
  },
] as const satisfies readonly DemoRoleOption[]

export type DemoRole = (typeof DEMO_ROLES)[number]["role"]
