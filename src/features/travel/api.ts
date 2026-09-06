import type {
  Enums,
  Tables,
  TablesInsert,
  TablesUpdate,
} from '@/lib/database.types'
import { currentUserId, supabase } from '@/lib/supabase'

export type Trip = Tables<'trips'>
export type TripItem = Tables<'trip_items'>
export type TripItemKind = Enums<'trip_item_kind'>

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

// The trip's notebook. Visibility rides on the trip (can_use_trip), so this
// query is scoped by trip id and nothing else — a group trip's notebook is
// the group's. Ordered by day only; the time-of-day sort happens client-side
// so the query keeps a single .order().
export async function listTripItems(tripId: string): Promise<TripItem[]> {
  const { data, error } = await supabase
    .from('trip_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('starts_on', { ascending: true })
  if (error) throw error
  return data
}

export async function createTripItem(
  input: TablesInsert<'trip_items'>,
): Promise<TripItem> {
  const { data, error } = await supabase
    .from('trip_items')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTripItem(params: {
  id: string
  patch: TablesUpdate<'trip_items'>
}): Promise<TripItem> {
  const { data, error } = await supabase
    .from('trip_items')
    .update(params.patch)
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTripItem(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('trip_items')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('Bu kaydı silme yetkin yok.')
  }
}

export type PackingItem = Tables<'trip_packing_items'>
export type PackingCheck = Tables<'trip_packing_checks'>

export interface PackingItemWithChecks extends PackingItem {
  trip_packing_checks: Pick<PackingCheck, 'user_id' | 'checked_at'>[]
}

// One query, one round trip: the ticks come embedded over the composite FK,
// the same read listGroupExpenses does for expense_shares.
export async function listPackingItems(
  tripId: string,
): Promise<PackingItemWithChecks[]> {
  const { data, error } = await supabase
    .from('trip_packing_items')
    .select('*, trip_packing_checks(user_id, checked_at)')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as unknown as PackingItemWithChecks[]
}

export interface PackingDraft {
  title: string
  category?: string | null
  isGroupItem?: boolean
}

export async function addPackingItems(params: {
  tripId: string
  items: PackingDraft[]
}): Promise<number> {
  const userId = await currentUserId()
  const rows = params.items.map((item) => ({
    trip_id: params.tripId,
    user_id: userId,
    title: item.title,
    category: item.category ?? null,
    is_group_item: item.isGroupItem ?? false,
  }))
  // ignoreDuplicates so applying a template twice, or on two devices, is a
  // no-op rather than an error — the unique (trip_id, title_key) does the work
  const { data, error } = await supabase
    .from('trip_packing_items')
    .upsert(rows, { onConflict: 'trip_id,title_key', ignoreDuplicates: true })
    .select('id')
  if (error) throw error
  return data?.length ?? 0
}

// Every packing row the caller may see, across all their trips — the source
// pool for "copy a previous list". No new permission question: RLS returns
// exactly the trips whose list could be opened directly anyway.
export async function listAllPackingItems(): Promise<
  Pick<PackingItem, 'trip_id' | 'title' | 'category' | 'is_group_item'>[]
> {
  const { data, error } = await supabase
    .from('trip_packing_items')
    .select('trip_id, title, category, is_group_item')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function updatePackingItem(params: {
  id: string
  patch: TablesUpdate<'trip_packing_items'>
}): Promise<void> {
  const { data, error } = await supabase
    .from('trip_packing_items')
    .update(params.patch)
    .eq('id', params.id)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('Bu kaydı düzenleme yetkin yok.')
  }
}

export async function deletePackingItem(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('trip_packing_items')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('Bu kaydı silme yetkin yok.')
  }
}

// A tick is inserted or deleted, never edited: it is one person asserting a
// fact about their own hands. Both directions prove themselves, because an
// RLS-blocked write comes back 204 and would otherwise look like success.
export async function setPacked(params: {
  itemId: string
  tripId: string
  packed: boolean
}): Promise<void> {
  const userId = await currentUserId()
  if (params.packed) {
    // ignoreDuplicates is load-bearing, not a nicety: without it postgrest
    // sends Prefer: resolution=merge-duplicates and Postgres runs ON CONFLICT
    // DO UPDATE, whose arm is checked against this table's UPDATE policies —
    // and there deliberately are none, so a second tick on an already-ticked
    // row is refused with 42501. DO NOTHING needs only the insert policy.
    const { error } = await supabase
      .from('trip_packing_checks')
      .upsert(
        { item_id: params.itemId, trip_id: params.tripId, user_id: userId },
        { onConflict: 'item_id,user_id', ignoreDuplicates: true },
      )
    // An empty result here means the row was already there, which is success.
    // Unlike an update or a delete, an insert RLS refuses does not come back
    // quietly — it raises, and lands in `error`.
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('trip_packing_checks')
    .delete()
    .eq('item_id', params.itemId)
    .eq('user_id', userId)
  if (error) throw error
}
