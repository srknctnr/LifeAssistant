import { describe, expect, it } from 'vitest'

import type { Reminder } from '@/features/reminders/api'
import { planContributionReminders } from '@/features/reminders/reminder-sync'
import type { GoalWithWish, SavingsContribution } from '@/features/wishlist/api'

const today = new Date(2026, 6, 6) // 6 Temmuz 2026

function makeGoal(overrides: Partial<GoalWithWish> = {}): GoalWithWish {
  return {
    id: 'goal-1',
    user_id: 'user-1',
    wishlist_item_id: 'wish-1',
    target_amount: 45000,
    currency: 'TRY',
    monthly_amount: 9000,
    start_date: '2026-07-01',
    expense_item_id: null,
    status: 'active',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    wishlist_items: {
      name: 'Kapadokya gezisi',
      kind: 'travel',
      target_date: '2026-12-15',
    },
    ...overrides,
  }
}

function makeContribution(
  overrides: Partial<SavingsContribution> = {},
): SavingsContribution {
  return {
    id: 'contribution-1',
    user_id: 'user-1',
    savings_goal_id: 'goal-1',
    amount: 9000,
    contributed_on: '2026-07-05',
    note: null,
    created_at: '2026-07-05T00:00:00Z',
    ...overrides,
  }
}

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'reminder-1',
    user_id: 'user-1',
    title: 'Kapadokya gezisi: bu ayın katkısını ekle',
    due_on: '2026-07-31',
    source_type: 'savings_goal',
    source_id: 'goal-1',
    status: 'pending',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

describe('planContributionReminders', () => {
  it('creates a reminder for an active goal without a contribution this month', () => {
    const plan = planContributionReminders({
      userId: 'user-1',
      goals: [makeGoal()],
      contributions: [],
      reminders: [],
      today,
    })
    expect(plan.toComplete).toEqual([])
    expect(plan.toInsert).toHaveLength(1)
    expect(plan.toInsert[0]).toMatchObject({
      user_id: 'user-1',
      title: 'Kapadokya gezisi: bu ayın katkısını ekle',
      due_on: '2026-07-31',
      source_type: 'savings_goal',
      source_id: 'goal-1',
    })
  })

  it('does not duplicate an existing reminder for the month', () => {
    const plan = planContributionReminders({
      userId: 'user-1',
      goals: [makeGoal()],
      contributions: [],
      reminders: [makeReminder()],
      today,
    })
    expect(plan.toInsert).toEqual([])
    expect(plan.toComplete).toEqual([])
  })

  it('does not recreate a dismissed reminder', () => {
    const plan = planContributionReminders({
      userId: 'user-1',
      goals: [makeGoal()],
      contributions: [],
      reminders: [makeReminder({ status: 'dismissed' })],
      today,
    })
    expect(plan.toInsert).toEqual([])
  })

  it('completes the pending reminder once a contribution is made', () => {
    const plan = planContributionReminders({
      userId: 'user-1',
      goals: [makeGoal()],
      contributions: [makeContribution()],
      reminders: [makeReminder()],
      today,
    })
    expect(plan.toInsert).toEqual([])
    expect(plan.toComplete).toEqual(['reminder-1'])
  })

  it('does not create a reminder when the contribution already exists', () => {
    const plan = planContributionReminders({
      userId: 'user-1',
      goals: [makeGoal()],
      contributions: [makeContribution()],
      reminders: [],
      today,
    })
    expect(plan.toInsert).toEqual([])
    expect(plan.toComplete).toEqual([])
  })

  it('skips reached goals and completes their pending reminder', () => {
    const plan = planContributionReminders({
      userId: 'user-1',
      goals: [makeGoal()],
      contributions: [
        makeContribution({ amount: 45000, contributed_on: '2026-06-10' }),
      ],
      reminders: [makeReminder()],
      today,
    })
    expect(plan.toInsert).toEqual([])
    expect(plan.toComplete).toEqual(['reminder-1'])
  })

  it('ignores paused or completed goals', () => {
    const plan = planContributionReminders({
      userId: 'user-1',
      goals: [makeGoal({ status: 'paused' })],
      contributions: [],
      reminders: [],
      today,
    })
    expect(plan.toInsert).toEqual([])
  })
})
