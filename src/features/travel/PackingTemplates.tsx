import { useState } from 'react'

import type { PackingDraft, Trip } from '@/features/travel/api'
import {
  useAddPackingItems,
  useAllPackingItems,
  usePackingItems,
  useTrips,
} from '@/features/travel/hooks'
import {
  mergePackingTitles,
  packingSources,
  PACKING_TEMPLATES,
} from '@/features/travel/packing'
import { formatDate } from '@/lib/dates'
import { saveErrorMessage } from '@/lib/errors'

/**
 * Ready-made lists, so a packing list does not start as twenty things to type.
 *
 * Plain data rather than a table: a saved-template table would be a third
 * surface to secure, and what it buys over these five is a personalised list —
 * which the trip's own list already is, once copying between trips lands.
 */
export function PackingTemplates({
  trip,
  onDone,
}: {
  trip: Trip
  onDone: () => void
}) {
  const items = usePackingItems(trip.id)
  const pool = useAllPackingItems()
  const trips = useTrips()
  const add = useAddPackingItems()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const existing = (items.data ?? []).map((i) => i.title)
  const sources = packingSources(pool.data ?? [], trips.data ?? [], trip.id)

  async function apply(key: string, drafts: PackingDraft[]) {
    setError(null)
    setBusy(key)
    // filtered here so the button can say what it actually did; the unique
    // (trip_id, title_key) is still the backstop for two devices at once
    const fresh = mergePackingTitles(
      existing,
      drafts.map((d) => d.title),
    )
    if (fresh.length === 0) {
      setBusy(null)
      setError('Bu listedeki her şey zaten bavulda.')
      return
    }
    // keep each row's own category and ortak flag; only the ticks stay behind,
    // because last year's suitcase is not packed for this trip
    const byTitle = new Map(drafts.map((d) => [d.title, d]))
    try {
      await add.mutateAsync({
        tripId: trip.id,
        items: fresh.map((title) => byTitle.get(title) ?? { title }),
      })
      onDone()
    } catch (applyError) {
      setError(saveErrorMessage(applyError))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-2.5">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Listeyi bavuluna ekler; zaten yazdıkların tekrarlanmaz.
      </p>

      {PACKING_TEMPLATES.map((template) => {
        const fresh = mergePackingTitles(existing, template.titles)
        return (
          <button
            key={template.key}
            onClick={() =>
              apply(
                template.key,
                template.titles.map((title) => ({ title })),
              )
            }
            disabled={busy !== null}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-sm shadow-zinc-200/60 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:bg-zinc-900 dark:shadow-none dark:hover:bg-zinc-800"
          >
            <span className="text-xl">{template.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">
                {template.label}
              </span>
              <span className="mt-0.5 block truncate text-xs text-zinc-400">
                {template.titles.slice(0, 4).join(', ')}…
              </span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-sky-600 tabular-nums dark:text-sky-400">
              {fresh.length > 0 ? `+${fresh.length}` : 'ekli'}
            </span>
          </button>
        )
      })}

      {sources.length > 0 && (
        <>
          <p className="pt-2 text-sm font-semibold tracking-tight">
            Önceki gezilerinden
          </p>
          <p className="-mt-1 text-xs text-zinc-400">
            Eşyalar gelir, tikler gelmez — geçen yılın bavulu bu gezide hazır
            değil.
          </p>
          {sources.map(({ trip: source, count }) => {
            const drafts = (pool.data ?? [])
              .filter((i) => i.trip_id === source.id)
              .map((i) => ({
                title: i.title,
                category: i.category,
                isGroupItem: i.is_group_item,
              }))
            const fresh = mergePackingTitles(
              existing,
              drafts.map((d) => d.title),
            )
            return (
              <button
                key={source.id}
                onClick={() => apply(source.id, drafts)}
                disabled={busy !== null}
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-sm shadow-zinc-200/60 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:bg-zinc-900 dark:shadow-none dark:hover:bg-zinc-800"
              >
                <span className="text-xl">{source.cover_emoji ?? '✈️'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {source.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-400">
                    {formatDate(source.starts_on)} · {count} eşya
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-sky-600 tabular-nums dark:text-sky-400">
                  {fresh.length > 0 ? `+${fresh.length}` : 'ekli'}
                </span>
              </button>
            )
          })}
        </>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
