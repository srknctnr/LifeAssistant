import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { currentUserId, supabase } from '@/lib/supabase'

export type Income = Tables<'incomes'>
export type ExpenseItem = Tables<'expense_items'>
export type Transaction = Tables<'transactions'>
export type BudgetCategory = Tables<'budget_categories'>

export async function listIncomes(): Promise<Income[]> {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .eq('user_id', await currentUserId())
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

export async function updateIncome(params: {
  id: string
  patch: TablesUpdate<'incomes'>
}): Promise<Income> {
  const { data, error } = await supabase
    .from('incomes')
    .update(params.patch)
    .eq('id', params.id)
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
    .eq('user_id', await currentUserId())
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

export async function updateExpenseItem(params: {
  id: string
  patch: TablesUpdate<'expense_items'>
}): Promise<ExpenseItem> {
  const { data, error } = await supabase
    .from('expense_items')
    .update(params.patch)
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteExpenseItem(id: string): Promise<void> {
  const { error } = await supabase.from('expense_items').delete().eq('id', id)
  if (error) throw error
}

export async function listTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', await currentUserId())
    .order('spent_on', { ascending: false })
  if (error) throw error
  return data
}

export async function createTransaction(
  input: TablesInsert<'transactions'>,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTransaction(params: {
  id: string
  patch: TablesUpdate<'transactions'>
}): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update(params.patch)
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

export async function listBudgetCategories(): Promise<BudgetCategory[]> {
  const { data, error } = await supabase
    .from('budget_categories')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function createBudgetCategory(
  input: TablesInsert<'budget_categories'>,
): Promise<BudgetCategory> {
  const { data, error } = await supabase
    .from('budget_categories')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}
