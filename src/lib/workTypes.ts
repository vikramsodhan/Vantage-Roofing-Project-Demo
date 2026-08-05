import type { createClient } from "@/lib/supabase/server"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

/**
 * Pure DB insert. No auth, no revalidation — callers handle their own concerns.
 * Shared by admin/actions.ts#addWorkType and jobs/actions.ts#insertPendingWorkType.
 */
export async function insertWorkType(
  supabase: SupabaseClient,
  input: { name: string; is_roof_type_required: boolean },
): Promise<string> {
  // Trim the name here — the single server-side chokepoint for both inline
  // (job form) and admin work type creation — so no whitespace-padded variants
  // are ever stored.
  const { data, error } = await supabase
    .from("work_types")
    .insert({ ...input, name: input.name.trim(), is_active: true })
    .select("id")
    .single()

  if (error) throw new Error(error.message)
  return data.id
}
