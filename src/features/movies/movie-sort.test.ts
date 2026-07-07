import { describe, expect, it } from 'vitest'

import { filterAndSortMovies } from '@/features/movies/movie-sort'

const movies = [
  {
    title: 'Dune',
    created_at: '2026-07-01T00:00:00Z',
    rating: 4,
    external_rating: 8.1,
  },
  {
    title: 'Esaretin Bedeli',
    created_at: '2026-07-03T00:00:00Z',
    rating: 5,
    external_rating: 9.3,
  },
  {
    title: 'İlk Film',
    created_at: '2026-07-05T00:00:00Z',
    rating: null,
    external_rating: null,
  },
]

describe('filterAndSortMovies', () => {
  it('sorts by newest by default', () => {
    const result = filterAndSortMovies(movies, '', 'added')
    expect(result.map((m) => m.title)).toEqual([
      'İlk Film',
      'Esaretin Bedeli',
      'Dune',
    ])
  })

  it('sorts by personal rating with unrated titles last', () => {
    const result = filterAndSortMovies(movies, '', 'mine')
    expect(result.map((m) => m.title)).toEqual([
      'Esaretin Bedeli',
      'Dune',
      'İlk Film',
    ])
  })

  it('sorts by external rating with unrated titles last', () => {
    const result = filterAndSortMovies(movies, '', 'external')
    expect(result.map((m) => m.title)).toEqual([
      'Esaretin Bedeli',
      'Dune',
      'İlk Film',
    ])
  })

  it('filters by title, Turkish case-insensitively', () => {
    const result = filterAndSortMovies(movies, 'iLK', 'added')
    expect(result.map((m) => m.title)).toEqual(['İlk Film'])
  })
})
