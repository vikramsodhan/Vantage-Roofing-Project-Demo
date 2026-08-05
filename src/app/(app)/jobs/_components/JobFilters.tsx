"use client"

import { Search, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Filter bar for the jobs table — writes selections to URL search params so filters survive navigation and reload.
interface JobFiltersProps {
  divisions: { id: string; name: string | null }[]
  salespersons: { id: string; full_name: string | null }[]
  workTypes: { id: string; name: string | null }[]
  current: Record<string, string>
}

interface PendingFilters {
  sold?: string
  division_id?: string
  salesperson_id?: string
  work_type_id?: string
  date_from?: string
  date_to?: string
  address?: string
}

const FILTER_KEYS: (keyof PendingFilters)[] = [
  "sold",
  "division_id",
  "salesperson_id",
  "work_type_id",
  "date_from",
  "date_to",
  "address",
]

export default function JobFilters({
  divisions,
  salespersons,
  workTypes,
  current,
}: JobFiltersProps) {
  const router = useRouter()

  // Local state — initialized from applied URL params (key prop in page.tsx forces remount on apply)
  const [pending, setPending] = useState<PendingFilters>({
    sold: current.sold,
    division_id: current.division_id,
    salesperson_id: current.salesperson_id,
    work_type_id: current.work_type_id,
    date_from: current.date_from,
    date_to: current.date_to,
    address: current.address,
  })

  function set(key: keyof PendingFilters, value: string | undefined) {
    setPending((prev) => ({ ...prev, [key]: value }))
  }

  const hasValue = FILTER_KEYS.some((k) => Boolean(pending[k]))
  const hasApplied = FILTER_KEYS.some((k) => Boolean(current[k]))

  function buildParams(overrides: Record<string, string | null>) {
    const next = new URLSearchParams()
    if (current.sort) next.set("sort", current.sort)
    if (current.dir) next.set("dir", current.dir)
    for (const [k, v] of Object.entries(overrides)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    next.delete("page")
    return next.toString()
  }

  function apply() {
    const overrides: Record<string, string | null> = {}
    for (const k of FILTER_KEYS) {
      overrides[k] = pending[k] ?? null
    }
    router.push(`/jobs?${buildParams(overrides)}`)
  }

  function clearAll() {
    setPending({})
    router.push(`/jobs?${buildParams(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])))}`)
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Sold status toggle */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Status</p>
        <div className="flex rounded-md border overflow-hidden text-xs font-medium">
          {(["all", "true", "false"] as const).map((v) => {
            const label = v === "all" ? "All" : v === "true" ? "Sold" : "Unsold"
            const isActive = v === "all" ? !pending.sold : pending.sold === v
            return (
              <button
                key={v}
                onClick={() => set("sold", v === "all" ? undefined : v)}
                className={`px-3 py-1.5 transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Division */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Division</p>
        <Select
          value={pending.division_id ?? "all"}
          onValueChange={(v) => set("division_id", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All divisions</SelectItem>
            {divisions.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Salesperson */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Salesperson</p>
        <Select
          value={pending.salesperson_id ?? "all"}
          onValueChange={(v) => set("salesperson_id", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All salespeople</SelectItem>
            {salespersons.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.full_name ?? "Unknown"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Work type */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Work Type</p>
        <Select
          value={pending.work_type_id ?? "all"}
          onValueChange={(v) => set("work_type_id", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {workTypes.map((wt) => (
              <SelectItem key={wt.id} value={wt.id}>
                {wt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date quoted from */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Quoted From</p>
        <Input
          type="date"
          className="h-8 w-[140px] text-xs"
          value={pending.date_from ?? ""}
          onChange={(e) => set("date_from", e.target.value || undefined)}
        />
      </div>

      {/* Date quoted to */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Quoted To</p>
        <Input
          type="date"
          className="h-8 w-[140px] text-xs"
          value={pending.date_to ?? ""}
          onChange={(e) => set("date_to", e.target.value || undefined)}
        />
      </div>

      {/* Address text search */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Address</p>
        <Input
          type="text"
          placeholder="Street, city, postal..."
          className="h-8 w-[220px] text-xs"
          value={pending.address ?? ""}
          onChange={(e) => set("address", e.target.value || undefined)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply()
          }}
        />
      </div>

      {/* Apply */}
      <Button size="sm" className="h-8 gap-1.5" disabled={!hasValue} onClick={apply}>
        <Search className="h-3.5 w-3.5" />
        Apply
      </Button>

      {/* Clear — only shown when filters are actively applied in the URL */}
      {hasApplied && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={clearAll}
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  )
}
