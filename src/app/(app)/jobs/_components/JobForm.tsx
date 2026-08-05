"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Calendar, DollarSign, MapPin, Plus, Receipt, Ruler, TriangleAlert, X } from "lucide-react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"
import { Controller, type Resolver, type SubmitHandler, useForm, useWatch } from "react-hook-form"

import { AddWorkTypeDialog, CurrencyInput } from "@/components/custom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { canChangeSalesperson } from "@/lib/authorization/jobPermissions"
import type { Division, JobFormDefaults, Profile, RoofType, WorkType } from "@/types"

import { type JobFormValues, makeSchema, ROOF_TYPES } from "../_lib/jobFormSchema"
import { createJob, updateJob } from "../actions"

const AddressAutocomplete = dynamic(
  () => import("./AddressAutocomplete").then((m) => m.AddressAutocomplete),
  { ssr: false },
)

// ─── Constants ────────────────────────────────────────────────────────────────

const ROOF_TYPE_LABELS: Record<RoofType, string> = {
  reroof: "Re-Roof",
  newroof: "New Roof",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNum(v: string | number | null | undefined): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? 0))
  return isNaN(n) ? 0 : n
}

function safe(v: number): number {
  return isNaN(v) ? 0 : v
}

// Fields that trigger a recompute of total_job_cost / sales_price / mgn.
const RECALC_FIELDS: string[] = [
  "materials",
  "labour",
  "disposal",
  "warranty",
  "other",
  "gutters",
  "markup_pct",
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobFormProps {
  divisions: Pick<Division, "id" | "name" | "is_active">[]
  workTypes: Pick<WorkType, "id" | "name" | "is_roof_type_required" | "is_active">[]
  salespersons: Pick<Profile, "id" | "full_name" | "is_active">[]
  currentUserProfile: Profile
  defaultValues?: JobFormDefaults
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function JobForm({
  divisions,
  workTypes,
  salespersons,
  currentUserProfile,
  defaultValues,
}: JobFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [pendingWorkType, setPendingWorkType] = useState<Pick<
    WorkType,
    "name" | "is_roof_type_required"
  > | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const schema = useMemo(() => makeSchema(workTypes, pendingWorkType), [workTypes, pendingWorkType])

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(schema) as Resolver<JobFormValues>,
    defaultValues: {
      job_address: defaultValues?.job_address ?? "",
      notes: defaultValues?.notes ?? null,
      division_id: defaultValues?.division_id ?? "",
      work_type_id: defaultValues?.work_type_id ?? "",
      roof_type: defaultValues?.roof_type ?? null,
      salesperson_id: defaultValues?.salesperson_id ?? currentUserProfile.id,
      sold: defaultValues?.sold ?? false,
      exclude_from_quote_metrics: defaultValues?.exclude_from_quote_metrics ?? false,
      date_quoted: defaultValues?.date_quoted ?? "",
      date_sold: defaultValues?.date_sold ?? null,
      squares: toNum(defaultValues?.squares),
      days: toNum(defaultValues?.days),
      materials: toNum(defaultValues?.materials),
      labour: toNum(defaultValues?.labour),
      disposal: toNum(defaultValues?.disposal),
      warranty: toNum(defaultValues?.warranty),
      other: toNum(defaultValues?.other),
      gutters: toNum(defaultValues?.gutters),
      actual_materials: toNum(defaultValues?.actual_materials),
      actual_labour: toNum(defaultValues?.actual_labour),
      actual_disposal: toNum(defaultValues?.actual_disposal),
      actual_warranty: toNum(defaultValues?.actual_warranty),
      actual_other: toNum(defaultValues?.actual_other),
      actual_gutters: toNum(defaultValues?.actual_gutters),
      total_job_cost: toNum(defaultValues?.total_job_cost),
      sales_price: toNum(defaultValues?.sales_price),
      mgn: toNum(defaultValues?.mgn),
      markup_pct: defaultValues ? toNum(defaultValues.markup_pct) : 40,
    },
  })

  const workTypeId = useWatch({ control, name: "work_type_id" })
  const roofType = useWatch({ control, name: "roof_type" })
  const sold = useWatch({ control, name: "sold" })
  const notes = useWatch({ control, name: "notes" })

  const activeWorkType = useMemo(
    () =>
      workTypeId === "__new__" ? pendingWorkType : workTypes.find((wt) => wt.id === workTypeId),
    [workTypes, workTypeId, pendingWorkType],
  )
  const isRoofingJob = activeWorkType?.is_roof_type_required ?? false
  const isReroofJob = isRoofingJob && roofType === "reroof"

  // Some legacy jobs have a stored total that doesn't equal the sum of their
  // line items (old manual overrides / migrated rows). Warn on the edit form so
  // the user knows an edit will recalculate the total from the line items.
  const storedCostMismatch = useMemo(() => {
    if (!defaultValues) return false
    const lineItemSum =
      toNum(defaultValues.materials) +
      toNum(defaultValues.labour) +
      toNum(defaultValues.disposal) +
      toNum(defaultValues.warranty) +
      toNum(defaultValues.other) +
      toNum(defaultValues.gutters)
    return Math.round(lineItemSum * 100) !== Math.round(toNum(defaultValues.total_job_cost) * 100)
  }, [defaultValues])

  // Recompute the derived financials whenever a cost line item or the markup %
  // changes. Using a watch subscription (not useWatch + deps) means this fires
  // only on real edits, never on mount — so opening an existing job leaves its
  // stored total/price/margin untouched until the user actually changes an input.
  // The react-hooks/incompatible-library warning is a false positive: it targets
  // render-time watch() reads, but this callback runs outside render, so the
  // compiler skipping memoization of this form costs nothing.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library
    const subscription = watch((values, { name }) => {
      if (!name || !RECALC_FIELDS.includes(name)) return
      const cost =
        safe(Number(values.materials)) +
        safe(Number(values.labour)) +
        safe(Number(values.disposal)) +
        safe(Number(values.warranty)) +
        safe(Number(values.other)) +
        safe(Number(values.gutters))
      const price = Math.round(cost * (1 + safe(Number(values.markup_pct)) / 100) * 100) / 100
      setValue("total_job_cost", cost)
      setValue("sales_price", price)
      setValue("mgn", Math.round((price - cost) * 100) / 100)
    })
    return () => subscription.unsubscribe()
  }, [watch, setValue])

  const onSubmit: SubmitHandler<JobFormValues> = (data) => {
    setServerError(null)

    const payload = {
      job_address: data.job_address,
      notes: data.notes || null,
      division_id: data.division_id,
      work_type_id: data.work_type_id,
      pending_work_type: pendingWorkType ?? null,
      roof_type: data.roof_type || null,
      salesperson_id: data.salesperson_id,
      sold: data.sold,
      exclude_from_quote_metrics: data.exclude_from_quote_metrics,
      date_quoted: data.date_quoted,
      date_sold: data.date_sold || null,
      squares: data.squares,
      days: data.days,
      materials: data.materials,
      labour: data.labour,
      disposal: data.disposal,
      warranty: data.warranty,
      other: data.other,
      gutters: data.gutters,
      actual_materials: data.actual_materials,
      actual_labour: data.actual_labour,
      actual_disposal: data.actual_disposal,
      actual_warranty: data.actual_warranty,
      actual_other: data.actual_other,
      actual_gutters: data.actual_gutters,
      total_job_cost: data.total_job_cost,
      sales_price: data.sales_price,
      mgn: data.mgn,
      markup_pct: data.markup_pct,
      entered_by: currentUserProfile.id,
    }

    startTransition(async () => {
      const isEdit = Boolean(defaultValues?.id)
      const result = isEdit ? await updateJob(payload, defaultValues!.id) : await createJob(payload)

      if (!result.success) {
        setServerError(result.error)
        return
      }

      router.push(`/jobs/${result.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-5">
      <AddWorkTypeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onConfirm={(name, is_roof_type_required) => {
          setPendingWorkType({ name, is_roof_type_required })
          setValue("work_type_id", "__new__")
        }}
      />
      {serverError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* ── Job Details ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <MapPin className="size-4 text-muted-foreground" />
            Job Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Job Address" required error={errors.job_address?.message}>
            <Controller
              name="job_address"
              control={control}
              render={({ field }) => (
                <AddressAutocomplete
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={isPending}
                  name={field.name}
                />
              )}
            />
          </Field>

          {/* Division | Salesperson */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Division" required error={errors.division_id?.message}>
              <Controller
                name="division_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      {divisions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                          {d.is_active === false && (
                            <span className="ml-1.5 text-xs text-muted-foreground">(inactive)</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="Salesperson" required error={errors.salesperson_id?.message}>
              {canChangeSalesperson(currentUserProfile) ? (
                <Controller
                  name="salesperson_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select salesperson" />
                      </SelectTrigger>
                      <SelectContent>
                        {salespersons.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.full_name ?? "Unknown"}
                            {s.is_active === false && (
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                (inactive)
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              ) : (
                <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                  {currentUserProfile.full_name ?? "Unknown"}
                </div>
              )}
            </Field>
          </div>

          {/* Type of Work | Roof Type (inline when visible) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type of Work" required error={errors.work_type_id?.message}>
              {pendingWorkType ? (
                <div className="flex h-9 items-center justify-between rounded-md border bg-muted/50 pl-3 pr-1 text-sm">
                  <span>
                    {pendingWorkType.name}
                    <span className="ml-1.5 text-xs text-muted-foreground">(new)</span>
                  </span>
                  <button
                    type="button"
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      setPendingWorkType(null)
                      setValue("work_type_id", "")
                    }}
                    aria-label="Remove new work type"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Controller
                    name="work_type_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isPending}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {workTypes.map((wt) => (
                            <SelectItem key={wt.id} value={wt.id}>
                              {wt.name}
                              {wt.is_active === false && (
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  (inactive)
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2 h-auto self-start py-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setAddDialogOpen(true)}
                    disabled={isPending}
                  >
                    <Plus className="size-3.5" />
                    Add new work type
                  </Button>
                </>
              )}
            </Field>

            {isRoofingJob && (
              <Field label="Roof Type" required error={errors.roof_type?.message}>
                <Controller
                  name="roof_type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v as RoofType)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select roof type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROOF_TYPES.map((rt) => (
                          <SelectItem key={rt} value={rt}>
                            {ROOF_TYPE_LABELS[rt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            )}
          </div>

          {/* Notes */}
          <Field
            label="Notes"
            error={errors.notes?.message}
            action={
              <span className="text-xs text-muted-foreground tabular-nums">
                {(notes?.length ?? 0).toLocaleString()} / 5,000
              </span>
            }
          >
            <Textarea
              placeholder="Any extra notes about this job…"
              rows={4}
              maxLength={5000}
              {...register("notes")}
              disabled={isPending}
            />
          </Field>
        </CardContent>
      </Card>

      {/* ── Status & Timeline ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Calendar className="size-4 text-muted-foreground" />
            Status &amp; Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sold toggle — drives required state + visibility of Date Sold */}
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2.5">
            <div className="min-w-0 space-y-0.5 pr-3">
              <label
                htmlFor="sold-toggle"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Job sold?
              </label>
              <p className="text-xs text-muted-foreground">
                {sold ? "Both dates below are required." : "Toggle on once the customer confirms."}
              </p>
            </div>
            <Controller
              name="sold"
              control={control}
              render={({ field }) => (
                <Switch
                  id="sold-toggle"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />
          </div>

          {/* Dates — Date Quoted always takes left column; Date Sold fills the right when sold */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date Quoted" required error={errors.date_quoted?.message}>
              <Input type="date" {...register("date_quoted")} disabled={isPending} />
            </Field>

            {sold && (
              <Field label="Date Sold" required error={errors.date_sold?.message}>
                <Input type="date" {...register("date_sold")} disabled={isPending} />
              </Field>
            )}
          </div>

          {/* Use for quoted data — set aside redundant variant quotes. Sold jobs always
              count (sold-wins), so the toggle is locked on while sold. */}
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2.5">
            <div className="min-w-0 space-y-0.5 pr-3">
              <label
                htmlFor="quoted-data-toggle"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Use for quoted data
              </label>
              <p className="text-xs text-muted-foreground">
                {sold
                  ? "Sold jobs always count toward quoted totals."
                  : "On by default. Turn off to keep this quote out of dashboard quoted totals."}
              </p>
            </div>
            <Controller
              name="exclude_from_quote_metrics"
              control={control}
              render={({ field }) => (
                <Switch
                  id="quoted-data-toggle"
                  checked={sold ? true : !field.value}
                  onCheckedChange={(checked) => field.onChange(!checked)}
                  disabled={isPending || sold}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Measurements ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Ruler className="size-4 text-muted-foreground" />
            Measurements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Squares" required={isReroofJob} error={errors.squares?.message}>
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="0.00"
                {...register("squares", { valueAsNumber: true })}
                disabled={isPending}
              />
            </Field>

            <Field label="Days" required error={errors.days?.message}>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                placeholder="0.5"
                {...register("days", { valueAsNumber: true })}
                disabled={isPending}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* ── Cost Breakdown ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Receipt className="size-4 text-muted-foreground" />
            Cost Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(
              [
                { name: "materials", label: "Materials" },
                { name: "labour", label: "Labour" },
                { name: "disposal", label: "Disposal" },
                { name: "warranty", label: "Warranty" },
                { name: "other", label: "Other" },
                { name: "gutters", label: "Gutters" },
              ] as const
            ).map(({ name, label }) => (
              <Field key={name} label={label} error={errors[name]?.message}>
                <CurrencyInput
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register(name, { valueAsNumber: true })}
                  disabled={isPending}
                />
              </Field>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Financial Summary ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <DollarSign className="size-4 text-muted-foreground" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Sales price and margin are calculated from the cost breakdown and markup percentage.
          </p>

          {storedCostMismatch && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                The cost breakdown doesn&apos;t add up to the saved total. Changing any cost or the
                markup % will recalculate the total, sales price, and margin from the line items.
              </span>
            </div>
          )}

          <Field label="Margin/Markup %" error={errors.markup_pct?.message}>
            <Input
              type="number"
              step="0.01"
              min="-100"
              placeholder="40"
              {...register("markup_pct", { valueAsNumber: true })}
              disabled={isPending}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Total Cost" error={errors.total_job_cost?.message}>
              <CurrencyInput
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("total_job_cost", { valueAsNumber: true })}
                disabled
              />
            </Field>

            <Field label="Sales Price" error={errors.sales_price?.message}>
              <CurrencyInput
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("sales_price", { valueAsNumber: true })}
                disabled
              />
            </Field>

            <Field label="Margin" error={errors.mgn?.message}>
              <CurrencyInput
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("mgn", { valueAsNumber: true })}
                disabled
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* ── Actual Cost ─────────────────────────────────────────────── */}
      {sold && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Receipt className="size-4 text-muted-foreground" />
              Actual Cost
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Enter once the job is complete to track what it actually cost.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(
                [
                  { name: "actual_materials", label: "Materials" },
                  { name: "actual_labour", label: "Labour" },
                  { name: "actual_disposal", label: "Disposal" },
                  { name: "actual_warranty", label: "Warranty" },
                  { name: "actual_other", label: "Other" },
                  { name: "actual_gutters", label: "Gutters" },
                ] as const
              ).map(({ name, label }) => (
                <Field key={name} label={label} error={errors[name]?.message}>
                  <CurrencyInput
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register(name, { valueAsNumber: true })}
                    disabled={isPending}
                  />
                </Field>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Actions ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:gap-3">
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? "Saving..." : "Save Job"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(defaultValues?.id ? `/jobs/${defaultValues.id}` : "/jobs")}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  action,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      {action ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-sm font-medium leading-none">
            {label}
            {required && <span className="ml-1 text-destructive">*</span>}
          </label>
          {action}
        </div>
      ) : (
        <label className="text-sm font-medium leading-none">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
