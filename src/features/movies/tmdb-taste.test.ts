import { afterEach, describe, expect, it, vi } from 'vitest'

import { discoverByTaste, tmdbGenreIds } from '@/features/movies/tmdb'

function captureFetch() {
  const calls: URL[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: URL | string) => {
      calls.push(new URL(String(input)))
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      } as Response)
    }),
  )
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('tmdbGenreIds', () => {
  it('turns canonical Turkish names into TMDB ids', () => {
    expect(tmdbGenreIds(['Dram'])).toHaveLength(1)
    expect(tmdbGenreIds(['Bilim Kurgu', 'Korku'])).toHaveLength(2)
  })

  // The app's genre vocabulary is wider than TMDB's id list (OMDb contributes
  // Biyografi, Kara Film and friends). Those simply cannot seed this query.
  it('drops names TMDB has no id for instead of sending junk', () => {
    expect(tmdbGenreIds(['Biyografi'])).toEqual([])
    expect(tmdbGenreIds(['Dram', 'Biyografi'])).toHaveLength(1)
  })
})

describe('discoverByTaste', () => {
  it('asks for any liked genre, not all of them at once', async () => {
    const calls = captureFetch()
    await discoverByTaste({ liked: ['Dram', 'Gerilim'] })
    const genres = calls[0].searchParams.get('with_genres')
    // a comma here would be AND, and would only return films sitting in
    // every liked genre simultaneously
    expect(genres).toContain('|')
    expect(genres).not.toContain(',')
  })

  it('excludes the genres the user rates badly', async () => {
    const calls = captureFetch()
    await discoverByTaste({ liked: ['Dram'], disliked: ['Korku'] })
    expect(calls[0].searchParams.get('without_genres')).toBeTruthy()
  })

  // A genre cannot be both wanted and excluded; TMDB would return nothing.
  it('never excludes a genre it is also asking for', async () => {
    const calls = captureFetch()
    await discoverByTaste({ liked: ['Dram'], disliked: ['Dram'] })
    expect(calls[0].searchParams.get('without_genres')).toBeNull()
  })

  // Without a floor, sorting by score surfaces films with three perfect
  // votes, which reads as broken rather than adventurous.
  it('keeps a vote floor so the top is not noise', async () => {
    const calls = captureFetch()
    await discoverByTaste({ liked: ['Dram'] })
    expect(Number(calls[0].searchParams.get('vote_count.gte'))).toBeGreaterThan(
      0,
    )
    expect(calls[0].searchParams.get('sort_by')).toBe('vote_average.desc')
  })

  it('asks for nothing at all when there is no usable taste', async () => {
    const calls = captureFetch()
    expect(await discoverByTaste({ liked: [] })).toEqual([])
    expect(await discoverByTaste({ liked: ['Biyografi'] })).toEqual([])
    expect(calls).toHaveLength(0)
  })
})
