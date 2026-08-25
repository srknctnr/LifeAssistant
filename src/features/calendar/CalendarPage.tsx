import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Clock,
  Trash2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/EmptyState'
import { PageTransition } from '@/components/PageTransition'
import { Section } from '@/components/Section'
import { Segmented } from '@/components/Segmented'
import { Sheet } from '@/components/Sheet'
import { SkeletonRows } from '@/components/SkeletonRows'
import { useAuth } from '@/features/auth/useAuth'
import type {
  CalendarEvent,
  CategoryEntry,
  LifeCategory,
} from '@/features/calendar/api'
import { CalendarGrid } from '@/features/calendar/CalendarGrid'
import { CategoryForm } from '@/features/calendar/CategoryForm'
import { busyDates, eventsOnDay } from '@/features/calendar/event-day'
import { EventForm } from '@/features/calendar/EventForm'
import {
  useCategoryEntries,
  useDeleteCategory,
  useEvents,
  useLifeCategories,
  useToggleEntry,
} from '@/features/calendar/hooks'
import {
  addMonths,
  isSameMonth,
  monthGrid,
} from '@/features/calendar/month-math'
import {
  DAY_INITIALS,
  addDays,
  startOfWeek,
  weekDays,
} from '@/features/calendar/week-math'
import { useTrips } from '@/features/travel/hooks'
import {
  tripDayMap,
  tripDayNumber,
  tripLength,
} from '@/features/travel/trip-dates'
import type { Reminder } from '@/features/reminders/api'
import {
  useReminders,
  useReminderSync,
  useSetReminderStatus,
} from '@/features/reminders/hooks'
import { formatClock, formatDate, toISODate, todayISO } from '@/lib/dates'

type CalendarView = 'week' | 'month'

const rangeLabel = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
})
const monthLabel = new Intl.DateTimeFormat('tr-TR', {
  month: 'long',
  year: 'numeric',
})
const agendaDayLabel = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  weekday: 'long',
})

