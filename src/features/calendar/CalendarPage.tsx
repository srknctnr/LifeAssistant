import { Bell, Check, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { EmptyState } from '@/components/EmptyState'
import { PageTransition } from '@/components/PageTransition'
import { Section } from '@/components/Section'
import { Sheet } from '@/components/Sheet'
import { SkeletonRows } from '@/components/SkeletonRows'
import { useAuth } from '@/features/auth/useAuth'
import type { CategoryEntry, LifeCategory } from '@/features/calendar/api'
import { CategoryForm } from '@/features/calendar/CategoryForm'
import {
  useCategoryEntries,
  useDeleteCategory,
  useLifeCategories,
  useToggleEntry,
} from '@/features/calendar/hooks'
import { DAY_INITIALS, addDays, weekDays } from '@/features/calendar/week-math'
import type { Reminder } from '@/features/reminders/api'
import { useReminders, useSetReminderStatus } from '@/features/reminders/hooks'
import { formatDate, toISODate, todayISO } from '@/lib/dates'

const rangeLabel = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
})
const agendaDayLabel = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  weekday: 'long',
})

export function CalendarPage() {
  const categories = useLifeCategories()
  const entries = useCategoryEntries()
  const [weekOffset, setWeekOffset] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<LifeCategory | null>(null)

  const days = weekDays(addDays(new Date(), weekOffset * 7))
  const weekStart = days[0]
  const weekEnd = days[6]

  return (
    <PageTransition>
      <h1 className="text-2xl font-semibold tracking-tight">Takvim</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Yaşam kategorilerin ve önündeki plan.
      </p>

      <Section title="Bu hafta" onAdd={() => setAddOpen(true)}>
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            aria-label="Önceki hafta"
            className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className={`text-sm font-medium ${
              weekOffset === 0
                ? 'text-zinc-700 dark:text-zinc-200'
                : 'text-indigo-600 dark:text-indigo-400'
            }`}
          >
            {rangeLabel.format(weekStart)} – {rangeLabel.format(weekEnd)}
            {weekOffset !== 0 && ' · bugüne dön'}
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            aria-label="Sonraki hafta"
            className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <ChevronRight size={17} />
          </button>
        </div>

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
                  days={days}
                  entries={entries.data ?? []}
                  onEdit={() => setEditCategory(category)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Section>

      <AgendaSection />

      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Kategori ekle"
      >
        <CategoryForm onDone={() => setAddOpen(false)} />
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
                disabled={isFuture || toggle.isPending || !session}
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
// contributions, manual ones) land here as a date-grouped agenda
function AgendaSection() {
  const reminders = useReminders()
  const setStatus = useSetReminderStatus()
  const today = todayISO()
  const horizon = toISODate(addDays(new Date(), 30))

  const upcoming = (reminders.data ?? [])
    .filter((r) => r.status === 'pending' && r.due_on <= horizon)
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
