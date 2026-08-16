import type {
  Enums,
  Tables,
  TablesInsert,
  TablesUpdate,
} from '@/lib/database.types'
import { currentUserId, supabase } from '@/lib/supabase'

export type LifeCategory = Tables<'life_categories'>
export type CategoryEntry = Tables<'category_entries'>
// Named CalendarEvent, not Event: Event is a DOM global
export type CalendarEvent = Tables<'events'>
export type EventKind = Enums<'event_kind'>

export async function listCategories(): Promise<LifeCategory[]> {
  const { data, error } = await supabase
    .from('life_categories')
    .select('*')
    .eq('user_id', await currentUserId())
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createCategory(
  input: TablesInsert<'life_categories'>,
): Promise<LifeCategory> {
  const { data, error } = await supabase
    .from('life_categories')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCategory(params: {
  id: string
  patch: TablesUpdate<'life_categories'>
}): Promise<LifeCategory> {
  const { data, error } = await supabase
    .from('life_categories')
    .update(params.patch)
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('life_categories').delete().eq('id', id)
  if (error) throw error
}

export async function listEntries(): Promise<CategoryEntry[]> {
  const { data, error } = await supabase
    .from('category_entries')
    .select('*')
    .eq('user_id', await currentUserId())
    .order('done_on', { ascending: false })
  if (error) throw error
  return data
}

export async function createEntry(
  input: TablesInsert<'category_entries'>,
): Promise<CategoryEntry> {
  const { data, error } = await supabase
    .from('category_entries')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('category_entries')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// Pinned to the owner: events_select_family widens the SELECT policy, so an
// unpinned query would mix family members' events into the personal page.
// Time-of-day ordering happens client-side (see event-day.ts).
export async function listEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', await currentUserId())
    .order('starts_on', { ascending: true })
  if (error) throw error
  return data
}

export async function createEvent(
  input: TablesInsert<'events'>,
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('events')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEvent(params: {
  id: string
  patch: TablesUpdate<'events'>
}): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('events')
    .update(params.patch)
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}
