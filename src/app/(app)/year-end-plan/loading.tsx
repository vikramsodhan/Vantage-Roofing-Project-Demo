import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function StatSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-6 w-24" />
    </div>
  )
}

export default function YearEndPlanLoading() {
  return (
    <div className="p-6 md:p-10 mx-auto max-w-4xl space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <Skeleton className="h-4 w-80" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
