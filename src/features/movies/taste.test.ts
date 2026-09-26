import { describe, expect, it } from 'vitest'

import {
  dislikedGenres,
  genreTasteProfile,
  likedGenres,
  ratedMovieCount,
  tasteIsThin,
} from '@/features/movies/taste'

describe('genreTasteProfile', () => {
  it('boosts genres of highly rated films and penalizes low ones', () => {
    const profile = genreTasteProfile([
      { status: 'watched', rating: 5, genres: ['Dram', 'Gerilim'] },
      { status: 'watched', rating: 4, genres: ['Dram'] },
      { status: 'watched', rating: 1, genres: ['Korku'] },
    ])
    expect(profile[0].genre).toBe('Dram')
    expect(profile[0]).toMatchObject({ score: 3, count: 2 })
    expect(profile[1]).toMatchObject({ genre: 'Gerilim', score: 2, count: 1 })
    expect(profile.at(-1)).toMatchObject({
      genre: 'Korku',
      score: -2,
      count: 1,
    })
  })

  it('ignores unrated films', () => {
    const profile = genreTasteProfile([
      { status: 'to_watch', rating: null, genres: ['Dram'] },
      { status: 'watched', rating: null, genres: ['Komedi'] },
    ])
    expect(profile).toEqual([])
  })

  // A rating can only be set by marking a film watched, so a rated row was
  // watched even if it was later put back on the list. Skipping those drops
  // exactly the films the user told us most about.
  it('still counts a rated film that was put back on the list', () => {
    const profile = genreTasteProfile([
      { status: 'to_watch', rating: 5, genres: ['Dram'] },
    ])
    expect(profile[0]).toMatchObject({ genre: 'Dram', count: 1 })
    expect(profile[0].weight).toBeGreaterThan(0)
  })

  // The raw sum rewards volume. Many indifferent ratings in one genre used to
  // outrank a single 5-star in another, which is the opposite of taste.
  it('does not let a pile of lukewarm ratings beat a genuine favourite', () => {
    const profile = genreTasteProfile([
      { status: 'watched', rating: 5, genres: ['Belgesel'] },
      { status: 'watched', rating: 5, genres: ['Belgesel'] },
      ...Array.from({ length: 8 }, () => ({
        status: 'watched',
        rating: 4,
        genres: ['Komedi'],
      })),
    ])
    // Komedi has the bigger raw sum, Belgesel the stronger taste
    const komedi = profile.find((g) => g.genre === 'Komedi')!
    const belgesel = profile.find((g) => g.genre === 'Belgesel')!
    expect(komedi.score).toBeGreaterThan(belgesel.score)
    expect(profile[0].genre).toBe('Belgesel')
  })

  it('damps a genre seen only once', () => {
    const once = genreTasteProfile([
      { status: 'watched', rating: 5, genres: ['Dram'] },
    ])[0]
    const often = genreTasteProfile(
      Array.from({ length: 6 }, () => ({
        status: 'watched',
        rating: 5,
        genres: ['Dram'],
      })),
    )[0]
    expect(often.weight).toBeGreaterThan(once.weight)
    expect(often.weight).toBeLessThanOrEqual(1)
    expect(once.weight).toBeGreaterThan(0)
  })
})

describe('tasteIsThin', () => {
  it('refuses to claim a taste from almost nothing', () => {
    expect(tasteIsThin([])).toBe(true)
    expect(
      tasteIsThin([{ status: 'watched', rating: 5, genres: ['Dram'] }]),
    ).toBe(true)
  })

  it('accepts a profile once there is something to go on', () => {
    const movies = Array.from({ length: 3 }, () => ({
      status: 'watched',
      rating: 4,
      genres: ['Dram'],
    }))
    expect(tasteIsThin(movies)).toBe(false)
    expect(ratedMovieCount(movies)).toBe(3)
  })
})

describe('likedGenres / dislikedGenres', () => {
  const profile = genreTasteProfile([
    { status: 'watched', rating: 5, genres: ['Dram'] },
    { status: 'watched', rating: 5, genres: ['Dram', 'Gerilim'] },
    { status: 'watched', rating: 4, genres: ['Bilim Kurgu'] },
    { status: 'watched', rating: 1, genres: ['Korku'] },
    { status: 'watched', rating: 2, genres: ['Müzikal'] },
  ])

  it('names only the genres actually liked', () => {
    const liked = likedGenres(profile)
    expect(liked).toContain('Dram')
    expect(liked).not.toContain('Korku')
    expect(liked.length).toBeLessThanOrEqual(3)
  })

  it('names the strongest dislike first', () => {
    expect(dislikedGenres(profile)[0]).toBe('Korku')
  })

  it('says nothing about a profile with no dislikes', () => {
    const positive = genreTasteProfile([
      { status: 'watched', rating: 5, genres: ['Dram'] },
    ])
    expect(dislikedGenres(positive)).toEqual([])
  })
})
