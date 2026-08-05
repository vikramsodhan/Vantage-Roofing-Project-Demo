import { redirect } from "next/navigation"
import { cache } from "react"

import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/types"

export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return data
})

// Use this in layouts and pages instead of getProfile() directly
export async function requireActiveProfile(): Promise<Profile> {
  const supabase = await createClient()
  const profile = await getProfile()

  if (!profile) {
    redirect("/login")
  }

  if (!profile.is_active) {
    await supabase.auth.signOut()
    redirect("/login?reason=deactivated")
  }

  return profile
}
