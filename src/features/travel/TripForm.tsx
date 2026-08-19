import { useId, useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import type { Family } from '@/features/family/api'
import { useMemberships } from '@/features/family/hooks'
import type { Trip } from '@/features/travel/api'
import {
  useCreateTrip,
  useDeleteTrip,
  useUpdateTrip,
} from '@/features/travel/hooks'
import { todayISO } from '@/lib/dates'
import { saveErrorMessage } from '@/lib/errors'

const fieldClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20'

const EMOJIS = ['✈️', '🏖️', '🏔️', '🎒', '🚗', '🏛️', '🗺️', '⛺']

interface TripFormProps {
  trip?: Trip
  onDone: () => void
}

export function TripForm({ trip, onDone }: TripFormProps) {
  const { session } = useAuth()
  const memberships = useMemberships()
  const create = useCreateTrip()
  const update = useUpdateTrip()
  const remove = useDeleteTrip()
  const groupId = useId()

  const [title, setTitle] = useState(trip?.title ?? '')
  const [destination, setDestination] = useState(trip?.destination ?? '')
  const [emoji, setEmoji] = useState(trip?.cover_emoji ?? '✈️')
  const [startsOn, setStartsOn] = useState(trip?.starts_on ?? todayISO())
  const [endsOn, setEndsOn] = useState(trip?.ends_on ?? todayISO())
  const [familyId, setFamilyId] = useState(trip?.family_id ?? '')
  const [note, setNote] = useState(trip?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [armed, setArmed] = useState(false)

  const userId = session?.user.id
  const myGroups = (memberships.data ?? [])
    .filter((m) => m.user_id === userId)
    .map((m) => m.families)
    .filter((f): f is Family => f !== null)

  // only the creator may move a trip between groups (pin_trip_owner)
  const canChangeGroup = !trip || trip.user_id === userId
  const isPending = create.isPending || update.isPending || remove.isPending

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Geziye bir ad ver.')
      return
    }
    if (endsOn < startsOn) {
      setError('Dönüş tarihi gidişten önce olamaz.')
      return
    }
    if (!session) return

    const values = {
      title: title.trim(),
      destination: destination.trim() || null,
      cover_emoji: emoji,
      starts_on: startsOn,
      ends_on: endsOn,
      note: note.trim() || null,
      family_id: familyId || null,
    }

    try {
      if (trip) {
        await update.mutateAsync({ id: trip.id, patch: values })
      } else {
        await create.mutateAsync({ user_id: session.user.id, ...values })
      }
      onDone()
    } catch (saveError) {
      setError(saveErrorMessage(saveError))
    }
  }

  async function handleDelete() {
    if (!trip) return
    if (!armed) {
      setArmed(true)
      setTimeout(() => setArmed(false), 3000)
      return
    }
    try {
      await remove.mutateAsync(trip.id)
      onDone()
    } catch (deleteError) {
      setError(saveErrorMessage(deleteError))
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <TextField
        label="Gezi adı"
        required
        autoFocus
        placeholder="Roma, Kapadokya, yaz tatili…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TextField
        label="Nereye? (isteğe bağlı)"
        placeholder="İtalya"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
      />

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Simge
        </span>
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setEmoji(option)}
              aria-pressed={emoji === option}
              aria-label={`Simge ${option}`}
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-colors ${
                emoji === option
                  ? 'bg-indigo-600'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <TextField
        label="Gidiş"
        type="date"
        required
        value={startsOn}
        onChange={(e) => {
          setStartsOn(e.target.value)
          if (endsOn < e.target.value) setEndsOn(e.target.value)
        }}
      />
      <TextField
        label="Dönüş"
        type="date"
        required
        min={startsOn}
        value={endsOn}
        onChange={(e) => setEndsOn(e.target.value)}
      />

      <div className="space-y-1.5">
        <label
          htmlFor={groupId}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Kimlerle?
        </label>
        <select
          id={groupId}
          value={familyId}
          onChange={(e) => setFamilyId(e.target.value)}
          disabled={!canChangeGroup}
          className={fieldClass}
        >
          <option value="">Yalnız ben</option>
          {myGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-400">
          {canChangeGroup
            ? 'Bir grup seçersen gezi grubun olur: herkes görür, birlikte düzenlersiniz, masrafları Ortak Kasa’dan bölüşürsünüz.'
            : 'Grubu yalnızca geziyi kuran kişi değiştirebilir.'}
        </p>
      </div>

      <TextField
        label="Not (isteğe bağlı)"
        placeholder="Uçuş saati, otel adı…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button type="submit" isLoading={isPending} className="w-full">
        Kaydet
      </Button>

      {trip && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          {armed ? 'Emin misin? Tekrar dokun' : 'Geziyi sil'}
        </button>
      )}
      {trip && (
        <p className="text-center text-xs text-zinc-400">
          Gezi silinse de birikimin, bütçe kalemin ve takvim kaydın durur.
        </p>
      )}
    </form>
  )
}
