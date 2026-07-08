export type MovieSort = 'added' | 'mine' | 'external'

export const SORT_LABELS: Record<MovieSort, string> = {
  added: 'Son eklenen',
  mine: 'Puanım',
  external: 'IMDb/TMDB',
}

interface SortableMovie {
  title: string
  created_at: string
  rating: number | null
  external_rating: number | null
  genres: string[]
}

// Search matches the title case-insensitively, genre narrows to one genre;
// sorting by a rating pushes unrated titles to the end and breaks ties by
// newest first
export function filterAndSortMovies<T extends SortableMovie>(
  movies: T[],
  search: string,
  sort: MovieSort,
  genre: string | null = null,
): T[] {
  const query = search.trim().toLocaleLowerCase('tr')
  const filtered = movies.filter((m) => {
    if (genre && !m.genres.includes(genre)) return false
    if (query && !m.title.toLocaleLowerCase('tr').includes(query)) return false
    return true
  })

  const byNewest = (a: T, b: T) => b.created_at.localeCompare(a.created_at)

  if (sort === 'added') return filtered.sort(byNewest)

  const value = (m: T) =>
    sort === 'mine' ? (m.rating ?? -1) : (m.external_rating ?? -1)

  return filtered.sort((a, b) => value(b) - value(a) || byNewest(a, b))
}
