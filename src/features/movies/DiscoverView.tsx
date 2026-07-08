import { useQuery } from '@tanstack/react-query'
import { Check, Clapperboard, Loader2, Plus, Star } from 'lucide-react'
import { useState } from 'react'

import { Segmented } from '@/components/Segmented'
import { useMovies } from '@/features/movies/hooks'
import {
  discoverMovies,
  isTmdbConfigured,
  tmdbPosterUrl,
  type DiscoverFeed,
} from '@/features/movies/tmdb'
import { resultKey, useAddFromSearch } from '@/features/movies/useAddFromSearch'
import { formatDate } from '@/lib/dates'

const feedOptions: { value: DiscoverFeed; label: string }[] = [
  { value: 'now_playing', label: 'Vizyonda' },
  { value: 'upcoming', label: 'Yakında' },
]

export function DiscoverView() {
  const [feed, setFeed] = useState<DiscoverFeed>('now_playing')
  const movies = useMovies()
  const { add, addingKey, error } = useAddFromSearch()

  const results = useQuery({
    queryKey: ['tmdb-discover', feed],
    queryFn: () => discoverMovies(feed),
    enabled: isTmdbConfigured,
    staleTime: 5 * 60_000,
  })

  if (!isTmdbConfigured) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 p-5 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <p className="font-semibold text-zinc-700 dark:text-zinc-200">
          Keşfet için TMDB anahtarı gerekiyor
        </p>
        <p className="mt-1.5">
          Vizyondaki ve yakında çıkacak filmler TMDB&apos;den geliyor.
          themoviedb.org&apos;dan ücretsiz &quot;API Read Access Token&quot;
          alındığında burası canlanacak; Türkçe film araması da aynı anahtarla
          açılacak.
        </p>
      </div>
    )
  }

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

      {results.isPending && (
        <div className="mt-4 space-y-2.5">
          <div className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
      )}

      {results.isError && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          Liste yüklenemedi. TMDB anahtarını ve bağlantını kontrol et.
        </p>
      )}

      {results.data && (
        <ul className="mt-4 space-y-2.5">
          {results.data.map((result) => {
            const key = resultKey(result)
            const poster = tmdbPosterUrl(result.posterPath)
            const alreadyAdded =
              result.tmdbId !== null && myTmdbIds.has(result.tmdbId)
            return (
              <li
                key={key}
                className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
              >
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
                    {feed === 'upcoming' && result.releaseDate
                      ? `Çıkış: ${formatDate(result.releaseDate)}`
                      : result.year}
                    {result.genres.length > 0 &&
                      ` · ${result.genres.slice(0, 2).join(', ')}`}
                  </p>
                  {result.tmdbScore && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-500 tabular-nums dark:text-amber-400">
                      <Star size={10} fill="currentColor" strokeWidth={0} />
                      {result.tmdbScore.toFixed(1)}
                    </p>
                  )}
                </div>
                {alreadyAdded ? (
                  <span
                    aria-label="Listende"
                    className="rounded-full bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  >
                    <Check size={17} strokeWidth={2.4} />
                  </span>
                ) : (
                  <button
                    aria-label={`${result.title} filmini listeye ekle`}
                    onClick={() => add(result)}
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
          })}
        </ul>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
