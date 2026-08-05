import { requireActiveProfile } from "@/lib/supabase/getProfile"

import JobForm from "../_components/JobForm"
import { getJobFormData } from "../_lib/getJobFormData"

export default async function NewJobPage() {
  const profile = await requireActiveProfile()

  // Fetch all dropdown data in parallel.
  // These three queries run at the same time instead of one after another.
  const { divisions, workTypes, salespersons } = await getJobFormData()

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-2xl mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">New Job</h1>
        <p className="text-sm text-muted-foreground">Enter job details to create a new record.</p>
      </div>
      <JobForm
        divisions={divisions ?? []}
        workTypes={workTypes ?? []}
        salespersons={salespersons ?? []}
        currentUserProfile={profile}
      />
    </div>
  )
}
