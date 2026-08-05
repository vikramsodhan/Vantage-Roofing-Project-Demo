"use client"

import { useState, useTransition } from "react"

import { setJobExcludeFromQuoteMetrics } from "@/app/(app)/jobs/actions"
import { Switch } from "@/components/ui/switch"

interface QuotedDataToggleProps {
  jobId: string
  sold: boolean
  excludeFromQuoteMetrics: boolean
  /** Disable when the current user can't modify this job. */
  disabled?: boolean
}

/**
 * Inline switch for "use this job in quoted data". Stored as the inverse
 * (exclude_from_quote_metrics). Sold jobs always count (sold-wins), so the
 * switch shows on + locked while sold.
 */
export function QuotedDataToggle({
  jobId,
  sold,
  excludeFromQuoteMetrics,
  disabled = false,
}: QuotedDataToggleProps) {
  const [isPending, startTransition] = useTransition()
  // Optimistic local copy so the switch responds immediately, reverting on failure.
  const [excluded, setExcluded] = useState(excludeFromQuoteMetrics)

  function handleChange(useForQuoted: boolean) {
    const nextExclude = !useForQuoted
    setExcluded(nextExclude)
    startTransition(async () => {
      const result = await setJobExcludeFromQuoteMetrics(jobId, nextExclude)
      if (!result.success) setExcluded(!nextExclude)
    })
  }

  return (
    <Switch
      checked={sold || !excluded}
      onCheckedChange={handleChange}
      disabled={disabled || sold || isPending}
      aria-label="Use this job in quoted data"
    />
  )
}
