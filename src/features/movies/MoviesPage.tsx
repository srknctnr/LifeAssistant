import {
  Check,
  Clapperboard,
  RotateCcw,
  Search,
  Star,
  Trash2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { EmptyState } from '@/components/EmptyState'
import { PageTransition } from '@/components/PageTransition'
import { Section } from '@/components/Section'
import { Segmented } from '@/components/Segmented'
import { Sheet } from '@/components/Sheet'
import { SkeletonRows } from '@/components/SkeletonRows'
import { StarRating } from '@/components/StarRating'
import type { Movie } from '@/features/movies/api'
import {
  useDeleteMovie,
  useMovies,
  useUpdateMovie,
} from '@/features/movies/hooks'
import {
  filterAndSortMovies,
  SORT_LABELS,
  type MovieSort,
} from '@/features/movies/movie-sort'
import { AddMovieSearch } from '@/features/movies/AddMovieSearch'
import { MovieForm } from '@/features/movies/MovieForm'
import { tmdbPosterUrl } from '@/features/movies/tmdb'
import { WatchedForm } from '@/features/movies/WatchedForm'
import { formatDate } from '@/lib/dates'

const sortOptions = (Object.keys(SORT_LABELS) as MovieSort[]).map((value) => ({
  value,
  label: SORT_LABELS[value],
}))

export function MoviesPage() {
  const movies = useMovies()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<MovieSort>('added')
  const [addOpen, setAddOpen] = useState(false)
  const [editMovie, setEditMovie] = useState<Movie | null>(null)
  const [watchMovie, setWatchMovie] = useState<Movie | null>(null)

  const all = movies.data ?? []
  const toWatch = filterAndSortMovies(
    all.filter((m) => m.status === 'to_watch'),
    search,
    sort,
  )
  const watched = filterAndSortMovies(
    all.filter((m) => m.status === 'watched'),
    search,
    sort,
  )

  return (
    <PageTransition>
      <h1 className="text-2xl font-semibold tracking-tight">Filmler</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        İzleme listen ve puanların. Vizyon taraması yakında geliyor.
      </p>

      <div className="relative mt-4">
        <Search
          size={16}
          className="absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Film ara…"
          aria-label="Film ara"
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pr-4 pl-10 text-sm text-zinc-900 transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
        />
      </div>
      <div className="mt-3">
        <Segmented<MovieSort>
          options={sortOptions}
          value={sort}
          onChange={setSort}
        />
      </div>

      <Section title="İzleme listesi" onAdd={() => setAddOpen(true)}>
        {movies.isPending ? (
          <SkeletonRows />
        ) : toWatch.length === 0 ? (
          <EmptyState
            text={
              search
                ? 'Aramana uyan film yok.'
                : 'Listen boş. İzlemek istediğin ilk filmi ekle.'
            }
          />
        ) : (
          <ul className="space-y-2.5">
            <AnimatePresence initial={false}>
              {toWatch.map((movie) => (
                <WatchlistRow
                  key={movie.id}
                  movie={movie}
                  onEdit={() => setEditMovie(movie)}
                  onWatched={() => setWatchMovie(movie)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Section>

      {(watched.length > 0 ||
        (search && all.some((m) => m.status === 'watched'))) && (
        <Section title="İzlediklerim">
          {watched.length === 0 ? (
            <EmptyState text="Aramana uyan film yok." />
          ) : (
            <ul className="space-y-2.5">
              <AnimatePresence initial={false}>
                {watched.map((movie) => (
                  <WatchedRow
                    key={movie.id}
                    movie={movie}
                    onRate={() => setWatchMovie(movie)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Section>
      )}

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Film ekle">
        <AddMovieSearch onDone={() => setAddOpen(false)} />
      </Sheet>

      <Sheet
        open={editMovie !== null}
        onClose={() => setEditMovie(null)}
        title="Filmi düzenle"
      >
        {editMovie && (
          <MovieForm movie={editMovie} onDone={() => setEditMovie(null)} />
        )}
      </Sheet>

      <Sheet
        open={watchMovie !== null}
        onClose={() => setWatchMovie(null)}
        title="Nasıldı?"
      >
        {watchMovie && (
          <WatchedForm movie={watchMovie} onDone={() => setWatchMovie(null)} />
        )}
      </Sheet>
    </PageTransition>
  )
}

function ExternalBadge({
  rating,
  source,
}: {
  rating: number | null
  source: 'imdb' | 'tmdb' | null
}) {
  if (rating == null) return null
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600 tabular-nums dark:bg-amber-500/10 dark:text-amber-400">
      {source === 'imdb' ? (
        <span className="text-[9px] font-black tracking-tight">IMDb</span>
      ) : (
        <Star size={11} fill="currentColor" strokeWidth={0} />
      )}
      {rating.toLocaleString('tr-TR', { minimumFractionDigits: 1 })}
    </span>
  )
}

function MoviePoster({
  posterPath,
  tone,
}: {
  posterPath: string | null
  tone: 'indigo' | 'emerald'
}) {
  const poster = tmdbPosterUrl(posterPath)
  if (poster) {
    return (
      <img
        src={poster}
        alt=""
        className="h-14 w-10 shrink-0 rounded-lg object-cover"
      />
    )
  }
  return (
    <span
      className={
        tone === 'indigo'
          ? 'rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
          : 'rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
      }
    >
      <Clapperboard size={18} />
    </span>
  )
}

function WatchlistRow({
  movie,
  onEdit,
  onWatched,
}: {
  movie: Movie
  onEdit: () => void
  onWatched: () => void
}) {
  const deleteMovie = useDeleteMovie()

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
    >
      <MoviePoster posterPath={movie.poster_path} tone="indigo" />
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className="truncate font-medium">{movie.title}</p>
        <p className="mt-0.5 text-xs text-zinc-400">
          {movie.planned_for
            ? `Film günü · ${formatDate(movie.planned_for)}`
            : movie.release_date
              ? movie.release_date.slice(0, 4)
              : 'İzlenecek'}
        </p>
      </button>
      <ExternalBadge
        rating={movie.external_rating}
        source={movie.external_source}
      />
      <button
        aria-label={`${movie.title} filmini izledim`}
        onClick={onWatched}
        className="rounded-full p-2 text-zinc-300 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:text-zinc-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
      >
        <Check size={17} strokeWidth={2.4} />
      </button>
      <button
        aria-label={`${movie.title} filmini sil`}
        onClick={() => deleteMovie.mutate(movie.id)}
        className="-ml-1 rounded-full p-2 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
      >
        <Trash2 size={15} />
      </button>
    </motion.li>
  )
}

function WatchedRow({ movie, onRate }: { movie: Movie; onRate: () => void }) {
  const deleteMovie = useDeleteMovie()
  const updateMovie = useUpdateMovie()

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
    >
      <MoviePoster posterPath={movie.poster_path} tone="emerald" />
      <button onClick={onRate} className="min-w-0 flex-1 text-left">
        <p className="truncate font-medium">{movie.title}</p>
        <div className="mt-1 flex items-center gap-2">
          <StarRating value={movie.rating ?? 0} size={13} />
          {movie.watched_on && (
            <span className="text-xs text-zinc-400">
              {formatDate(movie.watched_on)}
            </span>
          )}
        </div>
      </button>
      <ExternalBadge
        rating={movie.external_rating}
        source={movie.external_source}
      />
      <button
        aria-label={`${movie.title} filmini listeye geri al`}
        onClick={() =>
          updateMovie.mutate({
            id: movie.id,
            patch: { status: 'to_watch', watched_on: null },
          })
        }
        className="rounded-full p-2 text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-500 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-400"
      >
        <RotateCcw size={15} />
      </button>
      <button
        aria-label={`${movie.title} filmini sil`}
        onClick={() => deleteMovie.mutate(movie.id)}
        className="-ml-1 rounded-full p-2 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
      >
        <Trash2 size={15} />
      </button>
    </motion.li>
  )
}
