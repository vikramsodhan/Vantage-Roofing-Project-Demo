import { cn } from "@/lib/utils"

interface SoldBadgeProps {
  sold: boolean
  className?: string
}

export function SoldBadge({ sold, className }: SoldBadgeProps) {
  return sold ? (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-success" />
      Sold
    </span>
  ) : (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-muted-foreground/60" />
      Not Sold
    </span>
  )
}
