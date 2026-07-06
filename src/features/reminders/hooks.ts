import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { useAuth } from '@/features/auth/useAuth'
import {
  createReminder,
  listReminders,
  setReminderStatus,
  syncReminders,
} from '@/features/reminders/api'
import { planContributionReminders } from '@/features/reminders/reminder-sync'
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

// Materializes this month's contribution reminders (and completes satisfied
// ones) once per mount, as soon as all three datasets are loaded
export function useContributionReminderSync() {
  const { session } = useAuth()
  const goals = useGoals()
  const contributions = useContributions()
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
    if (!session || !goals.data || !contributions.data || !reminders.data) {
      return
    }

    const plan = planContributionReminders({
      userId: session.user.id,
      goals: goals.data,
      contributions: contributions.data,
      reminders: reminders.data,
    })

    if (plan.toInsert.length > 0 || plan.toComplete.length > 0) {
      hasRun.current = true
      mutate(plan)
    }
  }, [session, goals.data, contributions.data, reminders.data, mutate])
}
