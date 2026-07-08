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
  genres: string[]
}

export interface MovieExtras {
  rating: number | null
  source: 'imdb' | 'tmdb' | null
  genres: string[]
}

// Both providers funnel into one canonical Turkish genre list so filtering
// and the taste profile work regardless of where a movie came from
const TMDB_GENRES: Record<number, string> = {
  28: 'Aksiyon',
  12: 'Macera',
  16: 'Animasyon',
  35: 'Komedi',
  80: 'Suç',
  99: 'Belgesel',
  18: 'Dram',
  10751: 'Aile',
  14: 'Fantastik',
  36: 'Tarih',
  27: 'Korku',
  10402: 'Müzik',
  9648: 'Gizem',
  10749: 'Romantik',
  878: 'Bilim Kurgu',
  10770: 'TV Filmi',
  53: 'Gerilim',
  10752: 'Savaş',
  37: 'Western',
}

const OMDB_GENRES: Record<string, string> = {
  Action: 'Aksiyon',
  Adventure: 'Macera',
  Animation: 'Animasyon',
  Biography: 'Biyografi',
  Comedy: 'Komedi',
  Crime: 'Suç',
  Documentary: 'Belgesel',
  Drama: 'Dram',
  Family: 'Aile',
  Fantasy: 'Fantastik',
  'Film-Noir': 'Kara Film',
  History: 'Tarih',
  Horror: 'Korku',
  Music: 'Müzik',
  Musical: 'Müzikal',
  Mystery: 'Gizem',
  Romance: 'Romantik',
  'Sci-Fi': 'Bilim Kurgu',
  Sport: 'Spor',
  Thriller: 'Gerilim',
  War: 'Savaş',
  Western: 'Western',
}

function omdbGenresToCanonical(genre: string | undefined): string[] {
  if (!genre || genre === 'N/A') return []
  return genre.split(',').map((g) => OMDB_GENRES[g.trim()] ?? g.trim())
}

interface TmdbSearchItem {
  id: number
  title: string
  release_date: string | null
  poster_path: string | null
  vote_average: number
  genre_ids: number[]
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
    genres: (item.genre_ids ?? [])
      .map((id) => TMDB_GENRES[id])
      .filter((g): g is string => Boolean(g)),
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
      genres: [],
    }
  })
}

export function searchMovies(query: string): Promise<MovieSearchResult[]> {
  if (isTmdbConfigured) return searchTmdb(query)
  if (isOmdbConfigured) return searchOmdb(query)
  return Promise.resolve([])
}

// Real IMDb rating when reachable (TMDB community score as fallback) plus
// genres — a single OMDb detail call provides both for IMDb entries
export async function fetchMovieExtras(
  result: MovieSearchResult,
): Promise<MovieExtras> {
  const fallback: MovieExtras = result.tmdbScore
    ? {
        rating: Math.round(result.tmdbScore * 10) / 10,
        source: 'tmdb',
        genres: result.genres,
      }
    : { rating: null, source: null, genres: result.genres }

  if (!isOmdbConfigured) return fallback

  try {
    let imdbId = result.imdbId
    if (!imdbId && result.tmdbId) {
      const ids = await tmdbFetch<{ imdb_id: string | null }>(
        `/movie/${result.tmdbId}/external_ids`,
      )
      imdbId = ids.imdb_id
    }
    if (!imdbId) return fallback

    const data = await omdbFetch<{ imdbRating?: string; Genre?: string }>({
      i: imdbId,
    })
    const genres =
      result.genres.length > 0
        ? result.genres
        : omdbGenresToCanonical(data.Genre)
    const parsed = Number.parseFloat(data.imdbRating ?? '')
    return Number.isFinite(parsed)
      ? { rating: parsed, source: 'imdb', genres }
      : { ...fallback, genres }
  } catch {
    return fallback
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
