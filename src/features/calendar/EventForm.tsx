import { AnimatePresence, motion } from 'motion/react'
import { useId, useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { Segmented } from '@/components/Segmented'
import { Switch } from '@/components/Switch'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import type { CalendarEvent, EventKind } from '@/features/calendar/api'
import {
  useCreateEvent,
  useDeleteEvent,
  useUpdateEvent,
} from '@/features/calendar/hooks'
import { FamilyVisibilityField } from '@/features/family/FamilyVisibilityField'
import { useMyShareMode } from '@/features/family/hooks'
import { resolveFamilyVisibility } from '@/features/family/share-utils'
import { useMovies } from '@/features/movies/hooks'
import { filterAndSortMovies } from '@/features/movies/movie-sort'
import { formatClock, todayISO } from '@/lib/dates'
import { isUniqueViolation, saveErrorMessage } from '@/lib/errors'

const fieldClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20'

interface EventFormProps {
  event?: CalendarEvent
  defaultDate?: string
  onDone: () => void
}

export function EventForm({ event, defaultDate, onDone }: EventFormProps) {
  const { session } = useAuth()
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()
  const movies = useMovies()
  const shareMode = useMyShareMode('calendar')
  const movieSelectId = useId()

  const [kind, setKind] = useState<EventKind>(event?.kind ?? 'general')
  const [title, setTitle] = useState(event?.title ?? '')
  const [titleTouched, setTitleTouched] = useState(Boolean(event))
  const [startsOn, setStartsOn] = useState(
    event?.starts_on ?? defaultDate ?? todayISO(),
  )
  const [hasTime, setHasTime] = useState(event?.starts_at != null)
  const [time, setTime] = useState(
    event?.starts_at ? formatClock(event.starts_at) : '20:00',
  )
  const [movieId, setMovieId] = useState(event?.movie_id ?? '')
  const [note, setNote] = useState(event?.note ?? '')
  const [familyVisible, setFamilyVisible] = useState(
    event?.is_family_visible ?? false,
  )
  const [error, setError] = useState<string | null>(null)
  const [armed, setArmed] = useState(false)

  const isPending =
    createEvent.isPending || updateEvent.isPending || deleteEvent.isPending

  // Best-rated candidates first, so the obvious pick is at the top
  const watchlist = filterAndSortMovies(
    (movies.data ?? []).filter(
      (m) => m.status === 'to_watch' || m.id === event?.movie_id,
    ),
    '',
    'external',
  )

  function handleKindChange(next: EventKind) {
    setKind(next)
    if (next === 'movie') {
      if (!titleTouched) setTitle('Film gecesi')
    } else {
      setMovieId('') // the DB check constraint forbids a movie on a general event
    }
  }

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Etkinliğe bir ad ver.')
      return
    }
    if (hasTime && !time) {
      setError('Saati gir ya da "Saat belirt"i kapat.')
      return
    }
    if (!session) return

    const values = {
      kind,
      title: title.trim(),
      starts_on: startsOn,
      starts_at: hasTime ? time : null,
      note: note.trim() || null,
      movie_id: kind === 'movie' ? movieId || null : null,
      is_family_visible: resolveFamilyVisibility(
        shareMode,
        familyVisible,
        event?.is_family_visible,
      ),
    }

    try {
      if (event) {
        await updateEvent.mutateAsync({
          id: event.id,
          patch: values,
          previousMovieId: event.movie_id,
        })
      } else {
        await createEvent.mutateAsync({ user_id: session.user.id, ...values })
      }
      onDone()
    } catch (saveError) {
      setError(
        isUniqueViolation(saveError)
          ? 'Bu film zaten planlı.'
          : saveErrorMessage(saveError),
      )
    }
  }

  async function handleDelete() {
    if (!event) return
    if (!armed) {
      setArmed(true)
      setTimeout(() => setArmed(false), 3000)
      return
    }
    try {
      await deleteEvent.mutateAsync(event)
      onDone()
    } catch (deleteError) {
      setError(saveErrorMessage(deleteError))
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tür
        </span>
        <Segmented<EventKind>
          options={[
            { value: 'general', label: 'Genel' },
            { value: 'movie', label: '🎬 Film gecesi' },
          ]}
          value={kind}
          onChange={handleKindChange}
        />
      </div>

      <TextField
        label="Etkinlik adı"
        required
        placeholder="Anne yemeği, doktor, film gecesi…"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          setTitleTouched(true)
        }}
      />

      <TextField
        label="Tarih"
        type="date"
        required
        value={startsOn}
        onChange={(e) => setStartsOn(e.target.value)}
      />

      <Switch checked={hasTime} onChange={setHasTime} label="Saat belirt" />
      <AnimatePresence initial={false}>
        {hasTime && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            className="overflow-hidden"
          >
            <TextField
              label="Saat"
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {kind === 'movie' && (
        <div className="space-y-1.5">
          <label
            htmlFor={movieSelectId}
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Film
          </label>
          <select
            id={movieSelectId}
            value={movieId}
            onChange={(e) => setMovieId(e.target.value)}
            className={fieldClass}
          >
            <option value="">Henüz seçmedim</option>
            {watchlist.map((movie) => (
              <option key={movie.id} value={movie.id}>
                {movie.title}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-400">
            Seçmezsen Filmler sekmesinde hatırlatırım.
          </p>
        </div>
      )}

      <TextField
        label="Not (isteğe bağlı)"
        placeholder="Nerede, kimlerle…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {shareMode === 'ask' && (
        <FamilyVisibilityField
          value={familyVisible}
          onChange={setFamilyVisible}
        />
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button type="submit" isLoading={isPending} className="w-full">
        Kaydet
      </Button>

      {event && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          {armed ? 'Emin misin? Tekrar dokun' : 'Etkinliği sil'}
        </button>
      )}
    </form>
  )
}
