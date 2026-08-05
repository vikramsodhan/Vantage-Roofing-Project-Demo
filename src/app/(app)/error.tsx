"use client"

import { AlertCircle } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6 md:p-10 mx-auto max-w-7xl">
      <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Something went wrong.</p>
          <p className="text-destructive/80">
            An error occurred while loading this page. Try again, or head back to the dashboard.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
        <Button onClick={reset} className="w-full sm:w-auto">
          Try again
        </Button>
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
