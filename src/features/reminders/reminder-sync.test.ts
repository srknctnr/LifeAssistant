import { describe, expect, it } from 'vitest'

import type { Reminder } from '@/features/reminders/api'
import {
  eventOwnedMovieIds,
  planContributionReminders,
  planEventReminders,
  planMovieReminders,
} from '@/features/reminders/reminder-sync'
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
      is_family_visible: false,
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

describe('planMovieReminders', () => {
  const movie = {
    id: 'movie-1',
    title: 'Dune',
    status: 'to_watch',
    planned_for: '2026-07-12',
  }

  function movieReminder(overrides: Partial<Reminder> = {}): Reminder {
    return makeReminder({
      id: 'movie-reminder-1',
      title: 'Film günü: Dune',
      due_on: '2026-07-12',
      source_type: 'movie',
      source_id: 'movie-1',
      ...overrides,
    })
  }

  it('creates a reminder for a planned movie night', () => {
    const plan = planMovieReminders({
      userId: 'user-1',
      movies: [movie],
      reminders: [],
    })
    expect(plan.toInsert).toHaveLength(1)
    expect(plan.toInsert[0]).toMatchObject({
      title: 'Film günü: Dune',
      due_on: '2026-07-12',
      source_type: 'movie',
      source_id: 'movie-1',
    })
  })

  it('does not duplicate or recreate dismissed reminders', () => {
    const plan = planMovieReminders({
      userId: 'user-1',
      movies: [movie],
      reminders: [movieReminder({ status: 'dismissed' })],
    })
    expect(plan.toInsert).toEqual([])
  })

  it('completes the reminder once the movie is watched', () => {
    const plan = planMovieReminders({
      userId: 'user-1',
      movies: [{ ...movie, status: 'watched' }],
      reminders: [movieReminder()],
    })
    expect(plan.toComplete).toEqual(['movie-reminder-1'])
  })

  it('dismisses stale reminders when the date moves and creates the new one', () => {
    const plan = planMovieReminders({
      userId: 'user-1',
      movies: [{ ...movie, planned_for: '2026-07-20' }],
      reminders: [movieReminder()],
    })
    expect(plan.toDismiss).toEqual(['movie-reminder-1'])
    expect(plan.toInsert[0]).toMatchObject({ due_on: '2026-07-20' })
  })

  it('dismisses reminders of deleted movies', () => {
    const plan = planMovieReminders({
      userId: 'user-1',
      movies: [],
      reminders: [movieReminder()],
    })
    expect(plan.toDismiss).toEqual(['movie-reminder-1'])
  })

  it('skips movies without a planned date', () => {
    const plan = planMovieReminders({
      userId: 'user-1',
      movies: [{ ...movie, planned_for: null }],
      reminders: [],
    })
    expect(plan.toInsert).toEqual([])
  })
})

