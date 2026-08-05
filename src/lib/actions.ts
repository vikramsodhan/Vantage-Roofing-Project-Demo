import { getProfile } from "@/lib/supabase/getProfile"
import type { Profile } from "@/types"

/**
 * Shared result shape for every server action in the app.
 *
 * Actions never throw to the client. They return this discriminated union so
 * callers can branch on `result.success` and surface `result.error` in a
 * consistent destructive-banner pattern.
 *
 * The `id` on the success branch carries the affected entity's id (created,
 * updated, deleted, or just passed-through from the caller — whatever makes
 * sense for the action).
 */
export type ServerActionResult = { success: true; id: string } | { success: false; error: string }

/**
 * The two checks nearly every action needs before doing anything else: is
 * there a logged-in user, and is their account still active?
 *
 * A null-check performed inside this function can't narrow the caller's own
 * `profile` variable, so on success it hands back a fresh, non-null
 * `profile` for the caller to use instead — that's what keeps callers
 * type-safe without re-deriving the check themselves.
 */
type ActiveAccountCheck = { ok: true; profile: Profile } | { ok: false; result: ServerActionResult }

export function requireActiveAccount(profile: Profile | null): ActiveAccountCheck {
  if (!profile) {
    return { ok: false, result: { success: false, error: "You must be logged in to do this." } }
  }
  if (!profile.is_active) {
    return { ok: false, result: { success: false, error: "Your account is inactive." } }
  }
  return { ok: true, profile }
}

export async function requireRole(
  predicate: (profile: Profile) => boolean,
  message: string,
): Promise<ActiveAccountCheck> {
  const profile = await getProfile()
  const auth = requireActiveAccount(profile)
  if (!auth.ok) return auth
  if (!predicate(auth.profile)) {
    return { ok: false, result: { success: false, error: message } }
  }
  return { ok: true, profile: auth.profile }
}
