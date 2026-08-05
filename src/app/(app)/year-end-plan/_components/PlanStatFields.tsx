"use client"

import { X } from "lucide-react"
import { useId } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface OverridableStatProps {
  label: string
  /** "" means no override — the live value shows through as the placeholder. */
  value: string
  onChange: (value: string) => void
  onRevert: () => void
  /** The live value this field falls back to, already formatted for display. */
  placeholder: string
  error?: string
  /** Only affects the mobile keyboard; the integer rule itself is the schema's. */
  integerOnly?: boolean
  /** Marks the field the rest of the plan can't be calculated without. */
  emphasis?: boolean
  disabled?: boolean
}

/**
 * One editable planning figure. Empty input = no override (live value shows as a
 * greyed placeholder); typing freezes it. That maps the input's own emptiness
 * 1:1 onto the null-means-live contract, so there's no separate "is overridden"
 * state that could drift out of sync with what's actually in the box.
 *
 * Raw digits only here — the formatted reading of every field lives together in
 * the summary card, so there's one place to look rather than a number echoed
 * beside each box.
 */
export function OverridableStat({
  label,
  value,
  onChange,
  onRevert,
  placeholder,
  error,
  integerOnly = false,
  disabled,
}: OverridableStatProps) {
  const inputId = useId()
  const isOverridden = value !== ""

  return (
    <div className="space-y-1.5">
      {/* Fixed height and a non-shrinking button: the row must not reflow when
          the clear control appears, or every label jumps as you type. */}
      <div className="flex h-6 items-center justify-between gap-2">
        <label htmlFor={inputId} className="truncate text-sm text-muted-foreground">
          {label}
        </label>
        {isOverridden && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="shrink-0 text-muted-foreground"
            onClick={onRevert}
            disabled={disabled}
            aria-label={`Clear the overridden ${label} and go back to the live value`}
          >
            Overridden
            <X />
          </Button>
        )}
      </div>
      <Input
        id={inputId}
        type="number"
        inputMode={integerOnly ? "numeric" : "decimal"}
        // Browsers default to step=1, which makes any decimal count as invalid
        // input. The spinner still moves in 1s either way — this only lifts that
        // validity rule, so 18694.84 is accepted.
        step="any"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className={cn(isOverridden && "font-semibold")}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

interface DerivedStatProps {
  label: string
  value: string
  /** Marks a figure that's being held fixed rather than tracking live data. */
  isOverridden?: boolean
}

/** A resolved figure — read-only, since it's computed from the inputs. */
export function DerivedStat({ label, value, isOverridden }: DerivedStatProps) {
  return (
    <div className="space-y-0.5">
      <p className="truncate text-sm text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      {/* Always rendered so a stat is the same height overridden or not — the
          badge sits under the value rather than competing with the label for
          room, which is what made longer labels wrap. */}
      <div className="h-5">
        {isOverridden && (
          <Badge variant="secondary" className="font-normal">
            Overridden
          </Badge>
        )}
      </div>
    </div>
  )
}
