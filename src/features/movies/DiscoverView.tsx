import { useQueries, useQuery } from '@tanstack/react-query'
import { Check, Clapperboard, Loader2, Plus, Star } from 'lucide-react'
import { useState } from 'react'

import { Segmented } from '@/components/Segmented'
import { CURATED_POOL } from '@/features/movies/curated-pool'
import { useMovies } from '@/features/movies/hooks'
import { rankCurated } from '@/features/movies/suggest'
import { genreTasteProfile } from '@/features/movies/taste'
import {
  discoverMovies,
  isOmdbConfigured,
  isTmdbConfigured,
  omdbMovieByImdbId,
  tmdbPosterUrl,
  type DiscoverFeed,
  type MovieSearchResult,
} from '@/features/movies/tmdb'
import { resultKey, useAddFromSearch } from '@/features/movies/useAddFromSearch'
import { formatDate } from '@/lib/dates'

export function DiscoverView() {
  if (isTmdbConfigured) return <TheatricalFeeds />
  if (isOmdbConfigured) return <CuratedSuggestions />

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 p-5 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      <p className="font-semibold text-zinc-700 dark:text-zinc-200">
        Keşfet için bir API anahtarı gerekiyor
      </p>
      <p className="mt-1.5">
        OMDb anahtarıyla zevkine göre film önerileri, TMDB anahtarıyla ek olarak
        vizyondaki ve yakında çıkacak filmler açılır.
      </p>
    </div>
  )
}

const feedOptions: { value: DiscoverFeed; label: string }[] = [
  { value: 'now_playing', label: 'Vizyonda' },
  { value: 'upcoming', label: 'Yakında' },
]

// TMDB mode: Turkish theatrical listings
function TheatricalFeeds() {
  const [feed, setFeed] = useState<DiscoverFeed>('now_playing')
  const movies = useMovies()
  const { add, addingKey, error } = useAddFromSearch()

  const results = useQuery({
    queryKey: ['tmdb-discover', feed],
    queryFn: () => discoverMovies(feed),
    staleTime: 5 * 60_000,
  })

  const myTmdbIds = new Set(
    (movies.data ?? [])
      .map((m) => m.tmdb_id)
      .filter((id): id is number => id !== null),
  )

  return (
    <div className="mt-4">
      <Segmented<DiscoverFeed>
        options={feedOptions}
        value={feed}
        onChange={setFeed}
      />

      {results.isPending && <DiscoverSkeleton />}

      {results.isError && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          Liste yüklenemedi. TMDB anahtarını ve bağlantını kontrol et.
        </p>
      )}

      {results.data && (
        <ul className="mt-4 space-y-2.5">
          {results.data.map((result) => (
            <DiscoverRow
              key={resultKey(result)}
              result={result}
              meta={
                feed === 'upcoming' && result.releaseDate
                  ? `Çıkış: ${formatDate(result.releaseDate)}`
                  : (result.year ?? '')
              }
              added={result.tmdbId !== null && myTmdbIds.has(result.tmdbId)}
              addingKey={addingKey}
              onAdd={add}
            />
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

// OMDb-only mode: taste-ranked picks from the curated classics pool.
// Each pick is cached per id, so adding a movie only fetches its replacement.
function CuratedSuggestions() {
  const movies = useMovies()
  const { add, addingKey, error } = useAddFromSearch()

  const all = movies.data ?? []
  const ownedTitles = new Set(all.map((m) => m.title.toLocaleLowerCase('tr')))
  const picks = rankCurated(CURATED_POOL, genreTasteProfile(all), ownedTitles)

  const detailQueries = useQueries({
    queries: picks.map((pick) => ({
      queryKey: ['omdb-movie', pick.imdbId],
      queryFn: () => omdbMovieByImdbId(pick.imdbId),
      enabled: !movies.isPending,
      staleTime: 24 * 60 * 60_000,
      retry: 1,
    })),
  })

  const isLoading =
    movies.isPending || detailQueries.some((query) => query.isPending)
  const results = detailQueries
    .map((query) => query.data)
    .filter((r): r is MovieSearchResult => r != null)

  return (
    <div className="mt-4">
      <p className="text-xs text-zinc-400">
        Zevk profiline göre IMDb klasikleri havuzundan seçildi — puan verdikçe
        isabet artar. Vizyondakiler için TMDB anahtarı gerekmeye devam ediyor.
      </p>

      {isLoading && <DiscoverSkeleton />}

      {!isLoading && results.length === 0 && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          Öneriler yüklenemedi. OMDb anahtarını ve bağlantını kontrol et.
        </p>
      )}

      {!isLoading && results.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {results.map((result) => (
            <DiscoverRow
              key={resultKey(result)}
              result={result}
              meta={result.year ?? ''}
              added={false}
              addingKey={addingKey}
              onAdd={add}
            />
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

function DiscoverSkeleton() {
  return (
    <div className="mt-4 space-y-2.5">
      <div className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
    </div>
  )
}

function DiscoverRow({
  result,
  meta,
  added,
  addingKey,
  onAdd,
}: {
  result: MovieSearchResult
  meta: string
  added: boolean
  addingKey: string | null
  onAdd: (result: MovieSearchResult) => void
}) {
  const key = resultKey(result)
  const poster = tmdbPosterUrl(result.posterPath)

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none">
      {poster ? (
        <img
          src={poster}
          alt=""
          className="h-16 w-11 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="flex h-16 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
          <Clapperboard size={16} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{result.title}</p>
        <p className="mt-0.5 text-xs text-zinc-400">
          {meta}
          {result.genres.length > 0 &&
            `${meta ? ' · ' : ''}${result.genres.slice(0, 2).join(', ')}`}
        </p>
        {result.tmdbScore && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-500 tabular-nums dark:text-amber-400">
            <Star size={10} fill="currentColor" strokeWidth={0} />
            {result.tmdbScore.toFixed(1)}
          </p>
        )}
      </div>
      {added ? (
        <span
          aria-label="Listende"
          className="rounded-full bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        >
          <Check size={17} strokeWidth={2.4} />
        </span>
      ) : (
        <button
          aria-label={`${result.title} filmini listeye ekle`}
          onClick={() => onAdd(result)}
          disabled={addingKey !== null}
          className="rounded-full bg-indigo-50 p-2 text-indigo-600 transition-colors hover:bg-indigo-100 disabled:opacity-60 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
        >
          {addingKey === key ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Plus size={17} strokeWidth={2.4} />
          )}
        </button>
      )}
    </li>
  )
}
