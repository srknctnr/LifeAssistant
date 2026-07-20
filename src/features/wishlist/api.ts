import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { currentUserId, supabase } from '@/lib/supabase'

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
    .eq('user_id', await currentUserId())
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

export async function updateWishlistItem(params: {
  id: string
  patch: TablesUpdate<'wishlist_items'>
}): Promise<WishlistItem> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .update(params.patch)
    .eq('id', params.id)
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
    .eq('user_id', await currentUserId())
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as GoalWithWish[]
}

export async function listContributions(): Promise<SavingsContribution[]> {
  const { data, error } = await supabase
    .from('savings_contributions')
    .select('*')
    .eq('user_id', await currentUserId())
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

export async function deleteContribution(id: string): Promise<void> {
  const { error } = await supabase
    .from('savings_contributions')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// Pause/resume a goal; the linked budget expense item follows along so a
// paused goal stops counting against the monthly budget
export async function setGoalPaused(params: {
  goal: GoalWithWish
  paused: boolean
}): Promise<void> {
  const { goal, paused } = params
  const { error } = await supabase
    .from('savings_goals')
    .update({ status: paused ? 'paused' : 'active' })
    .eq('id', goal.id)
  if (error) throw error

  if (goal.expense_item_id) {
    const { error: expenseError } = await supabase
      .from('expense_items')
      .update({ is_active: !paused })
      .eq('id', goal.expense_item_id)
    if (expenseError) throw expenseError
  }
}

// Mark a reached goal as done: goal + wish completed, budget item deactivated
export async function completeGoal(goal: GoalWithWish): Promise<void> {
  const { error } = await supabase
    .from('savings_goals')
    .update({ status: 'completed' })
    .eq('id', goal.id)
  if (error) throw error

  if (goal.expense_item_id) {
    const { error: expenseError } = await supabase
      .from('expense_items')
      .update({ is_active: false })
      .eq('id', goal.expense_item_id)
    if (expenseError) throw expenseError
  }

  const { error: wishError } = await supabase
    .from('wishlist_items')
    .update({ status: 'completed' })
    .eq('id', goal.wishlist_item_id)
  if (wishError) throw wishError
}

// Undo a conversion: removes the goal (contributions cascade) and the
// auto-created budget item, then puts the wish back on the active list
export async function deleteGoal(goal: GoalWithWish): Promise<void> {
  const { error } = await supabase
    .from('savings_goals')
    .delete()
    .eq('id', goal.id)
  if (error) throw error

  if (goal.expense_item_id) {
    const { error: expenseError } = await supabase
      .from('expense_items')
      .delete()
      .eq('id', goal.expense_item_id)
    if (expenseError) throw expenseError
  }

  const { error: wishError } = await supabase
    .from('wishlist_items')
    .update({ status: 'active' })
    .eq('id', goal.wishlist_item_id)
  if (wishError) throw wishError
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
