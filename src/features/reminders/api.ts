import type { Enums, Tables, TablesInsert } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export type Reminder = Tables<'reminders'>
export type ReminderStatus = Enums<'reminder_status'>

export async function listReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .order('due_on', { ascending: true })
  if (error) throw error
  return data
}

export async function createReminder(
  input: TablesInsert<'reminders'>,
): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setReminderStatus(params: {
  id: string
  status: ReminderStatus
}): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .update({ status: params.status })
    .eq('id', params.id)
  if (error) throw error
}

export interface ReminderSyncPlan {
  toInsert: TablesInsert<'reminders'>[]
  toComplete: string[]
  toDismiss: string[]
}

export function mergePlans(...plans: ReminderSyncPlan[]): ReminderSyncPlan {
  return {
    toInsert: plans.flatMap((p) => p.toInsert),
    toComplete: plans.flatMap((p) => p.toComplete),
    toDismiss: plans.flatMap((p) => p.toDismiss),
  }
}

export function isEmptyPlan(plan: ReminderSyncPlan): boolean {
  return (
    plan.toInsert.length === 0 &&
    plan.toComplete.length === 0 &&
    plan.toDismiss.length === 0
  )
}

// Idempotent: inserts rely on the reminders_user_source_due_unique index,
// so re-running the same plan (e.g. StrictMode double effects) is harmless
export async function syncReminders({
  toInsert,
  toComplete,
  toDismiss,
}: ReminderSyncPlan): Promise<void> {
  if (toInsert.length > 0) {
    const { error } = await supabase.from('reminders').upsert(toInsert, {
      onConflict: 'user_id,source_type,source_id,due_on',
      ignoreDuplicates: true,
    })
    if (error) throw error
  }
  if (toComplete.length > 0) {
    const { error } = await supabase
      .from('reminders')
      .update({ status: 'done' })
      .in('id', toComplete)
    if (error) throw error
  }
  if (toDismiss.length > 0) {
    const { error } = await supabase
      .from('reminders')
      .update({ status: 'dismissed' })
      .in('id', toDismiss)
    if (error) throw error
  }
}