export function CalendarPage() {
  const categories = useLifeCategories()
  const entries = useCategoryEntries()
  const events = useEvents()
  const trips = useTrips()
  useReminderSync()

  const [view, setView] = useState<CalendarView>('week')
  const [selected, setSelected] = useState(() => new Date())
  const [addEventOpen, setAddEventOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<LifeCategory | null>(null)

  // One selected day feeds every dated block on the page
  const weeks = view === 'week' ? [weekDays(selected)] : monthGrid(selected)
  const selectedISO = toISODate(selected)
  const categoryDays = weekDays(selected)
  const busy = busyDates(events.data ?? [])
  const tripDays = tripDayMap(trips.data ?? [])
  const selectedTrip = tripDays.get(selectedISO)
  const selectedTripRow = (trips.data ?? []).find(
    (t) => t.id === selectedTrip?.tripId,
  )

  const isAway =
    view === 'week'
      ? toISODate(startOfWeek(selected)) !== toISODate(startOfWeek(new Date()))
      : !isSameMonth(selected, new Date())

  return (
    <PageTransition>
      <h1 className="text-2xl font-semibold tracking-tight">Takvim</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Planların, etkinliklerin ve yaşam kategorilerin.
      </p>

      <div className="mt-4">
        <Segmented<CalendarView>
          options={[
            { value: 'week', label: 'Hafta' },
            { value: 'month', label: 'Ay' },
          ]}
          value={view}
          onChange={setView}
        />
      </div>

      <motion.div
        layout
        className="mt-3 rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() =>
              setSelected(
                view === 'week'
                  ? addDays(selected, -7)
                  : addMonths(selected, -1),
              )
            }
            aria-label={view === 'week' ? 'Önceki hafta' : 'Önceki ay'}
            className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            onClick={() => setSelected(new Date())}
            className={`text-sm font-medium ${
              isAway
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-zinc-700 dark:text-zinc-200'
            }`}
          >
            {view === 'week'
              ? `${rangeLabel.format(weeks[0][0])} – ${rangeLabel.format(weeks[0][6])}`
              : monthLabel.format(selected)}
            {isAway && ' · bugüne dön'}
          </button>
          <button
            onClick={() =>
              setSelected(
                view === 'week' ? addDays(selected, 7) : addMonths(selected, 1),
              )
            }
            aria-label={view === 'week' ? 'Sonraki hafta' : 'Sonraki ay'}
            className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <ChevronRight size={17} />
          </button>
        </div>

        <CalendarGrid
          weeks={weeks}
          selectedISO={selectedISO}
          anchorMonth={view === 'month' ? selected.getMonth() : null}
          busy={busy}
          tripDays={tripDays}
          onSelect={setSelected}
        />
      </motion.div>

      <Section
        title={agendaDayLabel.format(selected)}
        onAdd={() => setAddEventOpen(true)}
      >
        {selectedTripRow && (
          <Link
            to="/wishlist"
            className="mb-2 flex items-center gap-2.5 rounded-xl bg-sky-50 px-3.5 py-2.5 text-sm transition-colors hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20"
          >
            <span className="text-base">
              {selectedTripRow.cover_emoji ?? '✈️'}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-sky-800 dark:text-sky-200">
              {selectedTripRow.title}
            </span>
            <span className="shrink-0 text-xs text-sky-700/70 tabular-nums dark:text-sky-300/70">
              {tripDayNumber(selectedTripRow, selectedISO)}. gün /{' '}
              {tripLength(selectedTripRow)}
            </span>
          </Link>
        )}
        <DayPlans
          selectedISO={selectedISO}
          onEditEvent={(event) => setEditEvent(event)}
        />
      </Section>

      <Section title="Bu hafta" onAdd={() => setAddCategoryOpen(true)}>
        {categories.isPending || entries.isPending ? (
          <SkeletonRows />
        ) : (categories.data ?? []).length === 0 ? (
          <EmptyState text="Henüz kategori yok. Spor, kitap, sosyalleşme… takip etmek istediğin ilk alanı ekle." />
        ) : (
          <ul className="space-y-2.5">
            <AnimatePresence initial={false}>
              {categories.data?.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  days={categoryDays}
                  entries={entries.data ?? []}
                  onEdit={() => setEditCategory(category)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Section>

      <AgendaSection selectedISO={selectedISO} />

      <Sheet
        open={addEventOpen}
        onClose={() => setAddEventOpen(false)}
        title="Etkinlik ekle"
      >
        <EventForm
          defaultDate={selectedISO}
          onDone={() => setAddEventOpen(false)}
        />
      </Sheet>

      <Sheet
        open={editEvent !== null}
        onClose={() => setEditEvent(null)}
        title="Etkinliği düzenle"
      >
        {editEvent && (
          <EventForm event={editEvent} onDone={() => setEditEvent(null)} />
        )}
      </Sheet>

      <Sheet
        open={addCategoryOpen}
        onClose={() => setAddCategoryOpen(false)}
        title="Kategori ekle"
      >
        <CategoryForm onDone={() => setAddCategoryOpen(false)} />
      </Sheet>

      <Sheet
        open={editCategory !== null}
        onClose={() => setEditCategory(null)}
        title="Kategoriyi düzenle"
      >
        {editCategory && (
          <CategoryForm
            category={editCategory}
            onDone={() => setEditCategory(null)}
          />
        )}
      </Sheet>
    </PageTransition>
  )
}

// The selected day's plans: its events first, then the reminders other
// modules put on that date (event reminders are excluded — the event itself
// is already listed above)
function DayPlans({
  selectedISO,
  onEditEvent,
}: {
  selectedISO: string
  onEditEvent: (event: CalendarEvent) => void
}) {
  const events = useEvents()
  const reminders = useReminders()
  const setStatus = useSetReminderStatus()

  const dayEvents = eventsOnDay(events.data ?? [], selectedISO)
  // An event is already listed as itself; so is the film night of a movie an
  // event owns (its movie reminder is on its way out of the sync)
  const ownedMovieIds = new Set(
    dayEvents.flatMap((e) => (e.movie_id ? [e.movie_id] : [])),
  )
  const dayReminders = (reminders.data ?? []).filter(
    (r) =>
      r.status === 'pending' &&
      r.due_on === selectedISO &&
      r.source_type !== 'event' &&
      !(
        r.source_type === 'movie' &&
        r.source_id &&
        ownedMovieIds.has(r.source_id)
      ),
  )
  const isPast = selectedISO < todayISO()

  if (events.isPending || reminders.isPending) return <SkeletonRows count={1} />

  if (dayEvents.length + dayReminders.length === 0) {
    return <EmptyState text="Bu güne planın yok. Bir etkinlik ekle." />
  }

  return (
    <ul className="space-y-1.5">
      <AnimatePresence initial={false}>
        {dayEvents.map((event) => (
          <motion.li
            key={event.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className={`flex items-center gap-3 rounded-xl bg-white px-3.5 py-2.5 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none ${
              isPast ? 'opacity-60' : ''
            }`}
          >
            <span className="shrink-0 rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              {event.kind === 'movie' ? (
                <Clapperboard size={15} />
              ) : (
                <Clock size={15} />
              )}
            </span>
            <button
              onClick={() => onEditEvent(event)}
              aria-label={`${event.title}, düzenle`}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-sm font-medium">{event.title}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
                {event.starts_at ? formatClock(event.starts_at) : 'Gün boyu'}
                {event.kind === 'movie' && !event.movie_id && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                    film seçilmedi
                  </span>
                )}
                {event.note && <span className="truncate">{event.note}</span>}
              </p>
            </button>
          </motion.li>
        ))}
        {dayReminders.map((reminder) => (
          <motion.li
            key={reminder.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
          >
            <Bell
              size={14}
              className="shrink-0 text-amber-500 dark:text-amber-400"
            />
            <p className="min-w-0 flex-1 truncate text-sm font-medium">
              {reminder.title}
            </p>
            <button
              aria-label={`${reminder.title} tamamlandı`}
              onClick={() =>
                setStatus.mutate({ id: reminder.id, status: 'done' })
              }
              className="rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:text-zinc-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
            >
              <Check size={15} strokeWidth={2.4} />
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}

function CategoryCard({
  category,
  days,
  entries,
  onEdit,
}: {
  category: LifeCategory
  days: Date[]
  entries: CategoryEntry[]
  onEdit: () => void
}) {
  const { session } = useAuth()
  const toggle = useToggleEntry()
  const deleteCategory = useDeleteCategory()
  const today = todayISO()

  const entryByDate = new Map(
    entries
      .filter((e) => e.category_id === category.id)
      .map((e) => [e.done_on, e]),
  )
  const weekCount = days.filter((d) => entryByDate.has(toISODate(d))).length
  const targetMet =
    category.weekly_target !== null && weekCount >= category.weekly_target

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
    >
      <div className="flex items-center gap-2">
        <button onClick={onEdit} className="min-w-0 flex-1 text-left">
          <p className="truncate font-medium">
            {category.emoji ? `${category.emoji} ` : ''}
            {category.name}
          </p>
        </button>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
            targetMet
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
          }`}
        >
          {weekCount}
          {category.weekly_target ? `/${category.weekly_target}` : ''}
          {targetMet ? ' 🎉' : ''}
        </span>
        <button
          aria-label={`${category.name} kategorisini sil`}
          onClick={() => deleteCategory.mutate(category.id)}
          className="rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="mt-3 flex justify-between">
        {days.map((day, index) => {
          const iso = toISODate(day)
          const isFuture = iso > today
          const isToday = iso === today
          const existing = entryByDate.get(iso)
          const done = Boolean(existing)
          return (
            <div key={iso} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-zinc-400">
                {DAY_INITIALS[index]}
              </span>
              <button
                aria-label={`${category.name} · ${formatDate(day)} ${done ? 'yapıldı' : 'yapılmadı'}`}
                disabled={
                  isFuture ||
                  !session ||
                  (toggle.isPending && toggle.variables?.date === iso)
                }
                onClick={() =>
                  session &&
                  toggle.mutate({
                    userId: session.user.id,
                    categoryId: category.id,
                    date: iso,
                    existing,
                  })
                }
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  done
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                } ${isToday ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900' : ''} ${
                  isFuture ? 'opacity-35' : ''
                }`}
              >
                {done ? <Check size={15} strokeWidth={2.6} /> : day.getDate()}
              </button>
            </div>
          )
        })}
      </div>
    </motion.li>
  )
}

