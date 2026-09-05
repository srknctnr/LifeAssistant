import type { Reminder, ReminderSyncPlan } from '@/features/reminders/api'
import type { GoalWithWish, SavingsContribution } from '@/features/wishlist/api'
import { toMinor } from '@/features/expenses/split-math'
import { formatClock, toISODate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

interface PlanInput {
  userId: string
  goals: GoalWithWish[]
  contributions: SavingsContribution[]
  reminders: Reminder[]
  today?: Date
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

function endOfMonthISO(date: Date): string {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
}

// For every active, unfinished goal: create this month's contribution
// reminder if it doesn't exist yet, and auto-complete a pending one once this
// month's contributions COVER the monthly amount. Pending reminders from
// months that have already ended are dismissed. Dismissed reminders are not
// re-created.
export function planContributionReminders({
  userId,
  goals,
  contributions,
  reminders,
  today = new Date(),
}: PlanInput): ReminderSyncPlan {
  const month = monthKey(today)
  const plan: ReminderSyncPlan = { toInsert: [], toComplete: [], toDismiss: [] }

  const savedByGoal = new Map<string, number>()
  for (const c of contributions) {
    savedByGoal.set(
      c.savings_goal_id,
      (savedByGoal.get(c.savings_goal_id) ?? 0) + c.amount,
    )
  }

  for (const goal of goals) {
    if (goal.status !== 'active') continue

    const saved = savedByGoal.get(goal.id) ?? 0
    const isComplete = saved >= goal.target_amount
    // The month is closed by the AMOUNT the plan asks for, not by the gesture
    // of contributing: 1₺ used to satisfy a 9.000₺ month, which let a goal
    // fall a month behind while the reminder said everything was handled.
    const contributedThisMonth = contributions.reduce(
      (sum, c) =>
        c.savings_goal_id === goal.id && c.contributed_on.startsWith(month)
          ? sum + c.amount
          : sum,
      0,
    )
    const monthSatisfied =
      toMinor(contributedThisMonth) >= toMinor(goal.monthly_amount)
    const remindersThisMonth = reminders.filter(
      (r) =>
        r.source_type === 'savings_goal' &&
        r.source_id === goal.id &&
        r.due_on.startsWith(month),
    )
    const pending = remindersThisMonth.find((r) => r.status === 'pending')

    if (monthSatisfied || isComplete) {
      if (pending) plan.toComplete.push(pending.id)
      continue
    }

    if (remindersThisMonth.length === 0) {
      const name = goal.wishlist_items?.name ?? 'Hedefin'
      const shortfall = goal.monthly_amount - contributedThisMonth
      plan.toInsert.push({
        user_id: userId,
        title:
          contributedThisMonth > 0
            ? `${name}: bu ay ${formatMoney(shortfall, goal.currency)} daha ekle`
            : `${name}: bu ayın katkısını ekle`,
        due_on: endOfMonthISO(today),
        source_type: 'savings_goal',
        source_id: goal.id,
      })
    }
  }

  // A month that has ended can no longer be paid into, so its pending reminder
  // is not actionable — and under the stricter rule above it would otherwise
  // never close, piling up one dead row per missed month. Dismissed, not done:
  // it was not done, and the pace line on the goal card now carries that truth
  // honestly. Dismissed reminders are never re-created.
  for (const reminder of reminders) {
    if (reminder.source_type !== 'savings_goal') continue
    if (reminder.status !== 'pending') continue
    if (reminder.due_on.slice(0, 7) >= month) continue
    plan.toDismiss.push(reminder.id)
  }

  return plan
}

interface MovieLike {
  id: string
  title: string
  status: string
  planned_for: string | null
}

interface MoviePlanInput {
  userId: string
  movies: MovieLike[]
  reminders: Reminder[]
  // movies whose night is owned by a calendar event; that event's reminder
  // covers the night, so no movie reminder is created for them
  eventOwnedMovieIds?: Set<string>
}

// A to-watch movie with a planned date gets a movie-night reminder for that
// exact date. Watching the movie completes the reminder; deleting the movie
// or moving the date dismisses the stale one. A reminder the user dismissed
// is not recreated for the same date.
export function planMovieReminders({
  userId,
  movies,
  reminders,
  eventOwnedMovieIds = new Set<string>(),
}: MoviePlanInput): ReminderSyncPlan {
  const plan: ReminderSyncPlan = { toInsert: [], toComplete: [], toDismiss: [] }
  const movieById = new Map(movies.map((m) => [m.id, m]))
  const movieReminders = reminders.filter(
    (r) => r.source_type === 'movie' && r.source_id,
  )

  for (const reminder of movieReminders) {
    if (reminder.status !== 'pending') continue
    const movie = movieById.get(reminder.source_id!)
    if (!movie || eventOwnedMovieIds.has(movie.id)) {
      plan.toDismiss.push(reminder.id)
    } else if (movie.status === 'watched') {
      plan.toComplete.push(reminder.id)
    } else if (movie.planned_for !== reminder.due_on) {
      plan.toDismiss.push(reminder.id)
    }
  }

  for (const movie of movies) {
    if (movie.status !== 'to_watch' || !movie.planned_for) continue
    if (eventOwnedMovieIds.has(movie.id)) continue
    const exists = movieReminders.some(
      (r) => r.source_id === movie.id && r.due_on === movie.planned_for,
    )
    if (!exists) {
      plan.toInsert.push({
        user_id: userId,
        title: `Film günü: ${movie.title}`,
        due_on: movie.planned_for,
        source_type: 'movie',
        source_id: movie.id,
      })
    }
  }

  return plan
}

interface EventLike {
  id: string
  title: string
  kind: string
  starts_on: string
  starts_at: string | null
  movie_id: string | null
}

interface EventPlanInput {
  userId: string
  events: EventLike[]
  reminders: Reminder[]
  today?: Date
}

// Movies whose night is owned by a calendar event. planMovieReminders takes
// this so exactly one planner covers a given night: the event owns it, from
// the moment it is created until it is deleted — picking or clearing the film
// never hands ownership over, which is what would otherwise strand a
// programmatically dismissed reminder that can never come back.
export function eventOwnedMovieIds(events: EventLike[]): Set<string> {
  return new Set(
    events.flatMap((e) =>
      e.kind === 'movie' && e.movie_id ? [e.movie_id] : [],
    ),
  )
}

// Every event gets one reminder on its own day. A deleted event or a moved
// date dismisses the stale one; past events are never materialized and
// nothing auto-completes (no column marks an event attended).
// Known limitation: the title is not part of the unique key and the plan has
// no update arm, so renaming an event — or picking its film later — leaves
// the existing reminder's title stale. Movies already behave this way.
export function planEventReminders({
  userId,
  events,
  reminders,
  today = new Date(),
}: EventPlanInput): ReminderSyncPlan {
  const plan: ReminderSyncPlan = { toInsert: [], toComplete: [], toDismiss: [] }
  const todayIso = toISODate(today)
  const eventById = new Map(events.map((e) => [e.id, e]))
  const eventReminders = reminders.filter(
    (r) => r.source_type === 'event' && r.source_id,
  )

  for (const reminder of eventReminders) {
    if (reminder.status !== 'pending') continue
    const event = eventById.get(reminder.source_id!)
    if (!event || event.starts_on !== reminder.due_on) {
      plan.toDismiss.push(reminder.id)
    }
  }

  for (const event of events) {
    if (event.starts_on < todayIso) continue
    const exists = eventReminders.some(
      (r) => r.source_id === event.id && r.due_on === event.starts_on,
    )
    if (exists) continue
    const timePrefix = event.starts_at
      ? `${formatClock(event.starts_at)} · `
      : ''
    plan.toInsert.push({
      user_id: userId,
      title: `${timePrefix}${event.title}`,
      due_on: event.starts_on,
      source_type: 'event',
      source_id: event.id,
    })
  }

  return plan
}
