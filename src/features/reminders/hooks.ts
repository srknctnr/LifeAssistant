import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAuth } from '@/features/auth/useAuth'
import type { CalendarEvent } from '@/features/calendar/api'
import { useEvents } from '@/features/calendar/hooks'
import { useMovies } from '@/features/movies/hooks'
import {
  createReminder,
  isEmptyPlan,
  listReminders,
  mergePlans,
  setReminderStatus,
  syncReminders,
  type ReminderSyncPlan,
} from '@/features/reminders/api'
import {
  eventOwnedMovieIds,
  planContributionReminders,
  planEventReminders,
  planMovieReminders,
} from '@/features/reminders/reminder-sync'
import { useContributions, useGoals } from '@/features/wishlist/hooks'

const remindersKey = ['reminders'] as const
// stable identities, so the sync effect does not re-run on every render
const NO_EVENTS: CalendarEvent[] = []
const EMPTY_PLAN: ReminderSyncPlan = {
  toInsert: [],
  toComplete: [],
  toDismiss: [],
}

export function useReminders() {
  return useQuery({ queryKey: remindersKey, queryFn: listReminders })
}

export function useCreateReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createReminder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: remindersKey }),
  })
}

export function useSetReminderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: setReminderStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: remindersKey }),
  })
}

// Materializes contribution, movie-night and calendar-event reminders (and
// completes or dismisses satisfied/stale ones) whenever the underlying data
// settles. Plans are idempotent and an applied plan makes the next one empty,
// so this converges instead of looping.
export function useReminderSync() {
  const { session } = useAuth()
  const goals = useGoals()
  const contributions = useContributions()
  const movies = useMovies()
  const events = useEvents()
  const reminders = useReminders()
  const queryClient = useQueryClient()

  const sync = useMutation({
    mutationFn: syncReminders,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: remindersKey }),
  })
  const { mutate, isPending } = sync

  // An events query that failed (e.g. before the migration is applied) must
  // not be read as "the user deleted every event" — the event planner is
  // skipped entirely, so it can never dismiss live reminders. The other
  // planners still run.
  const eventRows = events.isSuccess ? events.data : null
  const eventsSettled = events.isSuccess || events.isError

  useEffect(() => {
    if (isPending) return
    if (
      !session ||
      !goals.data ||
      !contributions.data ||
      !movies.data ||
      !eventsSettled ||
      !reminders.data
    ) {
      return
    }

    const ownedByEvents = eventOwnedMovieIds(eventRows ?? NO_EVENTS)
    const plan = mergePlans(
      planContributionReminders({
        userId: session.user.id,
        goals: goals.data,
        contributions: contributions.data,
        reminders: reminders.data,
      }),
      planMovieReminders({
        userId: session.user.id,
        movies: movies.data,
        reminders: reminders.data,
        eventOwnedMovieIds: ownedByEvents,
      }),
      eventRows
        ? planEventReminders({
            userId: session.user.id,
            events: eventRows,
            reminders: reminders.data,
          })
        : EMPTY_PLAN,
    )

    if (!isEmptyPlan(plan)) mutate(plan)
  }, [
    session,
    goals.data,
    contributions.data,
    movies.data,
    eventRows,
    eventsSettled,
    reminders.data,
    isPending,
    mutate,
  ])
}
