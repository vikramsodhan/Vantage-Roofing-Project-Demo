import { notFound, redirect } from "next/navigation"

import { canUserModifyJob } from "@/lib/authorization/jobPermissions"
import { requireActiveProfile } from "@/lib/supabase/getProfile"
import { createClient } from "@/lib/supabase/server"

import JobForm from "../../_components/JobForm"
import { getJobFormData } from "../../_lib/getJobFormData"

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireActiveProfile()

  const supabase = await createClient()

  const { id: job_id } = await params

  // Fetch the job first so we can pass its current IDs into getJobFormData.
  // This lets the form include legacy (inactive) division/work_type/salesperson
  // options that the job already references, so editing other fields doesn't
  // force the user to change them.
  // Only the columns JobForm prefills (JobFormDefaults) — keep the two in sync.
  const { data: jobData } = await supabase
    .from("jobs")
    .select(
      "id, job_address, notes, division_id, work_type_id, roof_type, salesperson_id, sold, exclude_from_quote_metrics, date_quoted, date_sold, squares, days, materials, labour, disposal, warranty, other, gutters, actual_materials, actual_labour, actual_disposal, actual_warranty, actual_other, actual_gutters, total_job_cost, sales_price, mgn, markup_pct",
    )
    .eq("id", job_id)
    .single()

  if (!jobData) notFound()

  if (!canUserModifyJob(profile, jobData.salesperson_id)) {
    redirect(`/jobs/${job_id}`) // Redirect unauthorized users back to jobs list
  }

  const { divisions, workTypes, salespersons } = await getJobFormData({
    divisionId: jobData.division_id,
    workTypeId: jobData.work_type_id,
    salespersonId: jobData.salesperson_id,
  })

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-2xl mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Edit Job</h1>
        <p className="text-sm text-muted-foreground">Update job details.</p>
      </div>
      <JobForm
        divisions={divisions ?? []}
        workTypes={workTypes ?? []}
        salespersons={salespersons ?? []}
        currentUserProfile={profile}
        defaultValues={jobData}
      />
    </div>
  )
}
