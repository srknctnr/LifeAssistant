import { describe, expect, it } from 'vitest'

import { genreTasteProfile } from '@/features/movies/taste'

describe('genreTasteProfile', () => {
  it('boosts genres of highly rated films and penalizes low ones', () => {
    const profile = genreTasteProfile([
      { status: 'watched', rating: 5, genres: ['Dram', 'Gerilim'] },
      { status: 'watched', rating: 4, genres: ['Dram'] },
      { status: 'watched', rating: 1, genres: ['Korku'] },
    ])
    expect(profile[0]).toEqual({ genre: 'Dram', score: 3, count: 2 })
    expect(profile[1]).toEqual({ genre: 'Gerilim', score: 2, count: 1 })
    expect(profile.at(-1)).toEqual({ genre: 'Korku', score: -2, count: 1 })
  })

  it('ignores unwatched and unrated films', () => {
    const profile = genreTasteProfile([
      { status: 'to_watch', rating: null, genres: ['Dram'] },
      { status: 'watched', rating: null, genres: ['Komedi'] },
    ])
    expect(profile).toEqual([])
  })
})
