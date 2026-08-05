import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const ROW_WIDTHS = ["w-[120px]", "w-20", "w-[100px]", "w-20", "w-[100px]", "w-[90px]"] as const

function TableCardSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-32" />
      </CardHeader>
      <CardContent>
        {/* Header row */}
        <div className="flex gap-6 border-b pb-3">
          {ROW_WIDTHS.map((w, i) => (
            <Skeleton key={i} className={`h-3.5 ${w}`} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 5 }).map((_, row) => (
          <div key={row} className="flex gap-6 border-b py-3 last:border-0">
            {ROW_WIDTHS.map((w, i) => (
              <Skeleton key={i} className={`h-3.5 ${w}`} />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function DashboardLoading() {
  return (
    <div className="p-6 md:p-10 mx-auto max-w-7xl space-y-8">
      {/* Title */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-40" />
      </div>

      {/* Summary cards — 3x3 grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>

      {/* Tables */}
      <TableCardSkeleton />
      <TableCardSkeleton />
    </div>
  )
}
