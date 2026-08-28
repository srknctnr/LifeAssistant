import { ExternalLink, Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import { SkeletonRows } from '@/components/SkeletonRows'
import type { Trip, TripItem } from '@/features/travel/api'
import { useTripItems } from '@/features/travel/hooks'
import { ITEM_ICONS, ITEM_LABELS } from '@/features/travel/trip-item-kinds'
import {
  groupTripItemsByDay,
  tripDayNumber,
} from '@/features/travel/trip-dates'
import { formatClock } from '@/lib/dates'

const dayLabel = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  weekday: 'long',
})

// The trip's notebook: where you sleep, how you travel, what you booked, and
// the undated things you must not forget.
//
// The add/edit sheets deliberately live in TripSheet, not here: Sheet unmounts
// its children when it closes, so a sheet rendered inside the trip sheet would
// be torn down the moment the trip sheet steps aside for it.
export function TripPlan({
  trip,
  onAdd,
  onEdit,
}: {
  trip: Trip
  onAdd: () => void
  onEdit: (item: TripItem) => void
}) {
  const items = useTripItems(trip.id)
  const groups = groupTripItemsByDay(items.data ?? [])
  // "3. gün" only means something inside the trip window
  const dayNumberOf = (iso: string) => tripDayNumber(trip, iso)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight">Plan</p>
        <button
          onClick={onAdd}
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
      ) : groups.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Konaklama, ulaşım, rezervasyon, unutulmayacaklar — hepsi burada
          dursun.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.iso ?? 'undated'}>
              <p className="mb-1.5 flex items-baseline gap-1.5 text-xs font-semibold text-zinc-400">
                {group.iso ? (
                  <>
                    <span className="text-zinc-500 dark:text-zinc-300">
                      {dayLabel.format(new Date(group.iso))}
                    </span>
                    {dayNumberOf(group.iso) && (
                      <span>{dayNumberOf(group.iso)}. gün</span>
                    )}
                  </>
                ) : (
                  <span>Tarihsiz</span>
                )}
              </p>
              <ul className="space-y-1.5">
                <AnimatePresence initial={false}>
                  {group.items.map((item) => (
                    <motion.li
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
                    >
                      <button
                        onClick={() => onEdit(item)}
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
                          {/* the day is already the group's heading, so the
                              row only carries what it adds */}
                          <span className="mt-0.5 block truncate text-xs text-zinc-400">
                            {[
                              item.starts_at
                                ? formatClock(item.starts_at)
                                : ITEM_LABELS[item.kind],
                              item.location,
                              item.confirmation_no,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
