"use client"

import { Plus, Search, Wrench } from "lucide-react"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { AddWorkTypeDialog } from "@/components/custom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { WorkType } from "@/types"

import { addWorkType, toggleWorkTypeActive } from "../actions"

// Owner-only work type management — search, add, activate/deactivate.
interface WorkTypeManagerProps {
  workTypes: Pick<WorkType, "id" | "name" | "is_active">[]
}

export default function WorkTypeManager({ workTypes }: WorkTypeManagerProps) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return workTypes
    return workTypes.filter((wt) => wt.name?.toLowerCase().includes(q))
  }, [workTypes, search])

  function handleAdd(name: string, is_roof_type_required: boolean) {
    startTransition(async () => {
      const result = await addWorkType(name, is_roof_type_required)
      if (!result.success) toast.error(result.error)
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Wrench className="size-4 text-muted-foreground" />
            Work Types
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} disabled={isPending}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search work types..."
            className="h-8 pl-8 text-sm"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {search ? `No work types match "${search}".` : "No work types yet."}
          </p>
        ) : (
          <ul className="space-y-1">
            {filtered.map((wt) => (
              <WorkTypeRow key={wt.id} workType={wt} />
            ))}
          </ul>
        )}
      </CardContent>

      <AddWorkTypeDialog open={addOpen} onOpenChange={setAddOpen} onConfirm={handleAdd} />
    </Card>
  )
}

function WorkTypeRow({ workType }: { workType: Pick<WorkType, "id" | "name" | "is_active"> }) {
  const [isPending, startTransition] = useTransition()

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      const result = await toggleWorkTypeActive(workType.id, checked)
      if (!result.success) toast.error(result.error)
    })
  }

  const isActive = workType.is_active ?? true

  return (
    <li
      className={cn(
        "flex items-center justify-between gap-3 rounded-md px-2 py-1.5",
        isPending && "opacity-50 pointer-events-none",
      )}
    >
      <span className={cn("text-sm", isActive ? "text-foreground" : "text-muted-foreground")}>
        {workType.name}
      </span>
      <div className="flex items-center gap-2">
        <Switch checked={isActive} onCheckedChange={handleToggle} disabled={isPending} />
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      </div>
    </li>
  )
}
