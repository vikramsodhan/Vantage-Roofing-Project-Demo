import { createClient } from "@/lib/supabase/server"

interface Options {
  workTypeId?: string | null
  divisionId?: string | null
  salespersonId?: string | null
}

// Matches a standard UUID: five groups of hex digits (0-9, a-f) separated by
// dashes, in 8-4-4-4-12 lengths, e.g. "550e8400-e29b-41d4-a716-446655440000".
//   ^ and $   anchor the match to the whole string (no extra characters)
//   [0-9a-f]  one hex digit;  {8} means exactly eight of them
//   i (flag)  case-insensitive, so uppercase hex (A-F) also matches
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Helper function: returns true only when `value` is a real UUID string.
// .or() below takes a raw, unparameterized filter string, so we confirm the id
// is a UUID before interpolating it. A non-UUID falls back to active-only and
// never reaches the filter string.
function isUuid(value: string | null | undefined): boolean {
  return typeof value === "string" && UUID_REGEX.test(value)
}

export async function getJobFormData(opts: Options = {}) {
  const supabase = await createClient()

  // Build query objects only — no await here, so no requests fire yet.
  // Promise.all below triggers all three in parallel.
  const divisionsBase = supabase
    .from("divisions")
    .select("id, name, is_active")
    .order("is_active", { ascending: false })
    .order("name")
  const workTypesBase = supabase
    .from("work_types")
    .select("id, name, is_roof_type_required, is_active")
    .order("is_active", { ascending: false })
    .order("name")
  const salespersonsBase = supabase
    .from("profiles")
    .select("id, full_name, is_active")
    .order("is_active", { ascending: false })
    .order("full_name")

  // When a valid id is passed, .or() expands the filter to
  // "WHERE is_active = true OR id = '<that-id>'" — so all active rows
  // are returned PLUS the specific row the job currently references
  // (even if that row has been deactivated). Without a valid id, fall back
  // to active-only.
  const [{ data: divisions }, { data: workTypes }, { data: salespersons }] = await Promise.all([
    isUuid(opts.divisionId)
      ? divisionsBase.or(`is_active.eq.true,id.eq.${opts.divisionId}`)
      : divisionsBase.eq("is_active", true),
    isUuid(opts.workTypeId)
      ? workTypesBase.or(`is_active.eq.true,id.eq.${opts.workTypeId}`)
      : workTypesBase.eq("is_active", true),
    isUuid(opts.salespersonId)
      ? salespersonsBase.or(`is_active.eq.true,id.eq.${opts.salespersonId}`)
      : salespersonsBase.eq("is_active", true),
  ])

  return {
    divisions: divisions ?? [],
    workTypes: workTypes ?? [],
    salespersons: salespersons ?? [],
  }
}
