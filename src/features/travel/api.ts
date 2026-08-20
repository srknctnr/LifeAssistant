import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { currentUserId, supabase } from '@/lib/supabase'

export type Trip = Tables<'trips'>

// A trip is personal when family_id is null and the group's when it is set;
// the SELECT policy covers both, so this query is deliberately NOT pinned to
// the caller — a group trip belongs to everyone in the group.
export async function listTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('starts_on', { ascending: true })
  if (error) throw error
  return data
}

export async function createTrip(input: TablesInsert<'trips'>): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTrip(params: {
  id: string
  patch: TablesUpdate<'trips'>
}): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .update(params.patch)
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

// RLS filters a delete the caller may not make into a silent no-op, so the
// row has to prove it went away
export async function deleteTrip(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('Bu geziyi silme yetkin yok.')
  }
}

// The saving side of a trip: a travel wish stamped with trip_id, which the
// existing ConvertForm then turns into a goal and a budget line. One per
// person per trip (unique index), so a group trip gives every traveller
// their own commitment.
export async function createTripWish(params: {
  tripId: string
  name: string
  amount: number
  targetDate: string
}): Promise<string> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .insert({
      user_id: await currentUserId(),
      name: params.name,
      kind: 'travel',
      estimated_amount: params.amount,
      target_date: params.targetDate,
      trip_id: params.tripId,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

// Keeps the caller's own anchor in step after the trip moves or is renamed;
// the unique index means there is at most one row to touch.
export async function updateTripEvent(params: {
  tripId: string
  title: string
  startsOn: string
}): Promise<void> {
  const { error } = await supabase
    .from('events')
    .update({ title: params.title, starts_on: params.startsOn })
    .eq('trip_id', params.tripId)
    .eq('user_id', await currentUserId())
  if (error) throw error
}

// The calendar side: one all-day anchor per person per trip. kind stays
// 'general' — the plane icon comes from trip_id, and planEventReminders
// gives the reminder for free.
export async function createTripEvent(params: {
  tripId: string
  title: string
  startsOn: string
}): Promise<void> {
  const { error } = await supabase.from('events').insert({
    user_id: await currentUserId(),
    kind: 'general',
    title: params.title,
    starts_on: params.startsOn,
    trip_id: params.tripId,
  })
  if (error) throw error
}
