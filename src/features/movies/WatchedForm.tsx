import { useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { StarRating } from '@/components/StarRating'
import { TextField } from '@/components/TextField'
import type { Movie } from '@/features/movies/api'
import { useUpdateMovie } from '@/features/movies/hooks'
import { todayISO } from '@/lib/dates'

interface WatchedFormProps {
  movie: Movie
  onDone: () => void
}

export function WatchedForm({ movie, onDone }: WatchedFormProps) {
  const updateMovie = useUpdateMovie()
  const [rating, setRating] = useState(movie.rating ?? 0)
  const [watchedOn, setWatchedOn] = useState(movie.watched_on ?? todayISO())
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (rating < 1) {
      setError('Filme bir puan ver (1-5 yıldız).')
      return
    }

    try {
      await updateMovie.mutateAsync({
        id: movie.id,
        patch: { status: 'watched', rating, watched_on: watchedOn },
      })
      onDone()
    } catch {
      setError('Kaydedilemedi. Tekrar dener misin?')
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800">
        <p className="font-medium">{movie.title}</p>
      </div>

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Puanın
        </span>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <TextField
        label="İzleme tarihi"
        type="date"
        required
        value={watchedOn}
        onChange={(e) => setWatchedOn(e.target.value)}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button
        type="submit"
        isLoading={updateMovie.isPending}
        className="w-full"
      >
        Kaydet
      </Button>
    </form>
  )
}
