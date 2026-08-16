import { useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import { useEvents } from '@/features/calendar/hooks'
import { FamilyVisibilityField } from '@/features/family/FamilyVisibilityField'
import { useMyShareMode } from '@/features/family/hooks'
import { resolveFamilyVisibility } from '@/features/family/share-utils'
import type { Movie } from '@/features/movies/api'
import { useCreateMovie, useUpdateMovie } from '@/features/movies/hooks'
import { parseAmountInput } from '@/lib/money'

interface MovieFormProps {
  movie?: Movie
  onDone: () => void
}

export function MovieForm({ movie, onDone }: MovieFormProps) {
  const { session } = useAuth()
  const createMovie = useCreateMovie()
  const updateMovie = useUpdateMovie()
  const [title, setTitle] = useState(movie?.title ?? '')
  const [plannedFor, setPlannedFor] = useState(movie?.planned_for ?? '')
  const [externalRating, setExternalRating] = useState(
    movie?.external_rating != null ? String(movie.external_rating) : '',
  )
  const shareMode = useMyShareMode('movies')
  const [familyVisible, setFamilyVisible] = useState(
    movie?.is_family_visible ?? false,
  )
  const [error, setError] = useState<string | null>(null)

  // While a calendar event owns this movie's film günü, the event is the
  // single writer of planned_for — the field here goes read-only
  const events = useEvents()
  const linkedEvent = movie
    ? (events.data ?? []).find((e) => e.movie_id === movie.id)
    : undefined

  const isPending = createMovie.isPending || updateMovie.isPending

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    let parsedExternal: number | null = null
    if (externalRating.trim()) {
      parsedExternal = parseAmountInput(externalRating)
      if (parsedExternal === null || parsedExternal > 10) {
        setError('Puan 0 ile 10 arasında olmalı (örn. 7,8).')
        return
      }
    }
    if (!session) return

    const values = {
      title: title.trim(),
      external_rating: parsedExternal,
      is_family_visible: resolveFamilyVisibility(
        shareMode,
        familyVisible,
        movie?.is_family_visible,
      ),
      // omitted while an event owns the date, so stale state cannot overwrite it
      ...(linkedEvent ? {} : { planned_for: plannedFor || null }),
    }

    try {
      if (movie) {
        await updateMovie.mutateAsync({ id: movie.id, patch: values })
      } else {
        await createMovie.mutateAsync({ user_id: session.user.id, ...values })
      }
      onDone()
    } catch {
      setError('Kaydedilemedi. Bağlantını kontrol edip tekrar dene.')
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <TextField
        label="Film adı"
        required
        placeholder="Esaretin Bedeli"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TextField
        label="Film günü (isteğe bağlı)"
        type="date"
        disabled={Boolean(linkedEvent)}
        value={plannedFor}
        onChange={(e) => setPlannedFor(e.target.value)}
      />
      {linkedEvent && (
        <p className="-mt-2 text-xs text-zinc-400">
          Film günü takvimdeki etkinlikten geliyor.
        </p>
      )}
      <TextField
        label="IMDb/TMDB puanı (isteğe bağlı)"
        inputMode="decimal"
        placeholder="7,8"
        value={externalRating}
        onChange={(e) => setExternalRating(e.target.value)}
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
    </form>
  )
}
