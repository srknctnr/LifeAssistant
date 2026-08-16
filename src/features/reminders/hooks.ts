import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

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
} from '@/features/reminders/api'
import {
  planContributionReminders,
  planEventReminders,
  planMovieReminders,
} from '@/features/reminders/reminder-sync'
import { useContributions, useGoals } from '@/features/wishlist/hooks'

const remindersKey = ['reminders'] as const
// stable identity, so the sync effect does not re-run on every render
const NO_EVENTS: CalendarEvent[] = []

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
// completes or dismisses satisfied/stale ones) once per mount, as soon as all
// datasets are loaded
export function useReminderSync() {
  const { session } = useAuth()
  const goals = useGoals()
  const contributions = useContributions()
  const movies = useMovies()
  const events = useEvents()
  const reminders = useReminders()
  const queryClient = useQueryClient()
  const hasRun = useRef(false)

  const sync = useMutation({
    mutationFn: syncReminders,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: remindersKey }),
  })
  const { mutate } = sync

  // Events are the newest dataset: if that query fails (e.g. the migration
  // has not been applied yet) the other planners must still run
  const eventRows = events.data ?? (events.isError ? NO_EVENTS : null)

  useEffect(() => {
    if (hasRun.current) return
    if (
      !session ||
      !goals.data ||
      !contributions.data ||
      !movies.data ||
      !eventRows ||
      !reminders.data
    ) {
      return
    }

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
      }),
      planEventReminders({
        userId: session.user.id,
        events: eventRows,
        reminders: reminders.data,
      }),
    )

    if (!isEmptyPlan(plan)) {
      hasRun.current = true
      mutate(plan)
    }
  }, [
    session,
    goals.data,
    contributions.data,
    movies.data,
    eventRows,
    reminders.data,
    mutate,
  ])
}
