import * as React from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function CurrencyInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
      >
        $
      </span>
      <Input className={cn("pl-6", className)} {...props} />
    </div>
  )
}

export { CurrencyInput }
