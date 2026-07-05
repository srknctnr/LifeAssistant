import type { Tables, TablesInsert } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export type Income = Tables<'incomes'>
export type ExpenseItem = Tables<'expense_items'>

export async function listIncomes(): Promise<Income[]> {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createIncome(
  input: TablesInsert<'incomes'>,
): Promise<Income> {
  const { data, error } = await supabase
    .from('incomes')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteIncome(id: string): Promise<void> {
  const { error } = await supabase.from('incomes').delete().eq('id', id)
  if (error) throw error
}

export async function listExpenseItems(): Promise<ExpenseItem[]> {
  const { data, error } = await supabase
    .from('expense_items')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createExpenseItem(
  input: TablesInsert<'expense_items'>,
): Promise<ExpenseItem> {
  const { data, error } = await supabase
    .from('expense_items')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteExpenseItem(id: string): Promise<void> {
  const { error } = await supabase.from('expense_items').delete().eq('id', id)
  if (error) throw error
}
