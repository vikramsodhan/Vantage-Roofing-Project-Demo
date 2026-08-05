import { Calendar, ChevronLeft, DollarSign, MapPin, Pencil, Receipt, Ruler } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { RoofTypeBadge, SoldBadge } from "@/components/custom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { canUserModifyJob } from "@/lib/authorization/jobPermissions"
import { EMPTY, formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/formatters"
import { isIncludedInDashboard } from "@/lib/metrics"
import { requireActiveProfile } from "@/lib/supabase/getProfile"
import { createClient } from "@/lib/supabase/server"
import type { JobWithCalculations } from "@/types"

import { CopyRowButton } from "../_components/CopyRowButton"
import { DeleteJobButton } from "../_components/DeleteJobButton"
import { buildSheetRow } from "../_lib/buildSheetRow"

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireActiveProfile()
  const { id: job_id } = await params

  const supabase = await createClient()
  const { data: rawJob } = await supabase
    .from("jobs_with_calculations")
    .select(
      `
      job_address, notes, sold, exclude_from_quote_metrics, salesperson_id,
      division_name, work_type_name, roof_type, salesperson_name,
      date_quoted, date_sold,
      squares, days,
      materials, labour, disposal, warranty, other, gutters,
      actual_materials, actual_labour, actual_disposal, actual_warranty, actual_other, actual_gutters,
      actual_total_job_cost,
      total_job_cost, sales_price, mgn, markup_pct,
      total_cost_percent, dollar_per_square, mgn_per_day, ee_mgn_per_day,
      entered_by_name, date_entered, updated_at
    `,
    )
    .eq("id", job_id)
    .single()

  if (!rawJob) notFound()

  // Cast at the query boundary — safe because the selected fields are all NOT NULL
  // in the jobs table. See src/types/index.ts for the full explanation.
  const job = rawJob as JobWithCalculations

  const canModify = canUserModifyJob(profile, job.salesperson_id)
  const sheetRow = buildSheetRow(job)

  return (
    <div className="p-6 md:p-8 mx-auto max-w-3xl space-y-5">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 min-w-0">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" />
            Jobs
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {job.job_address}
            </h1>
            <SoldBadge sold={job.sold} />
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <CopyRowButton value={sheetRow} />
          {canModify && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/jobs/${job_id}/edit`}>
                  <Pencil className="size-3.5 mr-1.5" />
                  Edit
                </Link>
              </Button>
              <DeleteJobButton jobId={job_id} jobAddress={job.job_address} />
            </>
          )}
        </div>
      </div>

      {/* ── Job Details ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <MapPin className="size-4 text-muted-foreground" />
            Job Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
            <Detail label="Division" value={job.division_name} />
            <Detail label="Type of Work" value={job.work_type_name} />
            {job.roof_type && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Roof Type</p>
                <RoofTypeBadge roofType={job.roof_type} />
              </div>
            )}
            <Detail label="Salesperson" value={job.salesperson_name} />
          </div>

          <div className="border-t pt-5">
            <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
            {job.notes ? (
              <p className="text-sm font-medium whitespace-pre-wrap">{job.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No notes</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Timeline ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Calendar className="size-4 text-muted-foreground" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <Detail label="Date Quoted" value={formatDate(job.date_quoted)} />
            {job.sold && <Detail label="Date Sold" value={formatDate(job.date_sold)} />}
            <Detail
              label="Used for quoted data"
              value={isIncludedInDashboard(job) ? "Yes" : "No"}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Measurements ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Ruler className="size-4 text-muted-foreground" />
            Measurements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <Detail label="Squares" value={formatNumber(job.squares)} />
            <Detail label="Days" value={formatNumber(job.days)} />
          </div>
        </CardContent>
      </Card>

      {/* ── Cost Breakdown ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Receipt className="size-4 text-muted-foreground" />
            Cost Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
            <Detail label="Materials" value={formatCurrency(job.materials)} />
            <Detail label="Labour" value={formatCurrency(job.labour)} />
            <Detail label="Disposal" value={formatCurrency(job.disposal)} />
            <Detail label="Warranty" value={formatCurrency(job.warranty)} />
            <Detail label="Other" value={formatCurrency(job.other)} />
            <Detail label="Gutters" value={formatCurrency(job.gutters)} />
          </div>
        </CardContent>
      </Card>

      {/* ── Financial Summary ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <DollarSign className="size-4 text-muted-foreground" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Cost" value={formatCurrency(job.total_job_cost)} />
            <StatCard label="Sales Price" value={formatCurrency(job.sales_price)} />
            <StatCard label="Margin" value={formatCurrency(job.mgn)} />
            <StatCard label="Markup %" value={`${formatNumber(job.markup_pct)}%`} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5 pt-4 border-t">
            <Detail
              label="Cost %"
              value={job.total_cost_percent != null ? `${job.total_cost_percent}%` : EMPTY}
            />
            <Detail label="$ / Square" value={formatCurrency(job.dollar_per_square)} />
            <Detail label="Margin / Day" value={formatCurrency(job.mgn_per_day)} />
            <Detail label="EE Margin / Day" value={formatCurrency(job.ee_mgn_per_day)} />
          </div>
        </CardContent>
      </Card>

      {/* ── Actual Cost ─────────────────────────────────────────────── */}
      {job.sold && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Receipt className="size-4 text-muted-foreground" />
              Actual Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!job.actual_total_job_cost ? (
              <p className="text-sm text-muted-foreground italic">
                No actual costs recorded yet — edit the job to add them.
              </p>
            ) : (
              <div className="space-y-5">
                <StatCard
                  label="Actual Total Cost"
                  value={formatCurrency(job.actual_total_job_cost)}
                />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5 pt-4 border-t">
                  <Detail label="Materials" value={formatCurrency(job.actual_materials)} />
                  <Detail label="Labour" value={formatCurrency(job.actual_labour)} />
                  <Detail label="Disposal" value={formatCurrency(job.actual_disposal)} />
                  <Detail label="Warranty" value={formatCurrency(job.actual_warranty)} />
                  <Detail label="Other" value={formatCurrency(job.actual_other)} />
                  <Detail label="Gutters" value={formatCurrency(job.actual_gutters)} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Metadata ────────────────────────────────────────────────── */}
      <p className="text-center text-xs text-muted-foreground pb-2">
        Entered by{" "}
        <span className="font-medium text-foreground">{job.entered_by_name ?? "Unknown"}</span> on{" "}
        {formatDateTime(job.date_entered)}
        {" · "}Last updated {formatDateTime(job.updated_at)}
      </p>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value ?? EMPTY}</p>
    </div>
  )
}