// The connective tissue: reminders from every module (movie nights, savings
// contributions, manual ones) land here as a date-grouped agenda. The
// selected day is skipped — it already has its own list above.
function AgendaSection({ selectedISO }: { selectedISO: string }) {
  const reminders = useReminders()
  const setStatus = useSetReminderStatus()
  const today = todayISO()
  const horizon = toISODate(addDays(new Date(), 30))

  const upcoming = (reminders.data ?? [])
    .filter(
      (r) =>
        r.status === 'pending' &&
        r.due_on <= horizon &&
        r.due_on !== selectedISO,
    )
    .sort((a, b) => a.due_on.localeCompare(b.due_on))

  const grouped = new Map<string, Reminder[]>()
  for (const reminder of upcoming) {
    const list = grouped.get(reminder.due_on) ?? []
    list.push(reminder)
    grouped.set(reminder.due_on, list)
  }

  return (
    <Section title="Ajanda · 30 gün">
      {reminders.isPending ? (
        <SkeletonRows count={1} />
      ) : upcoming.length === 0 ? (
        <EmptyState text="Önümüzdeki 30 günde planlı bir şey yok. 🙌" />
      ) : (
        <div className="space-y-4">
          {[...grouped.entries()].map(([date, list]) => (
            <div key={date}>
              <p
                className={`mb-1.5 text-xs font-semibold ${
                  date < today
                    ? 'text-red-500 dark:text-red-400'
                    : date === today
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-zinc-400'
                }`}
              >
                {agendaDayLabel.format(new Date(date))}
                {date < today ? ' · gecikti' : date === today ? ' · bugün' : ''}
              </p>
              <ul className="space-y-1.5">
                {list.map((reminder) => (
                  <li
                    key={reminder.id}
                    className="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
                  >
                    <Bell
                      size={14}
                      className="shrink-0 text-amber-500 dark:text-amber-400"
                    />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">
                      {reminder.title}
                    </p>
                    <button
                      aria-label={`${reminder.title} tamamlandı`}
                      onClick={() =>
                        setStatus.mutate({ id: reminder.id, status: 'done' })
                      }
                      className="rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:text-zinc-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                    >
                      <Check size={15} strokeWidth={2.4} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}
