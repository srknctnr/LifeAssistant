import { useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { Segmented } from '@/components/Segmented'
import { Switch } from '@/components/Switch'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import type { Trip, TripItem, TripItemKind } from '@/features/travel/api'
import {
  useCreateTripItem,
  useDeleteTripItem,
  useUpdateTripItem,
} from '@/features/travel/hooks'
import { ITEM_LABELS } from '@/features/travel/trip-item-kinds'
import { formatClock } from '@/lib/dates'
import { saveErrorMessage } from '@/lib/errors'

interface TripItemFormProps {
  trip: Trip
  item?: TripItem
  onDone: () => void
}

export function TripItemForm({ trip, item, onDone }: TripItemFormProps) {
  const { session } = useAuth()
  const create = useCreateTripItem(trip.id)
  const update = useUpdateTripItem(trip.id)
  const remove = useDeleteTripItem(trip.id)

  const [kind, setKind] = useState<TripItemKind>(item?.kind ?? 'stay')
  const [title, setTitle] = useState(item?.title ?? '')
  const [hasDate, setHasDate] = useState(item?.starts_on != null)
  const [startsOn, setStartsOn] = useState(item?.starts_on ?? trip.starts_on)
  const [hasTime, setHasTime] = useState(item?.starts_at != null)
  const [time, setTime] = useState(
    item?.starts_at ? formatClock(item.starts_at) : '09:00',
  )
  const [location, setLocation] = useState(item?.location ?? '')
  const [confirmation, setConfirmation] = useState(item?.confirmation_no ?? '')
  const [link, setLink] = useState(item?.link ?? '')
  const [note, setNote] = useState(item?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [armed, setArmed] = useState(false)

  const isPending = create.isPending || update.isPending || remove.isPending

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Bir ad ver.')
      return
    }
    if (!session) return

    const values = {
      kind,
      title: title.trim(),
      // a time with no day would sort nowhere, so the DB refuses it too
      starts_on: hasDate ? startsOn : null,
      starts_at: hasDate && hasTime ? time : null,
      location: location.trim() || null,
      confirmation_no: confirmation.trim() || null,
      link: link.trim() || null,
      note: note.trim() || null,
    }

    try {
      if (item) {
        await update.mutateAsync({ id: item.id, patch: values })
      } else {
        await create.mutateAsync({
          trip_id: trip.id,
          user_id: session.user.id,
          ...values,
        })
      }
      onDone()
    } catch (saveError) {
      setError(saveErrorMessage(saveError))
    }
  }

  async function handleDelete() {
    if (!item) return
    if (!armed) {
      setArmed(true)
      setTimeout(() => setArmed(false), 3000)
      return
    }
    try {
      await remove.mutateAsync(item.id)
      onDone()
    } catch (deleteError) {
      setError(saveErrorMessage(deleteError))
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Ne kaydediyorsun?
        </span>
        <Segmented<TripItemKind>
          options={[
            { value: 'stay', label: '🛏️' },
            { value: 'transport', label: '🚆' },
            { value: 'activity', label: '🎟️' },
            { value: 'note', label: '📝' },
          ]}
          value={kind}
          onChange={setKind}
        />
        <p className="text-xs text-zinc-400">{ITEM_LABELS[kind]}</p>
      </div>

      <TextField
        label="Ad"
        required
        autoFocus
        placeholder={
          kind === 'stay'
            ? 'Hotel Roma'
            : kind === 'transport'
              ? 'TK1863 İstanbul → Roma'
              : kind === 'activity'
                ? 'Kolezyum turu'
                : 'Pasaportu yenile'
        }
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <Switch checked={hasDate} onChange={setHasDate} label="Tarihi var" />
      {hasDate && (
        <>
          <TextField
            label="Tarih"
            type="date"
            required
            value={startsOn}
            onChange={(e) => setStartsOn(e.target.value)}
          />
          <Switch checked={hasTime} onChange={setHasTime} label="Saati var" />
          {hasTime && (
            <TextField
              label="Saat"
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          )}
        </>
      )}

      <TextField
        label="Yer (isteğe bağlı)"
        placeholder="Via del Corso 12"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <TextField
        label="Rezervasyon no (isteğe bağlı)"
        placeholder="ABC123"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
      />
      <TextField
        label="Bağlantı (isteğe bağlı)"
        type="url"
        placeholder="https://…"
        value={link}
        onChange={(e) => setLink(e.target.value)}
      />
      <TextField
        label="Not (isteğe bağlı)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button type="submit" isLoading={isPending} className="w-full">
        Kaydet
      </Button>

      {item && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          {armed ? 'Emin misin? Tekrar dokun' : 'Kaydı sil'}
        </button>
      )}
    </form>
  )
}
