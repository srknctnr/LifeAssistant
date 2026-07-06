import type { Tables, TablesInsert } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export type WishlistItem = Tables<'wishlist_items'>
export type SavingsGoal = Tables<'savings_goals'>
export type SavingsContribution = Tables<'savings_contributions'>

export interface GoalWithWish extends SavingsGoal {
  wishlist_items: Pick<WishlistItem, 'name' | 'kind' | 'target_date'> | null
}

export async function listWishlistItems(): Promise<WishlistItem[]> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createWishlistItem(
  input: TablesInsert<'wishlist_items'>,
): Promise<WishlistItem> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteWishlistItem(id: string): Promise<void> {
  const { error } = await supabase.from('wishlist_items').delete().eq('id', id)
  if (error) throw error
}

export async function listGoals(): Promise<GoalWithWish[]> {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*, wishlist_items(name, kind, target_date)')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as GoalWithWish[]
}

export async function listContributions(): Promise<SavingsContribution[]> {
  const { data, error } = await supabase
    .from('savings_contributions')
    .select('*')
    .order('contributed_on', { ascending: false })
  if (error) throw error
  return data
}

export async function addContribution(
  input: TablesInsert<'savings_contributions'>,
): Promise<SavingsContribution> {
  const { data, error } = await supabase
    .from('savings_contributions')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export interface ConvertParams {
  wishlistItemId: string
  monthlyAmount: number
  targetDate?: string | null
}

// Atomic on the database side: creates the budget expense item and the
// savings goal, then marks the wishlist item as converted (see
// supabase/migrations/20260706020000_add_convert_wishlist_function.sql)
export async function convertWishlistItem({
  wishlistItemId,
  monthlyAmount,
  targetDate,
}: ConvertParams): Promise<string> {
  const { data, error } = await supabase.rpc('convert_wishlist_item', {
    p_wishlist_item_id: wishlistItemId,
    p_monthly_amount: monthlyAmount,
    p_target_date: targetDate ?? null,
  })
  if (error) throw error
  return data
}
