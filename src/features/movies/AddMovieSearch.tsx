import { useQuery } from '@tanstack/react-query'
import { Clapperboard, Loader2, Search, Star } from 'lucide-react'
import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/features/auth/useAuth'
import { useCreateMovie } from '@/features/movies/hooks'
import { MovieForm } from '@/features/movies/MovieForm'
import {
  fetchExternalRating,
  isTmdbConfigured,
  searchTmdbMovies,
  tmdbPosterUrl,
  type TmdbMovie,
} from '@/features/movies/tmdb'

export function AddMovieSearch({ onDone }: { onDone: () => void }) {
  const { session } = useAuth()
  const createMovie = useCreateMovie()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [manualMode, setManualMode] = useState(!isTmdbConfigured)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 400)
    return () => clearTimeout(timer)
  }, [query])

  const results = useQuery({
    queryKey: ['tmdb-search', debounced],
    queryFn: () => searchTmdbMovies(debounced),
    enabled: isTmdbConfigured && debounced.length >= 2,
    staleTime: 60_000,
  })

  if (manualMode) {
    return (
      <div className="space-y-4">
        {!isTmdbConfigured && (
          <p className="rounded-xl bg-amber-50 p-3.5 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            TMDB anahtarı tanımlı olmadığı için arama kapalı; filmi elle
            ekleyebilirsin.
          </p>
        )}
        <MovieForm onDone={onDone} />
        {isTmdbConfigured && (
          <button
            type="button"
            onClick={() => setManualMode(false)}
            className="mx-auto block text-sm font-medium text-zinc-500 transition-colors hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400"
          >
            ← Aramaya dön
          </button>
        )}
      </div>
    )
  }

  async function handlePick(movie: TmdbMovie) {
    if (!session || addingId !== null) return
    setError(null)
    setAddingId(movie.id)
    try {
      const external = await fetchExternalRating(movie)
      await createMovie.mutateAsync({
        user_id: session.user.id,
        title: movie.title,
        tmdb_id: movie.id,
        poster_path: movie.poster_path,
        release_date: movie.release_date || null,
        external_rating: external.rating,
        external_source: external.source,
      })
      onDone()
    } catch {
      setError('Eklenemedi — bu film zaten listende olabilir.')
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={16}
          className="absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400"
        />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="TMDB'de film ara…"
          aria-label="TMDB'de film ara"
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pr-4 pl-10 text-sm text-zinc-900 transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
        />
      </div>

      {results.isFetching && (
        <div className="space-y-2">
          <div className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
      )}

      {results.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Arama başarısız oldu. TMDB anahtarını ve bağlantını kontrol et.
        </p>
      )}

      {!results.isFetching && results.data && results.data.length === 0 && (
        <EmptyState text="Sonuç bulunamadı." />
      )}

      {!results.isFetching && results.data && results.data.length > 0 && (
        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {results.data.map((movie) => {
            const poster = tmdbPosterUrl(movie.poster_path)
            const year = movie.release_date?.slice(0, 4)
            return (
              <li key={movie.id}>
                <button
                  onClick={() => handlePick(movie)}
                  disabled={addingId !== null}
                  className="flex w-full items-center gap-3 rounded-xl bg-zinc-50 p-2.5 text-left transition-colors hover:bg-indigo-50 disabled:opacity-60 dark:bg-zinc-800 dark:hover:bg-indigo-500/10"
                >
                  {poster ? (
                    <img
                      src={poster}
                      alt=""
                      className="h-14 w-10 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-14 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-zinc-400 dark:bg-zinc-700">
                      <Clapperboard size={16} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {movie.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-zinc-400">
                      {year && <span>{year}</span>}
                      {movie.vote_average > 0 && (
                        <span className="flex items-center gap-0.5 tabular-nums">
                          <Star
                            size={10}
                            fill="currentColor"
                            strokeWidth={0}
                            className="text-amber-400"
                          />
                          {movie.vote_average.toFixed(1)}
                        </span>
                      )}
                    </span>
                  </span>
                  {addingId === movie.id && (
                    <Loader2
                      size={16}
                      className="animate-spin text-indigo-500"
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        type="button"
        onClick={() => setManualMode(true)}
        className="mx-auto block text-sm font-medium text-zinc-500 transition-colors hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400"
      >
        Listede yok mu? Elle ekle
      </button>
    </div>
  )
}
