import { isManagerOrOwner } from "@/lib/authorization/roles"
import type { Profile } from "@/types"

export function canUserModifyJob(profile: Profile, salespersonId: string) {
  return isManagerOrOwner(profile) || profile.id === salespersonId
}

export function canChangeSalesperson(profile: Profile) {
  return isManagerOrOwner(profile)
}
