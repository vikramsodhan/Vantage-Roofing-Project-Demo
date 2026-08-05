"use server"

/**
 * src/app/(app)/admin/actions.ts — Admin Server Actions
 *
 * Same conventions as jobs/actions.ts:
 * - Every action returns a ServerActionResult
 * - Auth is re-checked server-side on every action (UI gates are not enough).
 * - On the success branch, `id` is the affected entity's id (or just passed
 *   through for actions that don't create a new entity).
 */

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireRole, type ServerActionResult } from "@/lib/actions"
import { isOwner } from "@/lib/authorization/roles"
import { createClient } from "@/lib/supabase/server"
import { insertWorkType } from "@/lib/workTypes"
import type { Role } from "@/types"

const ROLE_VALUES = ["salesperson", "manager", "owner"] as const satisfies readonly Role[]

export async function updateRole(userId: string, role: Role): Promise<ServerActionResult> {
  const auth = await requireRole(isOwner, "Only owners can perform this action.")
  if (!auth.ok) return auth.result

  const validated = z.enum(ROLE_VALUES).safeParse(role)
  if (!validated.success) {
    return { success: false, error: "Invalid role value." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ role: validated.data })
    .eq("id", userId)
  if (error) return { success: false, error: error.message }

  revalidatePath("/admin")
  return { success: true, id: userId }
}

export async function toggleActive(userId: string, isActive: boolean): Promise<ServerActionResult> {
  const auth = await requireRole(isOwner, "Only owners can perform this action.")
  if (!auth.ok) return auth.result

  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", userId)
  if (error) return { success: false, error: error.message }

  revalidatePath("/admin")
  return { success: true, id: userId }
}

export async function addWorkType(
  name: string,
  is_roof_type_required: boolean,
): Promise<ServerActionResult> {
  const auth = await requireRole(isOwner, "Only owners can perform this action.")
  if (!auth.ok) return auth.result

  const supabase = await createClient()
  try {
    const id = await insertWorkType(supabase, { name, is_roof_type_required })
    revalidatePath("/admin")
    return { success: true, id }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create work type." }
  }
}

export async function toggleWorkTypeActive(
  id: string,
  isActive: boolean,
): Promise<ServerActionResult> {
  const auth = await requireRole(isOwner, "Only owners can perform this action.")
  if (!auth.ok) return auth.result

  const supabase = await createClient()
  const { error } = await supabase.from("work_types").update({ is_active: isActive }).eq("id", id)
  if (error) return { success: false, error: error.message }

  revalidatePath("/admin")
  return { success: true, id }
}
