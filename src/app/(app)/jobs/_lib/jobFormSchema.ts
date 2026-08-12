import { z } from "zod"

import type { RoofType, WorkType } from "@/types"

// Coerce form string inputs to numbers, defaulting blanks/NaN to 0.
const num = z.preprocess((v) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? 0))
  return isNaN(n) ? 0 : n
}, z.number().min(0))

const anyNum = z.preprocess((v) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? 0))
  return isNaN(n) ? 0 : n
}, z.number())

// Markup percentage: negative allowed down to -100 (price floors at $0), no max.
const pct = z.preprocess(
  (v) => {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? 0))
    return isNaN(n) ? 0 : n
  },
  z.number().min(-100, "Markup can't be below -100%"),
)

export const ROOF_TYPES = ["reroof", "newroof"] as const satisfies readonly RoofType[]

const baseSchema = z.object({
  job_address: z.string().min(1, "Job address is required"),
  notes: z.string().max(5000, "Notes must be 5000 characters or fewer").nullable().optional(),
  division_id: z.string().min(1, "Division is required"),
  work_type_id: z.string().min(1, "Type of work is required"),
  roof_type: z.enum(ROOF_TYPES).nullable().optional(),
  salesperson_id: z.string().min(1, "Salesperson is required"),
  sold: z.boolean(),
  exclude_from_quote_metrics: z.boolean(),
  date_quoted: z.string().min(1, "Date quoted is required"),
  date_sold: z.string().nullable().optional(),
  squares: num,
  days: num,
  materials: num,
  labour: num,
  disposal: num,
  warranty: num,
  other: num,
  gutters: num,
  actual_materials: num,
  actual_labour: num,
  actual_disposal: num,
  actual_warranty: num,
  actual_other: num,
  actual_gutters: num,
  total_job_cost: num,
  sales_price: num,
  mgn: anyNum,
  markup_pct: pct,
})

export type JobFormValues = z.infer<typeof baseSchema>

const pendingWorkTypeSchema = z.object({
  name: z.string().min(1, "Work type name is required"),
  is_roof_type_required: z.boolean(),
})

// Cross-field validation, shared by the browser schema and the server-side
// payload schema below so a rule can never hold in one and not the other. Needs
// the work-type list (and any pending new work type) to know whether a roof type
// is required.
function addCrossFieldIssues(
  data: JobFormValues,
  ctx: z.RefinementCtx,
  workTypes: Pick<WorkType, "id" | "is_roof_type_required">[],
  pendingWorkType: Pick<WorkType, "is_roof_type_required"> | null,
) {
  const active =
    data.work_type_id === "__new__"
      ? pendingWorkType
      : workTypes.find((w) => w.id === data.work_type_id)
  const isRoofingJob = active?.is_roof_type_required ?? false

  if (isRoofingJob && !data.roof_type) {
    ctx.addIssue({
      code: "custom",
      message: "Roof type is required for this work type",
      path: ["roof_type"],
    })
  }

  if (isRoofingJob && data.roof_type === "reroof" && data.squares <= 0) {
    ctx.addIssue({
      code: "custom",
      message: "Squares is required for re-roofing jobs",
      path: ["squares"],
    })
  }

  if (data.days <= 0) {
    ctx.addIssue({
      code: "custom",
      message: "Days must be greater than 0",
      path: ["days"],
    })
  }

  if (data.sold && !data.date_sold) {
    ctx.addIssue({
      code: "custom",
      message: "Date sold is required when job is sold",
      path: ["date_sold"],
    })
  }

  if (data.date_quoted && data.date_sold && new Date(data.date_quoted) > new Date(data.date_sold)) {
    ctx.addIssue({
      code: "custom",
      message: "Date quoted must be on or before date sold",
      path: ["date_quoted"],
    })
  }
}

export function makeSchema(
  workTypes: Pick<WorkType, "id" | "is_roof_type_required">[],
  pendingWorkType: Pick<WorkType, "is_roof_type_required"> | null,
) {
  return baseSchema.superRefine((data, ctx) =>
    addCrossFieldIssues(data, ctx, workTypes, pendingWorkType),
  )
}

/**
 * Server-side twin of makeSchema, for the payload the job actions receive: the
 * same fields plus the inline pending_work_type. Actions take `unknown` off the
 * network, so this is what turns a request into trusted data — the browser's
 * copy of these rules never runs there, and a TypeScript type is erased at
 * runtime. Unlisted keys (e.g. a client-supplied entered_by) are stripped.
 */
export function makeJobPayloadSchema(workTypes: Pick<WorkType, "id" | "is_roof_type_required">[]) {
  return baseSchema
    .extend({ pending_work_type: pendingWorkTypeSchema.nullable().optional() })
    .superRefine((data, ctx) =>
      addCrossFieldIssues(data, ctx, workTypes, data.pending_work_type ?? null),
    )
}

export type JobPayload = z.infer<ReturnType<typeof makeJobPayloadSchema>>
