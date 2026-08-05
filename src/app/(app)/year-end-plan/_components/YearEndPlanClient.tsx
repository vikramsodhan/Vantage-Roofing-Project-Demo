"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  EMPTY,
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/lib/formatters"
import type { YearEndPlan } from "@/types"

import { coerceNullableNumber, makeYearEndPlanSchema } from "../_lib/planSchema"
import {
  type LiveMetrics,
  monthsRemainingInYear,
  type PlanOverrides,
  resolvePlan,
} from "../_lib/yearEndPlanMath"
import { saveYearEndPlan } from "../actions"
import { DerivedStat, OverridableStat } from "./PlanStatFields"

/** The saved row plus the name behind its updated_by id, for the last-saved stamp. */
export type YearEndPlanRow = YearEndPlan & {
  updated_by_profile: { full_name: string | null } | null
}

interface YearEndPlanClientProps {
  /** The server's `new Date()`, so client and server never disagree on the year. */
  todayIso: string
  live: LiveMetrics
  plan: YearEndPlanRow | null
}

// Held as strings because that's what an <input> actually gives back — and ""
// is the only way to say "the box is empty", which is exactly the null the DB
// stores. Keeping numbers here would mean translating on every keystroke.
type PlanFormState = Record<keyof PlanOverrides, string>

// Clear Overrides deliberately leaves targetRevenue alone: the target is the
// plan's goal, not a stand-in for a live figure, and wiping it would throw away
// the thing the rest of the page exists to work toward.
const OVERRIDE_FIELDS = [
  "revenue",
  "jobsSold",
  "avgJobValue",
  "conversionPct",
  "monthsRemaining",
] as const satisfies readonly (keyof PlanFormState)[]

/**
 * Loading direction: the saved DB row into editable fields.
 *
 * Two things change on the way in — the snake_case column names become the
 * camelCase field names, and each number becomes the string its input needs,
 * with null becoming "" so an unset override renders as an empty box. The
 * schema can't do this job: it validates values arriving *from* the form, not
 * trusted values on their way *into* it.
 */
function toFormState(plan: YearEndPlanRow | null): PlanFormState {
  const toFormValue = (value: number | null | undefined) => (value == null ? "" : String(value))
  return {
    targetRevenue: toFormValue(plan?.target_revenue),
    revenue: toFormValue(plan?.revenue_override),
    jobsSold: toFormValue(plan?.jobs_sold_override),
    avgJobValue: toFormValue(plan?.avg_job_value_override),
    conversionPct: toFormValue(plan?.conversion_pct_override),
    monthsRemaining: toFormValue(plan?.months_remaining_override),
  }
}

/**
 * Preview direction: field strings into numbers for the live summary.
 *
 * This exists alongside the schema rather than duplicating it — it runs the
 * schema's own coercion but skips the bounds, because the summary still has to
 * render while a field is momentarily out of range (a half-typed "-", a 13 in
 * months). Validation of those same values is the schema's job below; this only
 * has to produce something displayable. Saving never goes through here.
 */
function toPreviewOverrides(form: PlanFormState): PlanOverrides {
  return {
    targetRevenue: coerceNullableNumber(form.targetRevenue),
    revenue: coerceNullableNumber(form.revenue),
    jobsSold: coerceNullableNumber(form.jobsSold),
    avgJobValue: coerceNullableNumber(form.avgJobValue),
    conversionPct: coerceNullableNumber(form.conversionPct),
    monthsRemaining: coerceNullableNumber(form.monthsRemaining),
  }
}

// Jobs and quotes are whole things — round first, then let formatNumber handle
// separators and the null → "—" case it already knows about.
function formatCount(value: number | null): string {
  return formatNumber(value == null ? null : Math.round(value))
}

