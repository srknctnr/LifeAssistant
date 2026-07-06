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
}

// Idempotent: inserts rely on the reminders_user_source_due_unique index,
// so re-running the same plan (e.g. StrictMode double effects) is harmless
export async function syncReminders({
  toInsert,
  toComplete,
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
}
