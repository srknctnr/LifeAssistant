import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { currentUserId, supabase } from '@/lib/supabase'

export type Movie = Tables<'movies'>

export async function listMovies(): Promise<Movie[]> {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .eq('user_id', await currentUserId())
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createMovie(
  input: TablesInsert<'movies'>,
): Promise<Movie> {
  const { data, error } = await supabase
    .from('movies')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMovie(params: {
  id: string
  patch: TablesUpdate<'movies'>
}): Promise<Movie> {
  const { data, error } = await supabase
    .from('movies')
    .update(params.patch)
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMovie(id: string): Promise<void> {
  const { error } = await supabase.from('movies').delete().eq('id', id)
  if (error) throw error
}
