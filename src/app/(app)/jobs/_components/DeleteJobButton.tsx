"use client"

import { AlertCircle, AlertTriangle, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { deleteJob } from "@/app/(app)/jobs/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

// Delete confirmation dialog — requires typing "delete" to confirm.
interface DeleteJobButtonProps {
  jobId: string
  jobAddress: string
  iconOnly?: boolean
}

const CONFIRM_WORD = "delete"

export function DeleteJobButton({ jobId, jobAddress, iconOnly = false }: DeleteJobButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState("")

  const confirmed = confirmText.trim().toLowerCase() === CONFIRM_WORD

  function handleDelete() {
    if (!confirmed) return
    setError(null)
    startTransition(async () => {
      const result = await deleteJob(jobId)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.push("/jobs")
    })
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setError(null)
      setConfirmText("")
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <button
            type="button"
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        ) : (
          <Button variant="destructive" size="sm">
            Delete
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        onInteractOutside={(e) => isPending && e.preventDefault()}
        onEscapeKeyDown={(e) => isPending && e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-5 text-destructive" />
          </div>
          <DialogTitle className="text-center">Delete job</DialogTitle>
          <DialogDescription className="text-center">
            This permanently deletes the job and all its data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <p className="break-words font-medium">{jobAddress || "(no address)"}</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="delete-confirm" className="text-sm font-medium leading-none">
            Type <span className="font-mono text-foreground">{CONFIRM_WORD}</span> to confirm
          </label>
          <Input
            id="delete-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault()
            }}
            placeholder={CONFIRM_WORD}
            autoComplete="off"
            autoFocus
            disabled={isPending}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
          <DialogClose asChild disabled={isPending}>
            <Button variant="outline" className="w-full sm:w-auto">
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!confirmed || isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
