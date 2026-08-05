import type { Profile } from "@/types"

/**
 * Role predicates — "who is this person?", with no domain context. Job-specific
 * rules that combine a role with record ownership live in ./jobPermissions.
 *
 * These mirror the SQL helpers used by RLS (public.is_manager(), is_owner(),
 * is_manager_or_owner()) name-for-name, including how is_manager_or_owner is
 * composed from the other two — so a page gate reads the same as the policy
 * backing it. UI and server checks are convenience; the database is the real gate.
 *
 * Each takes only the role, so callers holding a narrowed profile (e.g. the
 * sidebar's Pick<Profile, "full_name" | "role" | "email">) can use them as-is.
 */

export function isManager(profile: Pick<Profile, "role">) {
  return profile.role === "manager"
}

export function isOwner(profile: Pick<Profile, "role">) {
  return profile.role === "owner"
}

export function isManagerOrOwner(profile: Pick<Profile, "role">) {
  return isManager(profile) || isOwner(profile)
}