describe('planEventReminders', () => {
  const event = {
    id: 'e1',
    title: 'Anne yemeği',
    kind: 'general',
    starts_on: '2026-07-10',
    starts_at: null as string | null,
    movie_id: null as string | null,
  }

  function eventReminder(overrides: Partial<Reminder> = {}): Reminder {
    return makeReminder({
      id: 'event-reminder-1',
      title: 'Anne yemeği',
      due_on: '2026-07-10',
      source_type: 'event',
      source_id: 'e1',
      ...overrides,
    })
  }

  it('creates a reminder for an upcoming event', () => {
    const plan = planEventReminders({
      userId: 'user-1',
      events: [event],
      reminders: [],
      today,
    })
    expect(plan.toInsert).toHaveLength(1)
    expect(plan.toInsert[0]).toMatchObject({
      title: 'Anne yemeği',
      due_on: '2026-07-10',
      source_type: 'event',
      source_id: 'e1',
    })
    expect(plan.toComplete).toEqual([])
  })

  it('prefixes the title with the time when the event has one', () => {
    const plan = planEventReminders({
      userId: 'user-1',
      events: [{ ...event, starts_at: '20:30:00' }],
      reminders: [],
      today,
    })
    expect(plan.toInsert[0]).toMatchObject({ title: '20:30 · Anne yemeği' })
  })

  it('skips events dated before today', () => {
    const plan = planEventReminders({
      userId: 'user-1',
      events: [{ ...event, starts_on: '2026-07-05' }],
      reminders: [],
      today,
    })
    expect(plan.toInsert).toEqual([])
  })

  it('creates nothing when the reminder already exists', () => {
    const plan = planEventReminders({
      userId: 'user-1',
      events: [event],
      reminders: [eventReminder()],
      today,
    })
    expect(plan.toInsert).toEqual([])
    expect(plan.toDismiss).toEqual([])
  })

  it('does not recreate a dismissed reminder for the same date', () => {
    const plan = planEventReminders({
      userId: 'user-1',
      events: [event],
      reminders: [eventReminder({ status: 'dismissed' })],
      today,
    })
    expect(plan.toInsert).toEqual([])
    expect(plan.toDismiss).toEqual([])
  })

  it('dismisses the reminder of a deleted event', () => {
    const plan = planEventReminders({
      userId: 'user-1',
      events: [],
      reminders: [eventReminder()],
      today,
    })
    expect(plan.toDismiss).toEqual(['event-reminder-1'])
  })

  it('dismisses the stale reminder and inserts the new date when the event moves', () => {
    const plan = planEventReminders({
      userId: 'user-1',
      events: [{ ...event, starts_on: '2026-07-18' }],
      reminders: [eventReminder()],
      today,
    })
    expect(plan.toDismiss).toEqual(['event-reminder-1'])
    expect(plan.toInsert[0]).toMatchObject({ due_on: '2026-07-18' })
  })

  it('keeps owning a movie night after its film is picked', () => {
    const plan = planEventReminders({
      userId: 'user-1',
      events: [
        {
          ...event,
          kind: 'movie',
          title: 'Film gecesi: Dune',
          movie_id: 'movie-1',
        },
      ],
      reminders: [eventReminder()],
      today,
    })
    expect(plan.toInsert).toEqual([])
    expect(plan.toDismiss).toEqual([])
  })

  it('reminds about a movie night that has no film yet', () => {
    const plan = planEventReminders({
      userId: 'user-1',
      events: [{ ...event, kind: 'movie', title: 'Film gecesi' }],
      reminders: [],
      today,
    })
    expect(plan.toInsert).toHaveLength(1)
    expect(plan.toInsert[0]).toMatchObject({ title: 'Film gecesi' })
  })
})

describe('eventOwnedMovieIds', () => {
  const base = {
    id: 'e1',
    title: 'Film gecesi',
    kind: 'movie',
    starts_on: '2026-07-10',
    starts_at: null as string | null,
    movie_id: null as string | null,
  }

  it('collects the films booked by movie-kind events', () => {
    const ids = eventOwnedMovieIds([
      { ...base, movie_id: 'movie-1' },
      { ...base, id: 'e2', movie_id: null },
      { ...base, id: 'e3', kind: 'general', movie_id: null },
    ])
    expect([...ids]).toEqual(['movie-1'])
  })

  it('is empty when nothing is booked', () => {
    expect(eventOwnedMovieIds([]).size).toBe(0)
  })
})

describe('planMovieReminders + events', () => {
  const movie = {
    id: 'movie-1',
    title: 'Dune',
    status: 'to_watch',
    planned_for: '2026-07-12',
  }

  it('creates no movie reminder for a night an event owns', () => {
    const plan = planMovieReminders({
      userId: 'user-1',
      movies: [movie],
      reminders: [],
      eventOwnedMovieIds: new Set(['movie-1']),
    })
    expect(plan.toInsert).toEqual([])
  })

  it('hands an existing movie reminder over when an event takes the night', () => {
    const existing = makeReminder({
      id: 'movie-reminder-1',
      title: 'Film günü: Dune',
      due_on: '2026-07-12',
      source_type: 'movie',
      source_id: 'movie-1',
    })
    const plan = planMovieReminders({
      userId: 'user-1',
      movies: [movie],
      reminders: [existing],
      eventOwnedMovieIds: new Set(['movie-1']),
    })
    expect(plan.toDismiss).toEqual(['movie-reminder-1'])
    expect(plan.toInsert).toEqual([])
  })
})
