import { Clapperboard } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'

import { Sheet } from '@/components/Sheet'
import { useEvents, useUpdateEvent } from '@/features/calendar/hooks'
import { useMovies } from '@/features/movies/hooks'
import { filterAndSortMovies } from '@/features/movies/movie-sort'
import { tmdbPosterUrl } from '@/features/movies/tmdb'
import { todayISO } from '@/lib/dates'

const bandDayLabel = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  weekday: 'long',
})

// A movie-kind event with no film picked yet is the whole feature: the
// calendar asks the question, this band answers it.
export function MovieNightBanner() {
  const events = useEvents()
  const movies = useMovies()
  const updateEvent = useUpdateEvent()
  const [pickOpen, setPickOpen] = useState(false)

  const next = (events.data ?? [])
    .filter(
      (e) =>
        e.kind === 'movie' && e.movie_id === null && e.starts_on >= todayISO(),
    )
    .sort((a, b) => a.starts_on.localeCompare(b.starts_on))[0]

  if (!next) return null

  const watchlist = filterAndSortMovies(
    (movies.data ?? []).filter((m) => m.status === 'to_watch'),
    '',
    'external',
  )

  function pick(movieId: string, title: string) {
    if (!next) return
    updateEvent.mutate({
      id: next.id,
      patch: { movie_id: movieId, title: `Film gecesi: ${title}` },
      previousMovieId: null,
    })
    setPickOpen(false)
  }

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setPickOpen(true)}
        className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-indigo-50 p-4 text-left transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20"
      >
        <span className="shrink-0 rounded-xl bg-white/70 p-2.5 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
          <Clapperboard size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            🎬 {bandDayLabel.format(new Date(next.starts_on))} film gecen var
          </span>
          <span className="mt-0.5 block text-xs text-indigo-600/80 dark:text-indigo-400/80">
            Listenden seç, film günü otomatik ayarlansın.
          </span>
        </span>
      </motion.button>

      <Sheet
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        title="Film gecesine film seç"
      >
        {watchlist.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            İzleme listen boş. Önce bir film ekle, sonra buradan seç.
          </p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {watchlist.map((movie) => {
              const poster = tmdbPosterUrl(movie.poster_path)
              return (
                <li key={movie.id}>
                  <button
                    onClick={() => pick(movie.id, movie.title)}
                    disabled={updateEvent.isPending}
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
                      {movie.genres.length > 0 && (
                        <span className="mt-0.5 block truncate text-xs text-zinc-400">
                          {movie.genres.slice(0, 2).join(', ')}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Sheet>
    </>
  )
}
