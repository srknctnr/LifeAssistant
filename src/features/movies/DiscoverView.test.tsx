import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// The real taste.ts and the real genre maps; only the "is a key configured"
// flag and the data sources are stubbed.
vi.mock('@/features/movies/tmdb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/movies/tmdb')>()
  return { ...actual, isTmdbConfigured: true, isOmdbConfigured: true }
})

type Row = {
  status: string
  rating: number | null
  genres: string[]
  tmdb_id: number | null
  title: string
}
const rows: Row[] = []

vi.mock('@/features/movies/hooks', () => ({
  useMovies: () => ({ data: rows, isPending: false }),
}))
vi.mock('@/features/movies/useAddFromSearch', () => ({
  resultKey: (r: { imdbId: string | null; tmdbId: number | null }) =>
    r.imdbId ?? String(r.tmdbId),
  useAddFromSearch: () => ({
    add: () => {},
    addingKey: null,
    error: null,
    askMode: false,
    familyVisible: false,
    setFamilyVisible: () => {},
  }),
}))

const { DiscoverView } = await import('@/features/movies/DiscoverView')

const calls: string[] = []

function mountRated(genres: string[][]) {
  rows.length = 0
  genres.forEach((g, i) =>
    rows.push({
      status: 'watched',
      rating: 5,
      genres: g,
      tmdb_id: null,
      title: `f${i}`,
    }),
  )
  calls.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn((input: URL | string) => {
      calls.push(String(input))
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      } as Response)
    }),
  )
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <DiscoverView />
    </QueryClientProvider>,
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('Keşfet, the taste feed', () => {
  it('offers the tab once there is a taste TMDB can be asked about', () => {
    mountRated([['Dram'], ['Dram'], ['Gerilim']])
    expect(screen.queryByText('Sana göre')).not.toBeNull()
  })

  it('does not offer it before there is anything to go on', () => {
    mountRated([['Dram']])
    expect(screen.queryByText('Sana göre')).toBeNull()
  })

  // The app's genre vocabulary is wider than TMDB's: Biyografi, Kara Film,
  // Müzikal and Spor come from OMDb and have no TMDB id. A profile made only
  // of those used to open a tab that named them and then returned nothing.
  it('does not offer a tab it cannot actually fill', () => {
    mountRated([['Biyografi'], ['Biyografi'], ['Müzikal']])
    expect(screen.queryByText('Sana göre')).toBeNull()
  })

  it('names only the genres it really asked about', () => {
    mountRated([['Biyografi', 'Dram'], ['Dram'], ['Dram']])
    const caption = screen.getByText(/Puan verdiğin filmlerden/)
    expect(caption.textContent).toContain('Dram')
    expect(caption.textContent).not.toContain('Biyografi')
  })
})