export default function YearEndPlanClient({ todayIso, live, plan }: YearEndPlanClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [currentForm, setCurrentForm] = useState<PlanFormState>(() => toFormState(plan))
  const [lastSavedForm, setLastSavedForm] = useState<PlanFormState>(() => toFormState(plan))

  const today = useMemo(() => new Date(todayIso), [todayIso])

  // The schema reads the raw form strings directly (its preprocess does the same
  // coercion as the preview), so validating costs no extra conversion — and on
  // success its output is what gets saved, rather than a separately built object.
  const parsed = useMemo(
    () => makeYearEndPlanSchema(monthsRemainingInYear(today)).safeParse(currentForm),
    [currentForm, today],
  )

  const fieldErrors = useMemo(() => {
    if (parsed.success) return {} as Partial<Record<keyof PlanFormState, string>>
    const errors: Partial<Record<keyof PlanFormState, string>> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof PlanFormState | undefined
      if (field && !errors[field]) errors[field] = issue.message
    }
    return errors
  }, [parsed])

  // A value that fails validation is never fed to the math — it drops back to
  // the live figure so the rest of the summary stays trustworthy, and the stat
  // it belongs to renders as "—" rather than showing a number nothing will use.
  const overrides = useMemo(() => {
    const preview = toPreviewOverrides(currentForm)
    const usable = { ...preview }
    for (const field of Object.keys(fieldErrors) as (keyof PlanOverrides)[]) usable[field] = null
    return usable
  }, [currentForm, fieldErrors])

  const resolved = useMemo(() => resolvePlan(today, live, overrides), [today, live, overrides])

  // Avg Job $ has no live metric of its own — it's revenue ÷ jobs sold, and both
  // of those can themselves be overridden. Resolving again with the Avg Job $
  // override removed gives the value the field falls back to, so its placeholder
  // follows edits to the other two instead of showing a stale figure.
  const cascadedAvgJobValue = useMemo(
    () => resolvePlan(today, live, { ...overrides, avgJobValue: null }).avgJobValue,
    [today, live, overrides],
  )

  // Anything downstream of a rejected input is unknowable, so the whole pace
  // block waits rather than showing figures built on a value being ignored.
  const paceValue = (value: string) => (parsed.success ? value : EMPTY)
  const isDirty = useMemo(
    () =>
      (Object.keys(currentForm) as (keyof PlanFormState)[]).some(
        (key) => currentForm[key] !== lastSavedForm[key],
      ),
    [currentForm, lastSavedForm],
  )
  const hasAnyOverride = useMemo(
    () => OVERRIDE_FIELDS.some((field) => currentForm[field] !== ""),
    [currentForm],
  )

  function setField(field: keyof PlanFormState, value: string) {
    setCurrentForm((current) => ({ ...current, [field]: value }))
  }

  function handleClearOverrides() {
    setCurrentForm((current) => {
      const next = { ...current }
      for (const field of OVERRIDE_FIELDS) next[field] = ""
      return next
    })
  }

  // Throws away unsaved edits only — the saved row is untouched until Save.
  function handleDiscardChanges() {
    setCurrentForm(lastSavedForm)
  }

  function handleSave() {
    // Save is disabled while parsing fails, so this is a guard, not a path.
    if (!parsed.success) return
    setServerError(null)
    const submitted = currentForm
    const payload = parsed.data
    startTransition(async () => {
      const result = await saveYearEndPlan(payload)
      if (!result.success) {
        setServerError(result.error)
        return
      }
      setLastSavedForm(submitted)
      toast.success("Plan saved")
      // Pull the row back so the last-saved stamp reflects whoever actually
      // wrote last — this row is shared, and last write wins.
      router.refresh()
    })
  }

  const lastSavedBy = plan?.updated_by_profile?.full_name

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {resolved.year} Year-End Activity Plan
          </h1>
          <Badge variant="secondary">Includes {resolved.monthRangeLabel}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Shared with all managers and owners — everyone sees and edits the same plan.
        </p>
      </div>

      {serverError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Plan Summary</CardTitle>
          <CardDescription>
            Every figure reflects the inputs below, live — nothing is stored until you save.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <DerivedStat
              label="Revenue"
              value={fieldErrors.revenue ? EMPTY : formatCurrency(resolved.revenue)}
              isOverridden={resolved.isOverridden.revenue}
            />
            <DerivedStat
              label="Total Jobs Sold"
              value={fieldErrors.jobsSold ? EMPTY : formatNumber(resolved.jobsSold)}
              isOverridden={resolved.isOverridden.jobsSold}
            />
            <DerivedStat
              label="Avg Job $"
              value={fieldErrors.avgJobValue ? EMPTY : formatCurrency(resolved.avgJobValue)}
              isOverridden={resolved.isOverridden.avgJobValue}
            />
            <DerivedStat
              label="Conversion Rate"
              value={fieldErrors.conversionPct ? EMPTY : formatPercent(resolved.conversionPct)}
              isOverridden={resolved.isOverridden.conversionPct}
            />
          </div>

          <div className="space-y-3 border-t pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                What it takes to hit the target
              </p>
              {parsed.success && <Badge variant="secondary">{resolved.monthRangeLabel}</Badge>}
            </div>
            {parsed.success && resolved.targetRevenue == null && (
              <p className="text-sm text-muted-foreground">
                Set a target revenue below to see what it takes to get there.
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <DerivedStat
                label="Target Revenue"
                value={fieldErrors.targetRevenue ? EMPTY : formatCurrency(resolved.targetRevenue)}
              />
              <DerivedStat
                label="Revenue Needed"
                value={paceValue(
                  resolved.targetRevenue == null
                    ? EMPTY
                    : resolved.isTargetMet
                      ? "Target met"
                      : formatCurrency(resolved.revenueNeeded),
                )}
              />
              <DerivedStat
                label="Jobs Needed"
                value={paceValue(formatCount(resolved.jobsNeeded))}
              />
              <DerivedStat
                label="Quotes Needed"
                value={paceValue(formatCount(resolved.quotesNeeded))}
              />
              <DerivedStat
                label="Months Remaining"
                value={fieldErrors.monthsRemaining ? EMPTY : formatNumber(resolved.monthsRemaining)}
                isOverridden={resolved.isOverridden.monthsRemaining}
              />
              <DerivedStat
                label="Revenue Needed / Month"
                value={paceValue(formatCurrency(resolved.revenuePerMonth))}
              />
              <DerivedStat
                label="Jobs / Month"
                value={paceValue(formatCount(resolved.jobsPerMonth))}
              />
              <DerivedStat
                label="Quotes / Month"
                value={paceValue(formatCount(resolved.quotesPerMonth))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan Inputs</CardTitle>
          <CardDescription>
            Leave a field empty to keep tracking the live number. Type a value to hold it fixed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* The two figures you set. Nothing in the pace block resolves without
              a target, so this pair sits in its own panel rather than blending
              into the four live figures below it. */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <OverridableStat
                label="Target Revenue"
                value={currentForm.targetRevenue}
                onChange={(value) => setField("targetRevenue", value)}
                onRevert={() => setField("targetRevenue", "")}
                placeholder="Set a target to plan"
                error={fieldErrors.targetRevenue}
                disabled={isPending}
              />
              <OverridableStat
                label="Months Remaining"
                value={currentForm.monthsRemaining}
                onChange={(value) => setField("monthsRemaining", value)}
                onRevert={() => setField("monthsRemaining", "")}
                placeholder={formatNumber(monthsRemainingInYear(today))}
                error={fieldErrors.monthsRemaining}
                integerOnly
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <OverridableStat
              label="Revenue"
              value={currentForm.revenue}
              onChange={(value) => setField("revenue", value)}
              onRevert={() => setField("revenue", "")}
              placeholder={formatCurrency(live.revenue)}
              error={fieldErrors.revenue}
              disabled={isPending}
            />
            <OverridableStat
              label="Total Jobs Sold"
              value={currentForm.jobsSold}
              onChange={(value) => setField("jobsSold", value)}
              onRevert={() => setField("jobsSold", "")}
              placeholder={formatNumber(live.jobsSold)}
              error={fieldErrors.jobsSold}
              integerOnly
              disabled={isPending}
            />
            <OverridableStat
              label="Avg Job $"
              value={currentForm.avgJobValue}
              onChange={(value) => setField("avgJobValue", value)}
              onRevert={() => setField("avgJobValue", "")}
              placeholder={
                cascadedAvgJobValue == null ? EMPTY : formatCurrency(cascadedAvgJobValue)
              }
              error={fieldErrors.avgJobValue}
              disabled={isPending}
            />
            <OverridableStat
              label="Conversion Rate"
              value={currentForm.conversionPct}
              onChange={(value) => setField("conversionPct", value)}
              onRevert={() => setField("conversionPct", "")}
              placeholder={formatPercent(live.conversionPct)}
              error={fieldErrors.conversionPct}
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {isDirty ? (
            <span className="font-medium text-foreground">Unsaved changes</span>
          ) : plan?.updated_at ? (
            <>
              Last saved{lastSavedBy ? ` by ${lastSavedBy}` : ""} ·{" "}
              {formatDateTime(plan.updated_at)}
            </>
          ) : (
            "Not saved yet"
          )}
        </p>
        <div className="flex items-center gap-2">
          {/* Clears the override fields but doesn't write — like any other edit,
              it isn't real until Save, so it can be discarded too. */}
          <Button
            type="button"
            variant="ghost"
            onClick={handleClearOverrides}
            disabled={isPending || !hasAnyOverride}
          >
            Clear Overrides
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDiscardChanges}
            disabled={isPending || !isDirty}
          >
            Discard Changes
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || !isDirty || !parsed.success}
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  )
}
