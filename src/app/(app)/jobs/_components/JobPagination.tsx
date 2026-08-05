"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const

interface JobPaginationProps {
  total: number
  page: number
  perPage: number
  searchParams: Record<string, string>
}

export default function JobPagination({ total, page, perPage, searchParams }: JobPaginationProps) {
  const router = useRouter()
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  function buildHref(updates: Record<string, string | null>) {
    const next = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (v) next.set(k, v)
    }
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    return `/jobs?${next.toString()}`
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-muted-foreground">
        {total === 0 ? "No results" : `Showing ${from}–${to} of ${total.toLocaleString()} jobs`}
      </p>

      <div className="flex items-center gap-4">
        {/* Rows per page */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs">Rows per page</span>
          <Select
            value={String(perPage)}
            onValueChange={(v) => router.push(buildHref({ per_page: v, page: "1" }))}
          >
            <SelectTrigger className="h-7 w-[64px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PER_PAGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page <= 1}
            onClick={() => router.push(buildHref({ page: String(page - 1) }))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-xs text-muted-foreground px-1 tabular-nums">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page >= totalPages}
            onClick={() => router.push(buildHref({ page: String(page + 1) }))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
