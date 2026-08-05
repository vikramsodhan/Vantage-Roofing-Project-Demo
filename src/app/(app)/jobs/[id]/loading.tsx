import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Tailwind needs static class names to scan; map runtime col counts to literals.
const COL_CLASS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
}

function SkeletonCard({ rows = 3, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-3 w-28" />
      </CardHeader>
      <CardContent>
        <div className={cn("grid gap-x-8 gap-y-5", COL_CLASS[cols])}>
          {Array.from({ length: rows * cols }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function JobDetailLoading() {
  return (
    <div className="p-6 md:p-8 mx-auto max-w-3xl space-y-5">
      {/* Back link + header */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      {/* Job Details card: 1 row × 3 cols */}
      <SkeletonCard rows={1} cols={3} />

      {/* Timeline card: 1 row × 2 cols */}
      <SkeletonCard rows={1} cols={2} />

      {/* Measurements card: 1 row × 2 cols */}
      <SkeletonCard rows={1} cols={2} />

      {/* Cost Breakdown card: 2 rows × 3 cols */}
      <SkeletonCard rows={2} cols={3} />

      {/* Financial Summary card */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-3 w-36" />
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 3 stat cards */}
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-28" />
              </div>
            ))}
          </div>
          {/* 4 detail rows */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5 pt-4 border-t">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
