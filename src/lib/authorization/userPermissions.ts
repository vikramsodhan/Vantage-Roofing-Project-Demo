import type { Profile } from "@/types"

/**
 * Whether an owner may change another account's role or active status.
 *
 * Acting on your own account is barred: demoting or deactivating yourself
 * removes your own access to /admin, and nothing in the app can undo it —
 * recovery needs a second owner or direct database access. The caller has
 * already been checked for the owner role; this is only the self-check.
 */
export function canModifyAccount(profile: Profile, targetUserId: string): boolean {
  return profile.id !== targetUserId
}
