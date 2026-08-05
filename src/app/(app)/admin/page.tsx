import { redirect } from "next/navigation"

import { isOwner } from "@/lib/authorization/roles"
import { requireActiveProfile } from "@/lib/supabase/getProfile"
import { createClient } from "@/lib/supabase/server"

import UserTable from "./_components/UserTable"
import WorkTypeManager from "./_components/WorkTypeManager"

export default async function AdminPage() {
  const profile = await requireActiveProfile()

  if (!isOwner(profile)) {
    redirect("/jobs")
  }

  const supabase = await createClient()

  const [{ data: users }, { data: workTypes }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("work_types").select("id, name, is_active").order("name"),
  ])

  return (
    <div className="p-6 md:p-8 mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin</h1>
        <p className="text-sm text-muted-foreground">Manage users and work types.</p>
      </div>
      <UserTable users={users ?? []} currentUserId={profile.id} />
      <WorkTypeManager workTypes={workTypes ?? []} />
    </div>
  )
}
