import type { ExpenseItem, Income, Transaction } from '@/features/budget/api'
import type { LifeCategory, CategoryEntry } from '@/features/calendar/api'
import type { Movie } from '@/features/movies/api'
import type { GoalWithWish, WishlistItem } from '@/features/wishlist/api'
import type { Tables, TablesInsert } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export type Profile = Tables<'profiles'>
export type Family = Tables<'families'>
export type FamilyInvite = Tables<'family_invites'>
export type ModuleShare = Tables<'module_shares'>
export type FamilyModule = ModuleShare['module']
export type ShareLevel = ModuleShare['level']

export interface FamilyMembership extends Tables<'family_members'> {
  families: Family | null
  profiles: Pick<Profile, 'display_name'> | null
}

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertProfile(params: {
  userId: string
  displayName: string
}): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { user_id: params.userId, display_name: params.displayName },
      { onConflict: 'user_id' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

// RLS returns the member rows of every family the caller belongs to, so a
// single query yields both my memberships and my co-members
export async function listMemberships(): Promise<FamilyMembership[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('*, families(*), profiles(display_name)')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as FamilyMembership[]
}

export async function createFamily(params: {
  userId: string
  name: string
}): Promise<Family> {
  const { data: family, error } = await supabase
    .from('families')
    .insert({ name: params.name, created_by: params.userId })
    .select()
    .single()
  if (error) throw error

  const { error: memberError } = await supabase
    .from('family_members')
    .insert({ family_id: family.id, user_id: params.userId, role: 'owner' })
  if (memberError) throw memberError

  return family
}

export async function deleteFamily(id: string): Promise<void> {
  const { error } = await supabase.from('families').delete().eq('id', id)
  if (error) throw error
}

export async function removeMember(memberRowId: string): Promise<void> {
  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('id', memberRowId)
  if (error) throw error
}

export async function listInvites(): Promise<FamilyInvite[]> {
  const { data, error } = await supabase
    .from('family_invites')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createInvite(
  input: TablesInsert<'family_invites'>,
): Promise<FamilyInvite> {
  const { data, error } = await supabase
    .from('family_invites')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function cancelInvite(id: string): Promise<void> {
  const { error } = await supabase
    .from('family_invites')
    .update({ status: 'cancelled' })
    .eq('id', id)
  if (error) throw error
}

export async function acceptInvite(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_family_invite', {
    p_code: code,
  })
  if (error) throw error
  return data
}

export async function listShares(): Promise<ModuleShare[]> {
  const { data, error } = await supabase
    .from('module_shares')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export interface MemberBudgetSummary {
  income: number
  planned: number
  spent: number
}

// Summary-level access: three totals via a definer RPC, no row visibility
export async function fetchMemberBudgetSummary(
  ownerId: string,
): Promise<MemberBudgetSummary> {
  const { data, error } = await supabase.rpc('family_budget_summary', {
    p_owner: ownerId,
  })
  if (error) throw error
  const raw = data as {
    income?: number
    planned?: number
    spent?: number
  } | null
  return {
    income: Number(raw?.income ?? 0),
    planned: Number(raw?.planned ?? 0),
    spent: Number(raw?.spent ?? 0),
  }
}

// Full-level readers: the family SELECT policies scope what these return
export async function listMemberIncomes(ownerId: string): Promise<Income[]> {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .eq('user_id', ownerId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function listMemberExpenses(
  ownerId: string,
): Promise<ExpenseItem[]> {
  const { data, error } = await supabase
    .from('expense_items')
    .select('*')
    .eq('user_id', ownerId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function listMemberTransactions(
  ownerId: string,
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', ownerId)
    .order('spent_on', { ascending: false })
  if (error) throw error
  return data
}

export async function listMemberGoals(
  ownerId: string,
): Promise<GoalWithWish[]> {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*, wishlist_items(name, kind, target_date)')
    .eq('user_id', ownerId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as GoalWithWish[]
}

export async function listMemberContributions(ownerId: string) {
  const { data, error } = await supabase
    .from('savings_contributions')
    .select('*')
    .eq('user_id', ownerId)
    .order('contributed_on', { ascending: false })
  if (error) throw error
  return data
}

export async function listMemberWishes(
  ownerId: string,
): Promise<WishlistItem[]> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('user_id', ownerId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function listMemberMovies(ownerId: string): Promise<Movie[]> {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .eq('user_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listMemberCategories(
  ownerId: string,
): Promise<LifeCategory[]> {
  const { data, error } = await supabase
    .from('life_categories')
    .select('*')
    .eq('user_id', ownerId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function listMemberEntries(
  ownerId: string,
): Promise<CategoryEntry[]> {
  const { data, error } = await supabase
    .from('category_entries')
    .select('*')
    .eq('user_id', ownerId)
    .order('done_on', { ascending: false })
  if (error) throw error
  return data
}

export async function setShare(params: {
  userId: string
  familyId: string
  module: FamilyModule
  level: ShareLevel | null // null closes the share
}): Promise<void> {
  if (params.level === null) {
    const { error } = await supabase
      .from('module_shares')
      .delete()
      .eq('family_id', params.familyId)
      .eq('user_id', params.userId)
      .eq('module', params.module)
    if (error) throw error
    return
  }

  const { error } = await supabase.from('module_shares').upsert(
    {
      family_id: params.familyId,
      user_id: params.userId,
      module: params.module,
      level: params.level,
    },
    { onConflict: 'family_id,user_id,module' },
  )
  if (error) throw error
}
