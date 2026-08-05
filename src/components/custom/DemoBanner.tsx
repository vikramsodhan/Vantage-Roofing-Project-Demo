import { FlaskConical } from "lucide-react"

import { IS_DEMO_MODE } from "@/lib/demo"

/**
 * Standing notice that the figures on screen are fabricated.
 *
 * Renders nothing outside demo mode, so the app layout can mount it
 * unconditionally. Deliberately not dismissible: the point is that a visitor
 * can never be mid-way through the dashboard wondering whether the revenue is
 * a real company's.
 */
export function DemoBanner() {
  if (!IS_DEMO_MODE) return null

  return (
    <div
      role="note"
      className="flex items-center justify-center gap-3 border-b-4 border-amber-500/50 bg-amber-400/25 px-4 py-4 text-center text-amber-950 dark:bg-amber-400/15 dark:text-amber-100 sm:gap-4 sm:py-5"
    >
      <FlaskConical className="size-6 shrink-0 sm:size-7" aria-hidden="true" />
      <span className="leading-tight">
        <span className="block text-base font-bold tracking-tight sm:text-lg">
          Demo — not real data
        </span>
        <span className="block text-xs sm:text-sm">
          Every job, name, and dollar figure here is randomly generated.
        </span>
      </span>
    </div>
  )
}
