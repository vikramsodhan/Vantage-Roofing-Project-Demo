import { isManagerOrOwner } from "@/lib/authorization/roles"
import type { Profile } from "@/types"

export function canUserModifyJob(profile: Profile, salespersonId: string | null) {
  // To-do remove the ability for salespersonID to be null id is set to not null in supabase
  return isManagerOrOwner(profile) || profile.id === salespersonId
}

export function canChangeSalesperson(profile: Profile) {
  return isManagerOrOwner(profile)
}
