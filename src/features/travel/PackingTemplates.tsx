import { useState } from 'react'

import type { Trip } from '@/features/travel/api'
import { useAddPackingItems, usePackingItems } from '@/features/travel/hooks'
import {
  mergePackingTitles,
  PACKING_TEMPLATES,
} from '@/features/travel/packing'
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
  const add = useAddPackingItems(trip.id)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const existing = (items.data ?? []).map((i) => i.title)

  async function apply(key: string, titles: string[]) {
    setError(null)
    setBusy(key)
    // filtered here so the button can say what it actually did; the unique
    // (trip_id, title_key) is still the backstop for two devices at once
    const fresh = mergePackingTitles(existing, titles)
    if (fresh.length === 0) {
      setBusy(null)
      setError('Bu listedeki her şey zaten bavulda.')
      return
    }
    try {
      await add.mutateAsync({ tripId: trip.id, titles: fresh })
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
            onClick={() => apply(template.key, template.titles)}
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

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
