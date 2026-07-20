import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { currentUserId, supabase } from '@/lib/supabase'

export type LifeCategory = Tables<'life_categories'>
export type CategoryEntry = Tables<'category_entries'>

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
