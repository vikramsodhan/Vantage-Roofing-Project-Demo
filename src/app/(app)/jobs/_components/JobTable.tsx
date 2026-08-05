import { ChevronDown, ChevronsUpDown, ChevronUp, Eye, Pencil, StickyNote } from "lucide-react"
import Link from "next/link"

import { RoofTypeBadge, SoldBadge } from "@/components/custom"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { canUserModifyJob } from "@/lib/authorization/jobPermissions"
import { EMPTY, formatCurrency, formatDate, formatNumber } from "@/lib/formatters"
import type { JobRow, Profile } from "@/types"

import { DeleteJobButton } from "./DeleteJobButton"
import { QuotedDataToggle } from "./QuotedDataToggle"

interface JobTableProps {
  jobs: JobRow[]
  currentUserProfile: Profile
  searchParams: Record<string, string>
}

export default function JobTable({ jobs, currentUserProfile, searchParams }: JobTableProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">No jobs match the current filters.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Try adjusting or clearing your filters.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Address</TableHead>
              <TableHead>Sold</TableHead>
              <TableHead className="text-center">Quoted Data</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Salesperson</TableHead>
              <TableHead>Work Type</TableHead>
              <SortHead col="date_quoted" label="Date Quoted" searchParams={searchParams} />
              <SortHead col="date_sold" label="Date Sold" searchParams={searchParams} />
              <SortHead col="squares" label="Squares" searchParams={searchParams} numeric />
              <SortHead col="days" label="Days" searchParams={searchParams} numeric />
              <SortHead
                col="total_job_cost"
                label="Total Cost"
                searchParams={searchParams}
                numeric
              />
              <SortHead col="sales_price" label="Sales Price" searchParams={searchParams} numeric />
              <SortHead col="mgn" label="Margin" searchParams={searchParams} numeric />
              <TableHead className="w-[90px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => {
              const id = job.id
              const canModify = canUserModifyJob(currentUserProfile, job.salesperson_id)
              return (
                <TableRow key={id} className="text-sm">
                  <TableCell className="font-medium max-w-[220px]">
                    <div className="flex items-start gap-1.5">
                      <Link
                        href={`/jobs/${id}`}
                        className="hover:underline leading-snug line-clamp-2 min-w-0"
                      >
                        {job.job_address ?? EMPTY}
                      </Link>
                      {job.notes && (
                        <StickyNote
                          className="size-3.5 mt-0.5 shrink-0 text-yellow-500"
                          aria-label="Has notes"
                        >
                          <title>{job.notes}</title>
                        </StickyNote>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <SoldBadge sold={job.sold} />
                  </TableCell>

                  <TableCell className="text-center">
                    <QuotedDataToggle
                      jobId={id}
                      sold={job.sold}
                      excludeFromQuoteMetrics={job.exclude_from_quote_metrics}
                      disabled={!canModify}
                    />
                  </TableCell>

                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {job.division_name ?? EMPTY}
                  </TableCell>

                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {job.salesperson_name ?? EMPTY}
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>{job.work_type_name ?? EMPTY}</span>
                      {job.roof_type && <RoofTypeBadge roofType={job.roof_type} />}
                    </div>
                  </TableCell>

                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(job.date_quoted)}
                  </TableCell>

                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {job.sold ? formatDate(job.date_sold) : EMPTY}
                  </TableCell>

                  <TableCell className="text-right text-muted-foreground">
                    {formatNumber(job.squares)}
                  </TableCell>

                  <TableCell className="text-right text-muted-foreground">
                    {formatNumber(job.days)}
                  </TableCell>

                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(job.total_job_cost)}
                  </TableCell>

                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(job.sales_price)}
                  </TableCell>

                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(job.mgn)}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      <Link
                        href={`/jobs/${id}`}
                        className="rounded p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {canModify && (
                        <>
                          <Link
                            href={`/jobs/${id}/edit`}
                            className="rounded p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <DeleteJobButton jobId={id} jobAddress={job.job_address ?? ""} iconOnly />
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── Sort header — 3-click cycle: inactive → desc → asc → reset ─────────────

function SortHead({
  col,
  label,
  searchParams,
  numeric = false,
}: {
  col: string
  label: string
  searchParams: Record<string, string>
  numeric?: boolean
}) {
  const isActive = searchParams.sort === col
  const isAsc = searchParams.dir === "asc"

  // Base params without sort/dir/page — preserves active filters
  const base = new URLSearchParams()
  for (const [k, v] of Object.entries(searchParams)) {
    if (v && k !== "sort" && k !== "dir" && k !== "page") base.set(k, v)
  }

  let href: string
  let Icon: typeof ChevronUp

  if (!isActive) {
    // 1st click: descending
    const next = new URLSearchParams(base)
    next.set("sort", col)
    next.set("dir", "desc")
    href = `/jobs?${next.toString()}`
    Icon = ChevronsUpDown
  } else if (!isAsc) {
    // 2nd click: ascending (currently desc)
    const next = new URLSearchParams(base)
    next.set("sort", col)
    next.set("dir", "asc")
    href = `/jobs?${next.toString()}`
    Icon = ChevronDown
  } else {
    // 3rd click: reset (currently asc)
    href = `/jobs?${base.toString()}`
    Icon = ChevronUp
  }

  return (
    <TableHead className={numeric ? "text-right" : ""}>
      <Link
        href={href}
        className={`inline-flex items-center gap-1 transition-colors ${
          isActive ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {label}
        <Icon className="h-3.5 w-3.5 shrink-0" />
      </Link>
    </TableHead>
  )
}
