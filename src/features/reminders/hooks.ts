import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { useAuth } from '@/features/auth/useAuth'
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
  planMovieReminders,
} from '@/features/reminders/reminder-sync'
import { useContributions, useGoals } from '@/features/wishlist/hooks'

const remindersKey = ['reminders'] as const

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

// Materializes contribution and movie-night reminders (and completes or
// dismisses satisfied/stale ones) once per mount, as soon as all datasets
// are loaded
export function useReminderSync() {
  const { session } = useAuth()
  const goals = useGoals()
  const contributions = useContributions()
  const movies = useMovies()
  const reminders = useReminders()
  const queryClient = useQueryClient()
  const hasRun = useRef(false)

  const sync = useMutation({
    mutationFn: syncReminders,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: remindersKey }),
  })
  const { mutate } = sync

  useEffect(() => {
    if (hasRun.current) return
    if (
      !session ||
      !goals.data ||
      !contributions.data ||
      !movies.data ||
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
    reminders.data,
    mutate,
  ])
}
