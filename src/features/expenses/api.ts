import type { Tables } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export type SharedExpense = Tables<'shared_expenses'>
export type ExpenseShare = Tables<'expense_shares'>
export type ExpenseSettlement = Tables<'expense_settlements'>

export interface ExpenseWithShares extends SharedExpense {
  expense_shares: ExpenseShare[]
}

// Group data, not personal data: no currentUserId() pin here — RLS scopes
// every row to the groups the caller belongs to, and the group id narrows it
export async function listGroupExpenses(
  familyId: string,
): Promise<ExpenseWithShares[]> {
  const { data, error } = await supabase
    .from('shared_expenses')
    .select('*, expense_shares(*)')
    .eq('family_id', familyId)
    .order('spent_on', { ascending: false })
  if (error) throw error
  return data as ExpenseWithShares[]
}

export async function listSettlements(
  familyId: string,
): Promise<ExpenseSettlement[]> {
  const { data, error } = await supabase
    .from('expense_settlements')
    .select('*')
    .eq('family_id', familyId)
    .order('settled_on', { ascending: false })
  if (error) throw error
  return data
}

export interface SaveExpenseInput {
  familyId: string
  expenseId?: string | null
  title: string
  amount: number
  paidBy: string
  spentOn: string
  category?: string | null
  note?: string | null
  tripId?: string | null
  splitMode: 'equal' | 'weight' | 'amount'
  // weight only travels for split_mode 'weight'; amount is always authoritative
  shares: { user_id: string; amount: number; weight?: number }[]
}

// One RPC so the header and its shares land together or not at all; the
// deferred trigger rejects any save whose shares miss the total
export async function saveExpense(input: SaveExpenseInput): Promise<string> {
  const { data, error } = await supabase.rpc('save_shared_expense', {
    p_family_id: input.familyId,
    p_title: input.title,
    p_amount: input.amount,
    p_paid_by: input.paidBy,
    p_spent_on: input.spentOn,
    p_shares: input.shares,
    p_split_mode: input.splitMode,
    p_category: input.category ?? null,
    p_note: input.note ?? null,
    p_expense_id: input.expenseId ?? null,
    p_trip_id: input.tripId ?? null,
  })
  if (error) throw error
  return data
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('shared_expenses').delete().eq('id', id)
  if (error) throw error
}

export interface CreateSettlementInput {
  familyId: string
  fromUser: string
  toUser: string
  amount: number
  currency: string
  settledOn: string
  note?: string | null
  createdBy: string
}

export async function createSettlement(
  input: CreateSettlementInput,
): Promise<ExpenseSettlement> {
  const { data, error } = await supabase
    .from('expense_settlements')
    .insert({
      family_id: input.familyId,
      from_user: input.fromUser,
      to_user: input.toUser,
      amount: input.amount,
      currency: input.currency,
      settled_on: input.settledOn,
      note: input.note ?? null,
      created_by: input.createdBy,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSettlement(id: string): Promise<void> {
  const { error } = await supabase
    .from('expense_settlements')
    .delete()
    .eq('id', id)
  if (error) throw error
}
