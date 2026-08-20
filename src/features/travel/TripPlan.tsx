import { ExternalLink, Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { Sheet } from '@/components/Sheet'
import { SkeletonRows } from '@/components/SkeletonRows'
import type { Trip, TripItem } from '@/features/travel/api'
import { useTripItems } from '@/features/travel/hooks'
import { TripItemForm } from '@/features/travel/TripItemForm'
import { ITEM_ICONS, ITEM_LABELS } from '@/features/travel/trip-item-kinds'
import { sortTripItems } from '@/features/travel/trip-dates'
import { formatClock, formatDate } from '@/lib/dates'

// The trip's notebook: where you sleep, how you travel, what you booked, and
// the undated things you must not forget.
export function TripPlan({
  trip,
  onSheetChange,
}: {
  trip: Trip
  // the parent sheet steps aside while a child sheet is open
  onSheetChange: (open: boolean) => void
}) {
  const items = useTripItems(trip.id)
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<TripItem | null>(null)

  function setAdd(open: boolean) {
    setAddOpen(open)
    onSheetChange(open)
  }
  function setEdit(item: TripItem | null) {
    setEditItem(item)
    onSheetChange(item !== null)
  }

  const ordered = sortTripItems(items.data ?? [])

  return (
    <>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold tracking-tight">Plan</p>
          <button
            onClick={() => setAdd(true)}
            aria-label="Plana ekle"
            className="rounded-full bg-indigo-50 p-1.5 text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
          >
            <Plus size={15} strokeWidth={2.4} />
          </button>
        </div>

        {items.isPending ? (
          <SkeletonRows count={1} />
        ) : items.isError ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            Plan yüklenemedi.
          </p>
        ) : ordered.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Konaklama, ulaşım, rezervasyon, unutulmayacaklar — hepsi burada
            dursun.
          </p>
        ) : (
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {ordered.map((item) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
                >
                  <button
                    onClick={() => setEdit(item)}
                    aria-label={`${item.title}, düzenle`}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <span
                      aria-hidden
                      className="shrink-0 text-base"
                      title={ITEM_LABELS[item.kind]}
                    >
                      {ITEM_ICONS[item.kind]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-zinc-400">
                        {item.starts_on
                          ? `${formatDate(item.starts_on)}${
                              item.starts_at
                                ? ` · ${formatClock(item.starts_at)}`
                                : ''
                            }`
                          : ITEM_LABELS[item.kind]}
                        {item.location ? ` · ${item.location}` : ''}
                        {item.confirmation_no
                          ? ` · ${item.confirmation_no}`
                          : ''}
                      </span>
                    </span>
                  </button>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${item.title} bağlantısını aç`}
                      className="shrink-0 rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:text-zinc-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <Sheet open={addOpen} onClose={() => setAdd(false)} title="Plana ekle">
        <TripItemForm trip={trip} onDone={() => setAdd(false)} />
      </Sheet>

      <Sheet
        open={editItem !== null}
        onClose={() => setEdit(null)}
        title="Kaydı düzenle"
      >
        {editItem && (
          <TripItemForm
            trip={trip}
            item={editItem}
            onDone={() => setEdit(null)}
          />
        )}
      </Sheet>
    </>
  )
}
