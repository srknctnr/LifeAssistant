import { describe, expect, it } from 'vitest'

import { rankCurated } from '@/features/movies/suggest'

const pool = [
  { imdbId: 'tt1', title: 'Klasik Dram', genres: ['Dram'] },
  { imdbId: 'tt2', title: 'Uzay Filmi', genres: ['Bilim Kurgu'] },
  { imdbId: 'tt3', title: 'Korku Evi', genres: ['Korku'] },
]

describe('rankCurated', () => {
  it('ranks by genre affinity and keeps pool order on ties', () => {
    const picks = rankCurated(
      pool,
      [
        { genre: 'Bilim Kurgu', score: 4, count: 2 },
        { genre: 'Korku', score: -2, count: 1 },
      ],
      new Set(),
    )
    expect(picks.map((p) => p.imdbId)).toEqual(['tt2', 'tt1', 'tt3'])
  })

  it('keeps acclaim order for a fresh profile', () => {
    const picks = rankCurated(pool, [], new Set())
    expect(picks.map((p) => p.imdbId)).toEqual(['tt1', 'tt2', 'tt3'])
  })

  it('excludes titles already on the list and respects the limit', () => {
    const picks = rankCurated(pool, [], new Set(['klasik dram']), 1)
    expect(picks.map((p) => p.imdbId)).toEqual(['tt2'])
  })
})
