import { Users } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { EmptyState } from '@/components/EmptyState'
import { Section } from '@/components/Section'
import { Sheet } from '@/components/Sheet'
import { SkeletonRows } from '@/components/SkeletonRows'
import type { Family } from '@/features/family/api'
import { useMemberships } from '@/features/family/hooks'
import type { Trip } from '@/features/travel/api'
import { useTrips } from '@/features/travel/hooks'
import { TripForm } from '@/features/travel/TripForm'
import { TripSheet } from '@/features/travel/TripSheet'
import {
  daysUntil,
  sortTrips,
  tripDayNumber,
  tripLength,
  tripPhase,
} from '@/features/travel/trip-dates'
import { formatDate } from '@/lib/dates'

export function TripsView() {
  const trips = useTrips()
  const memberships = useMemberships()
  const [addOpen, setAddOpen] = useState(false)
  const [openTrip, setOpenTrip] = useState<Trip | null>(null)

  const groups = (memberships.data ?? [])
    .map((m) => m.families)
    .filter((f): f is Family => f !== null)
  const groupName = (id: string | null) =>
    id ? (groups.find((g) => g.id === id)?.name ?? 'Grup') : null

  const ordered = sortTrips(trips.data ?? [])

  return (
    <>
      <Section title="Geziler" onAdd={() => setAddOpen(true)}>
        {trips.isPending ? (
          <SkeletonRows />
        ) : trips.isError ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            Geziler yüklenemedi. Bağlantını kontrol edip tekrar dene.
          </p>
        ) : ordered.length === 0 ? (
          <EmptyState text="Henüz gezi yok. + ile ilkini planla; birikimin, takvimin ve grubun ona bağlansın." />
        ) : (
          <ul className="space-y-2.5">
            <AnimatePresence initial={false}>
              {ordered.map((trip) => {
                const phase = tripPhase(trip)
                const days = daysUntil(trip.starts_on)
                const name = groupName(trip.family_id)
                return (
                  <motion.li
                    key={trip.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                  >
                    <button
                      onClick={() => setOpenTrip(trip)}
                      className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left shadow-sm shadow-zinc-200/60 transition-transform hover:-translate-y-0.5 dark:shadow-none ${
                        phase === 'past'
                          ? 'bg-zinc-50 opacity-70 dark:bg-zinc-900/60'
                          : 'bg-white dark:bg-zinc-900'
                      }`}
                    >
                      <span className="shrink-0 text-2xl">
                        {trip.cover_emoji ?? '✈️'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {trip.title}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-zinc-400">
                          <span>
                            {trip.destination ? `${trip.destination} · ` : ''}
                            {formatDate(trip.starts_on)}
                          </span>
                          {name && (
                            <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                              <Users size={9} /> {name}
                            </span>
                          )}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                          phase === 'ongoing'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : phase === 'upcoming'
                              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                              : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'
                        }`}
                      >
                        {phase === 'ongoing'
                          ? `${tripDayNumber(trip)}/${tripLength(trip)}`
                          : phase === 'upcoming'
                            ? days === 0
                              ? 'bugün'
                              : `${days} gün`
                            : 'bitti'}
                      </span>
                    </button>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </Section>

      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Gezi planla"
      >
        <TripForm onDone={() => setAddOpen(false)} />
      </Sheet>

      {openTrip && (
        <TripSheet trip={openTrip} open onClose={() => setOpenTrip(null)} />
      )}
    </>
  )
}
