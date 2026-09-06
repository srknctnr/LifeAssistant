import { Check, Plus, Sparkles, Trash2, Users } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type FormEvent } from 'react'

import { SkeletonRows } from '@/components/SkeletonRows'
import { useAuth } from '@/features/auth/useAuth'
import type { Trip } from '@/features/travel/api'
import {
  useAddPackingItems,
  useDeletePackingItem,
  usePackingItems,
  useSetPacked,
  useUpdatePackingItem,
} from '@/features/travel/hooks'
import {
  buildPackingView,
  groupPackingByCategory,
  packingProgress,
  type PackingRow,
} from '@/features/travel/packing'
import { saveErrorMessage } from '@/lib/errors'

/**
 * The suitcase.
 *
 * One list for the trip, one tick per person. "Pasaport" is four passports —
 * your box is never closed by somebody else's hands — while "çadır" is one
 * object the group brings once, so a single tick answers for everyone. That
 * distinction is a flag on the item, not four copies of it.
 */
export function PackingList({
  trip,
  onTemplates,
}: {
  trip: Trip
  onTemplates: () => void
}) {
  const { session } = useAuth()
  const userId = session?.user.id
  const items = usePackingItems(trip.id)
  const add = useAddPackingItems(trip.id)
  const setPacked = useSetPacked(trip.id, userId)
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  const rows = buildPackingView(items.data ?? [], userId)
  const progress = packingProgress(rows)
  const groups = groupPackingByCategory(rows)
  const isGroupTrip = trip.family_id !== null

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    setError(null)
    try {
      await add.mutateAsync({ tripId: trip.id, titles: [trimmed] })
      // the field keeps focus and empties: twenty short things in a row is the
      // whole interaction
      setTitle('')
    } catch (addError) {
      setError(saveErrorMessage(addError))
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
          🧳 Bavul
          {progress.total > 0 && (
            <span className="text-xs font-medium text-zinc-400 tabular-nums">
              {progress.done}/{progress.total}
            </span>
          )}
        </p>
        <button
          onClick={onTemplates}
          className="flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:hover:bg-sky-500/20"
        >
          <Sparkles size={13} /> Hazır liste
        </button>
      </div>

      {progress.total > 0 && (
        <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress.ratio * 100}%` }}
            transition={{ type: 'spring', stiffness: 90, damping: 22 }}
          />
        </div>
      )}

      {items.isPending ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <p className="mb-2.5 text-sm text-zinc-400">
          {isGroupTrip
            ? 'Herkes kendi tikini atar. Çadır gibi ortak bir şeyi işaretleyince herkes için kapanır.'
            : 'Yanına alacaklarını yaz; tik atınca üstü çizilir.'}
        </p>
      ) : (
        <div className="mb-2.5 space-y-3">
          {groups.map((group) => (
            <div key={group.category ?? '__loose__'}>
              {group.category && (
                <p className="mb-1 text-xs font-medium text-zinc-400">
                  {group.category}
                </p>
              )}
              <ul className="space-y-1">
                <AnimatePresence initial={false}>
                  {group.rows.map((row) => (
                    <PackingRowView
                      key={row.item.id}
                      row={row}
                      tripId={trip.id}
                      isGroupTrip={isGroupTrip}
                      userId={userId}
                      onToggle={() =>
                        setPacked.mutate({
                          itemId: row.item.id,
                          tripId: trip.id,
                          packed: !row.mineChecked,
                        })
                      }
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Eşya ekle…"
          aria-label="Eşya ekle"
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-sky-500 dark:focus:ring-sky-500/20"
        />
        <button
          type="submit"
          disabled={!title.trim() || add.isPending}
          aria-label="Ekle"
          className="shrink-0 rounded-xl bg-sky-600 px-3.5 text-white transition-colors hover:bg-sky-700 disabled:opacity-40"
        >
          <Plus size={18} />
        </button>
      </form>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

function PackingRowView({
  row,
  tripId,
  isGroupTrip,
  userId,
  onToggle,
}: {
  row: PackingRow
  tripId: string
  isGroupTrip: boolean
  userId: string | undefined
  onToggle: () => void
}) {
  const update = useUpdatePackingItem(tripId)
  const remove = useDeletePackingItem(tripId)
  const [armed, setArmed] = useState(false)

  const { item, done, mineChecked, checkedBy } = row
  const others = checkedBy.filter((id) => id !== userId).length

  function handleDelete() {
    if (!armed) {
      setArmed(true)
      setTimeout(() => setArmed(false), 3000)
      return
    }
    remove.mutate(item.id)
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
    >
      <button
        onClick={onToggle}
        aria-label={`${item.title}, ${mineChecked ? 'işareti kaldır' : 'hazır işaretle'}`}
        aria-pressed={mineChecked}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
          done
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-zinc-300 text-transparent hover:border-emerald-400 dark:border-zinc-600'
        }`}
      >
        <Check size={14} strokeWidth={3} />
      </button>

      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm ${
            done ? 'text-zinc-400 line-through' : ''
          }`}
        >
          {item.title}
        </span>
        {isGroupTrip && (item.is_group_item || others > 0) && (
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
            {item.is_group_item && (
              <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-1.5 py-0.5 font-medium dark:bg-zinc-800">
                <Users size={10} /> Ortak
              </span>
            )}
            {/* names would need the group's member list, which this sheet does
                not load; the count is the part that changes behaviour */}
            {others > 0 &&
              (item.is_group_item
                ? mineChecked
                  ? 'sen ve 1 kişi aldı'
                  : `${others} kişi aldı`
                : `${others} kişi hazırladı`)}
          </span>
        )}
      </span>

      {isGroupTrip && (
        <button
          onClick={() =>
            update.mutate({
              id: item.id,
              patch: { is_group_item: !item.is_group_item },
            })
          }
          aria-label={
            item.is_group_item
              ? `${item.title}, herkes kendi alsın`
              : `${item.title}, ortak eşya yap`
          }
          className={`shrink-0 rounded-full p-1.5 transition-colors ${
            item.is_group_item
              ? 'text-sky-600 dark:text-sky-400'
              : 'text-zinc-300 hover:text-zinc-500 dark:text-zinc-600'
          }`}
        >
          <Users size={14} />
        </button>
      )}

      <button
        onClick={handleDelete}
        disabled={remove.isPending}
        aria-label={armed ? 'Silmek için tekrar dokun' : `${item.title}, sil`}
        className={`shrink-0 rounded-full p-1.5 transition-colors ${
          armed
            ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
            : 'text-zinc-300 hover:text-red-500 dark:text-zinc-600'
        }`}
      >
        <Trash2 size={14} />
      </button>
    </motion.li>
  )
}
