import type { Reminder, ReminderSyncPlan } from '@/features/reminders/api'
import type { GoalWithWish, SavingsContribution } from '@/features/wishlist/api'

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
// reminder if it doesn't exist yet, and auto-complete a pending one once
// the contribution has been made. Dismissed reminders are not re-created.
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
    const hasContributionThisMonth = contributions.some(
      (c) =>
        c.savings_goal_id === goal.id && c.contributed_on.startsWith(month),
    )
    const remindersThisMonth = reminders.filter(
      (r) =>
        r.source_type === 'savings_goal' &&
        r.source_id === goal.id &&
        r.due_on.startsWith(month),
    )
    const pending = remindersThisMonth.find((r) => r.status === 'pending')

    if (hasContributionThisMonth || isComplete) {
      if (pending) plan.toComplete.push(pending.id)
      continue
    }

    if (remindersThisMonth.length === 0) {
      plan.toInsert.push({
        user_id: userId,
        title: `${goal.wishlist_items?.name ?? 'Hedefin'}: bu ayın katkısını ekle`,
        due_on: endOfMonthISO(today),
        source_type: 'savings_goal',
        source_id: goal.id,
      })
    }
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
}

// A to-watch movie with a planned date gets a movie-night reminder for that
// exact date. Watching the movie completes the reminder; deleting the movie
// or moving the date dismisses the stale one. A reminder the user dismissed
// is not recreated for the same date.
export function planMovieReminders({
  userId,
  movies,
  reminders,
}: MoviePlanInput): ReminderSyncPlan {
  const plan: ReminderSyncPlan = { toInsert: [], toComplete: [], toDismiss: [] }
  const movieById = new Map(movies.map((m) => [m.id, m]))
  const movieReminders = reminders.filter(
    (r) => r.source_type === 'movie' && r.source_id,
  )

  for (const reminder of movieReminders) {
    if (reminder.status !== 'pending') continue
    const movie = movieById.get(reminder.source_id!)
    if (!movie) {
      plan.toDismiss.push(reminder.id)
    } else if (movie.status === 'watched') {
      plan.toComplete.push(reminder.id)
    } else if (movie.planned_for !== reminder.due_on) {
      plan.toDismiss.push(reminder.id)
    }
  }

  for (const movie of movies) {
    if (movie.status !== 'to_watch' || !movie.planned_for) continue
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
