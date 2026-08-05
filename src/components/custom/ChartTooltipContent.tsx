"use client"

import { formatCurrency } from "@/lib/formatters"

/**
 * Shared Recharts tooltip content. Use as:
 *   <Tooltip content={<ChartTooltipContent />} />
 *
 * Replaces the inline `contentStyle={{...}}` API so styling lives in semantic
 * Tailwind classes instead of hex literals. Formats every numeric value as CAD
 * currency by default; pass `format` to override (e.g. counts or percentages):
 *   <Tooltip content={<ChartTooltipContent format={fmt} />} />
 *
 * Recharts injects `active` / `payload` / `label` at render time. Its
 * exported `TooltipProps` type doesn't expose `payload` directly across
 * versions, so we type the props locally with just the fields we read.
 */
interface PayloadEntry {
  dataKey?: string | number
  name?: string | number
  value?: string | number
  color?: string
}

interface ChartTooltipContentProps {
  active?: boolean
  payload?: PayloadEntry[]
  label?: string | number
  format?: (value: number) => string
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  format = formatCurrency,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 text-xs tabular-nums shadow-md">
      {label != null && <p className="mb-1 font-medium text-foreground">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((p, i) => (
          <li key={`${p.dataKey ?? i}`} className="flex items-center gap-2">
            {/* Runtime-driven series color — Tailwind can't generate this at build time, so inline style is the only option here. */}
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: p.color }}
            />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium text-foreground">
              {typeof p.value === "number" ? format(p.value) : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
