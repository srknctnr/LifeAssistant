import { describe, expect, it, vi } from 'vitest'

// isTmdbConfigured is read from the environment, which a test must not
// depend on; everything else here is the real genre map and the real profile.
vi.mock('@/features/movies/tmdb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/movies/tmdb')>()
  return { ...actual, isTmdbConfigured: true }
})

const { tasteFeed } = await import('@/features/movies/taste-feed')

const rated = (genres: string[][]) =>
  genres.map((g) => ({ status: 'watched', rating: 5, genres: g }))

describe('tasteFeed', () => {
  it('is available once there are enough ratings TMDB can be asked about', () => {
    const feed = tasteFeed(rated([['Dram'], ['Dram'], ['Gerilim']]))
    expect(feed.available).toBe(true)
    expect(feed.liked).toContain('Dram')
  })

  it('is not available on one rating', () => {
    expect(tasteFeed(rated([['Dram']])).available).toBe(false)
  })

  // Biyografi, Kara Film, Müzikal and Spor come from OMDb and have no TMDB
  // id, so a profile made only of those cannot seed a query however
  // confident it looks.
  it('is not available for genres TMDB has no id for', () => {
    const feed = tasteFeed(rated([['Biyografi'], ['Biyografi'], ['Müzikal']]))
    expect(feed.available).toBe(false)
    expect(feed.liked).toEqual([])
  })

  it('names only the genres it can actually ask about', () => {
    const feed = tasteFeed(rated([['Biyografi', 'Dram'], ['Dram'], ['Dram']]))
    expect(feed.liked).toContain('Dram')
    expect(feed.liked).not.toContain('Biyografi')
  })

  it('reports nothing at all for an empty list', () => {
    expect(tasteFeed([])).toEqual({ liked: [], disliked: [], available: false })
  })
})
