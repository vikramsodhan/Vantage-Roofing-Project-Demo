import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const ROW_WIDTHS = ["w-40", "w-24", "w-20", "w-16"] as const

export default function AdminLoading() {
  return (
    <div className="p-6 md:p-8 mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Users card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-20" />
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <div className="flex gap-6 px-4 py-3 border-b bg-muted/40">
              {ROW_WIDTHS.map((w, i) => (
                <Skeleton key={i} className={`h-4 ${w}`} />
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, row) => (
              <div key={row} className="flex gap-6 px-4 py-3 border-b last:border-0">
                {ROW_WIDTHS.map((w, i) => (
                  <Skeleton key={i} className={`h-4 ${w}`} />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Work Types card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-8 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-9 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
