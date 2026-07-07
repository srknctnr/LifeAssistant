// Movie data providers. TMDB (optional) gives Turkish search, full release
// dates and the now-playing/upcoming feed; OMDb (optional) provides IMDb
// search and real IMDb ratings. Search works with either key — TMDB is
// preferred when both exist. Without any key the app falls back to manual
// entry.

const TMDB_TOKEN = import.meta.env.VITE_TMDB_TOKEN
const OMDB_KEY = import.meta.env.VITE_OMDB_KEY

export const isTmdbConfigured = Boolean(TMDB_TOKEN)
export const isOmdbConfigured = Boolean(OMDB_KEY)
export const isSearchConfigured = isTmdbConfigured || isOmdbConfigured

export interface MovieSearchResult {
  provider: 'tmdb' | 'omdb'
  tmdbId: number | null
  imdbId: string | null
  title: string
  year: string | null
  // stored as-is in movies.poster_path: TMDB relative path or OMDb full URL
  posterPath: string | null
  releaseDate: string | null
  tmdbScore: number | null
}

export interface ExternalRating {
  rating: number | null
  source: 'imdb' | 'tmdb' | null
}

interface TmdbSearchItem {
  id: number
  title: string
  release_date: string | null
  poster_path: string | null
  vote_average: number
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`https://api.themoviedb.org/3${path}`)
  url.searchParams.set('language', 'tr-TR')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
  })
  if (!response.ok) throw new Error(`TMDB isteği başarısız: ${response.status}`)
  return response.json() as Promise<T>
}

async function omdbFetch<T>(params: Record<string, string>): Promise<T> {
  const url = new URL('https://www.omdbapi.com/')
  url.searchParams.set('apikey', OMDB_KEY ?? '')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  const response = await fetch(url)
  if (!response.ok) throw new Error(`OMDb isteği başarısız: ${response.status}`)
  return response.json() as Promise<T>
}

async function searchTmdb(query: string): Promise<MovieSearchResult[]> {
  const data = await tmdbFetch<{ results: TmdbSearchItem[] }>('/search/movie', {
    query,
    include_adult: 'false',
  })
  return data.results.slice(0, 8).map((item) => ({
    provider: 'tmdb' as const,
    tmdbId: item.id,
    imdbId: null,
    title: item.title,
    year: item.release_date ? item.release_date.slice(0, 4) : null,
    posterPath: item.poster_path,
    releaseDate: item.release_date || null,
    tmdbScore: item.vote_average > 0 ? item.vote_average : null,
  }))
}

interface OmdbSearchItem {
  imdbID: string
  Title: string
  Year: string
  Poster: string
}

async function searchOmdb(query: string): Promise<MovieSearchResult[]> {
  const data = await omdbFetch<{ Search?: OmdbSearchItem[] }>({
    s: query,
    type: 'movie',
  })
  return (data.Search ?? []).slice(0, 8).map((item) => {
    const year = /^\d{4}/.exec(item.Year)?.[0] ?? null
    return {
      provider: 'omdb' as const,
      tmdbId: null,
      imdbId: item.imdbID,
      title: item.Title,
      year,
      posterPath: item.Poster && item.Poster !== 'N/A' ? item.Poster : null,
      releaseDate: year ? `${year}-01-01` : null,
      tmdbScore: null,
    }
  })
}

export function searchMovies(query: string): Promise<MovieSearchResult[]> {
  if (isTmdbConfigured) return searchTmdb(query)
  if (isOmdbConfigured) return searchOmdb(query)
  return Promise.resolve([])
}

async function imdbRatingById(imdbId: string): Promise<number | null> {
  const data = await omdbFetch<{ imdbRating?: string }>({ i: imdbId })
  const parsed = Number.parseFloat(data.imdbRating ?? '')
  return Number.isFinite(parsed) ? parsed : null
}

// Real IMDb rating when reachable; TMDB community score as fallback
export async function fetchExternalRating(
  result: MovieSearchResult,
): Promise<ExternalRating> {
  const tmdbFallback: ExternalRating = result.tmdbScore
    ? { rating: Math.round(result.tmdbScore * 10) / 10, source: 'tmdb' }
    : { rating: null, source: null }

  if (!isOmdbConfigured) return tmdbFallback

  try {
    let imdbId = result.imdbId
    if (!imdbId && result.tmdbId) {
      const ids = await tmdbFetch<{ imdb_id: string | null }>(
        `/movie/${result.tmdbId}/external_ids`,
      )
      imdbId = ids.imdb_id
    }
    if (!imdbId) return tmdbFallback

    const rating = await imdbRatingById(imdbId)
    return rating !== null ? { rating, source: 'imdb' } : tmdbFallback
  } catch {
    return tmdbFallback
  }
}

export function tmdbPosterUrl(
  path: string | null,
  size: 'w92' | 'w185' = 'w92',
): string | null {
  if (!path) return null
  // OMDb entries store the full poster URL
  if (path.startsWith('http')) return path
  return `https://image.tmdb.org/t/p/${size}${path}`
}
