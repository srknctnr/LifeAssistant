import { Bell, Check, ChevronRight, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { EmptyState } from '@/components/EmptyState'
import { Section } from '@/components/Section'
import { Sheet } from '@/components/Sheet'
import { SkeletonRows } from '@/components/SkeletonRows'
import type { Movie } from '@/features/movies/api'
import { useMovies } from '@/features/movies/hooks'
import { WatchedForm } from '@/features/movies/WatchedForm'
import type { Reminder } from '@/features/reminders/api'
import { ReminderForm } from '@/features/reminders/ReminderForm'
import { useReminders, useSetReminderStatus } from '@/features/reminders/hooks'
import type { GoalWithWish } from '@/features/wishlist/api'
import { ContributionForm } from '@/features/wishlist/ContributionForm'
import { useGoals } from '@/features/wishlist/hooks'
import { formatDate, todayISO } from '@/lib/dates'

interface ContributionTarget {
  reminder: Reminder
  goal: GoalWithWish
}

interface MovieTarget {
  reminder: Reminder
  movie: Movie
}

export function RemindersSection() {
  const reminders = useReminders()
  const goals = useGoals()
  const movies = useMovies()
  const setStatus = useSetReminderStatus()
  const [addOpen, setAddOpen] = useState(false)
  const [contributeFor, setContributeFor] = useState<ContributionTarget | null>(
    null,
  )
  const [watchFor, setWatchFor] = useState<MovieTarget | null>(null)

  const pending = (reminders.data ?? []).filter((r) => r.status === 'pending')

  // savings-goal reminders open the contribution form directly
  function goalFor(reminder: Reminder): GoalWithWish | undefined {
    if (reminder.source_type !== 'savings_goal' || !reminder.source_id) {
      return undefined
    }
    return (goals.data ?? []).find(
      (g) => g.id === reminder.source_id && g.status === 'active',
    )
  }

  // movie-night reminders open the watched/rating form directly
  function movieFor(reminder: Reminder): Movie | undefined {
    if (reminder.source_type !== 'movie' || !reminder.source_id) {
      return undefined
    }
    return (movies.data ?? []).find(
      (m) => m.id === reminder.source_id && m.status === 'to_watch',
    )
  }

  return (
    <>
      <Section title="Hatırlatmalar" onAdd={() => setAddOpen(true)}>
        {reminders.isPending ? (
          <SkeletonRows count={1} />
        ) : pending.length === 0 ? (
          <EmptyState text="Bekleyen hatırlatma yok. 🙌" />
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {pending.map((reminder) => {
                const goal = goalFor(reminder)
                const movie = movieFor(reminder)
                return (
                  <ReminderRow
                    key={reminder.id}
                    reminder={reminder}
                    onAction={
                      goal
                        ? () => setContributeFor({ reminder, goal })
                        : movie
                          ? () => setWatchFor({ reminder, movie })
                          : undefined
                    }
                  />
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </Section>

      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Hatırlatma ekle"
      >
        <ReminderForm onDone={() => setAddOpen(false)} />
      </Sheet>

      <Sheet
        open={contributeFor !== null}
        onClose={() => setContributeFor(null)}
        title="Katkı ekle"
      >
        {contributeFor && (
          <ContributionForm
            goal={contributeFor.goal}
            onDone={() => {
              // the contribution fulfils this month's nudge
              setStatus.mutate({
                id: contributeFor.reminder.id,
                status: 'done',
              })
              setContributeFor(null)
            }}
          />
        )}
      </Sheet>

      <Sheet
        open={watchFor !== null}
        onClose={() => setWatchFor(null)}
        title="Nasıldı?"
      >
        {watchFor && (
          <WatchedForm
            movie={watchFor.movie}
            onDone={() => {
              // watching the movie fulfils the movie-night reminder
              setStatus.mutate({ id: watchFor.reminder.id, status: 'done' })
              setWatchFor(null)
            }}
          />
        )}
      </Sheet>
    </>
  )
}

function ReminderRow({
  reminder,
  onAction,
}: {
  reminder: Reminder
  onAction?: () => void
}) {
  const setStatus = useSetReminderStatus()
  const isOverdue = reminder.due_on < todayISO()

  const body = (
    <>
      <span
        className={`rounded-xl p-2.5 ${
          isOverdue
            ? 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400'
            : 'bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400'
        }`}
      >
        <Bell size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{reminder.title}</p>
        <p
          className={`text-xs ${isOverdue ? 'font-medium text-red-500 dark:text-red-400' : 'text-zinc-400'}`}
        >
          {formatDate(reminder.due_on)}
          {isOverdue ? ' · gecikti' : ''}
        </p>
      </div>
      {onAction && (
        <ChevronRight
          size={16}
          className="-ml-1 shrink-0 text-zinc-300 dark:text-zinc-600"
        />
      )}
    </>
  )

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
    >
      {onAction ? (
        <button
          onClick={onAction}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      <button
        aria-label={`${reminder.title} hatırlatmasını tamamla`}
        onClick={() => setStatus.mutate({ id: reminder.id, status: 'done' })}
        className="rounded-full p-2 text-zinc-300 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:text-zinc-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
      >
        <Check size={17} strokeWidth={2.4} />
      </button>
      <button
        aria-label={`${reminder.title} hatırlatmasını yok say`}
        onClick={() =>
          setStatus.mutate({ id: reminder.id, status: 'dismissed' })
        }
        className="-ml-1 rounded-full p-2 text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-500 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-400"
      >
        <X size={17} />
      </button>
    </motion.li>
  )
}
