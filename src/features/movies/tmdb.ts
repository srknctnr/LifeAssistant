// TMDB is the movie database (search, posters, community score); OMDb turns
// a TMDB entry's IMDb id into the real IMDb rating. Both keys are optional:
// without TMDB the app falls back to manual entry, without OMDb the external
// rating falls back to TMDB's community average.

const TMDB_TOKEN = import.meta.env.VITE_TMDB_TOKEN
const OMDB_KEY = import.meta.env.VITE_OMDB_KEY

export const isTmdbConfigured = Boolean(TMDB_TOKEN)

export interface TmdbMovie {
  id: number
  title: string
  release_date: string | null
  poster_path: string | null
  vote_average: number
}

export interface ExternalRating {
  rating: number | null
  source: 'imdb' | 'tmdb' | null
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

export async function searchTmdbMovies(query: string): Promise<TmdbMovie[]> {
  const data = await tmdbFetch<{ results: TmdbMovie[] }>('/search/movie', {
    query,
    include_adult: 'false',
  })
  return data.results.slice(0, 8)
}

// Real IMDb rating via OMDb when possible; TMDB community score otherwise
export async function fetchExternalRating(
  movie: TmdbMovie,
): Promise<ExternalRating> {
  const tmdbFallback: ExternalRating =
    movie.vote_average > 0
      ? { rating: Math.round(movie.vote_average * 10) / 10, source: 'tmdb' }
      : { rating: null, source: null }

  if (!OMDB_KEY) return tmdbFallback

  try {
    const ids = await tmdbFetch<{ imdb_id: string | null }>(
      `/movie/${movie.id}/external_ids`,
    )
    if (!ids.imdb_id) return tmdbFallback

    const response = await fetch(
      `https://www.omdbapi.com/?i=${ids.imdb_id}&apikey=${OMDB_KEY}`,
    )
    if (!response.ok) return tmdbFallback

    const data = (await response.json()) as { imdbRating?: string }
    const parsed = Number.parseFloat(data.imdbRating ?? '')
    return Number.isFinite(parsed)
      ? { rating: parsed, source: 'imdb' }
      : tmdbFallback
  } catch {
    return tmdbFallback
  }
}

export function tmdbPosterUrl(
  path: string | null,
  size: 'w92' | 'w185' = 'w92',
): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null
}
