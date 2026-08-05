import { cn } from "@/lib/utils"
import type { RoofType } from "@/types"

interface RoofTypeBadgeProps {
  roofType: RoofType
  className?: string
}

// Amber/sky are identity tints differentiating the two roof categories — not
// state colours. Migrate to semantic tokens once the design system grows.
export function RoofTypeBadge({ roofType, className }: RoofTypeBadgeProps) {
  const styles =
    roofType === "reroof"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"

  return (
    <span
      className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", styles, className)}
    >
      {roofType === "reroof" ? "Re-Roof" : "New Roof"}
    </span>
  )
}
