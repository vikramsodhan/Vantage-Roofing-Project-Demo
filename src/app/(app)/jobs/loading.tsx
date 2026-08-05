import { Skeleton } from "@/components/ui/skeleton"

// Tailwind needs static class names to scan; shared across header + data rows.
const COL_WIDTHS = ["w-[140px]", "w-20", "w-[100px]", "w-20", "w-20", "w-20"] as const

export default function JobsLoading() {
  return (
    <div className="p-6 md:p-8 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-full sm:w-28" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        {/* Header row */}
        <div className="flex gap-4 px-4 py-3 border-b bg-muted/40">
          {COL_WIDTHS.map((w, i) => (
            <Skeleton key={i} className={`h-4 ${w}`} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, row) => (
          <div key={row} className="flex gap-4 px-4 py-3 border-b last:border-0">
            {COL_WIDTHS.map((w, i) => (
              <Skeleton key={i} className={`h-4 ${w}`} />
            ))}
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8" />
          ))}
        </div>
      </div>
    </div>
  )
}
