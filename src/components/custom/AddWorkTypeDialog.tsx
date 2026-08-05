"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

// "Create a new work type" dialog, shared by the job form and the admin work types manager.
interface AddWorkTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (name: string, is_roof_type_required: boolean) => void
}

export function AddWorkTypeDialog({ open, onOpenChange, onConfirm }: AddWorkTypeDialogProps) {
  const [name, setName] = useState("")
  const [isRoofTypeRequired, setIsRoofTypeRequired] = useState<boolean | null>(null)

  const canConfirm = name.trim().length > 0 && isRoofTypeRequired !== null

  function reset() {
    setName("")
    setIsRoofTypeRequired(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleConfirm() {
    if (!canConfirm) return
    if (isRoofTypeRequired === null) return
    onConfirm(name.trim(), isRoofTypeRequired)
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Work Type</DialogTitle>
          <DialogDescription>
            Double-check the spelling — once created, only an admin can edit or delete a work type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Skylight Installation"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleConfirm()
                }
              }}
              autoFocus
            />
          </div>

          <div className="rounded-md border p-3 space-y-2.5">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                Requires roof type? <span className="text-destructive">*</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Select Yes if this work type involves re-roofing or new roof construction.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={isRoofTypeRequired === true ? "default" : "outline"}
                onClick={() => setIsRoofTypeRequired(true)}
                className="flex-1"
              >
                Yes
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isRoofTypeRequired === false ? "default" : "outline"}
                onClick={() => setIsRoofTypeRequired(false)}
                className="flex-1"
              >
                No
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canConfirm} onClick={handleConfirm}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
