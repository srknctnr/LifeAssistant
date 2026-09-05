import { describe, expect, it } from 'vitest'

import {
  goalPace,
  monthsUntil,
  suggestedMonthlyAmount,
} from '@/features/wishlist/goal-math'

describe('monthsUntil', () => {
  const today = new Date(2026, 6, 6) // 6 Temmuz 2026

  it('counts full calendar months when the target day has been reached', () => {
    expect(monthsUntil(new Date(2026, 11, 15), today)).toBe(5)
  })

  it('does not count a month whose day has not been reached', () => {
    expect(monthsUntil(new Date(2026, 11, 1), today)).toBe(4)
  })

  it('returns at least 1 for near or past dates', () => {
    expect(monthsUntil(new Date(2026, 6, 20), today)).toBe(1)
    expect(monthsUntil(new Date(2026, 0, 1), today)).toBe(1)
  })
})

describe('suggestedMonthlyAmount', () => {
  it('divides the target across the months', () => {
    expect(suggestedMonthlyAmount(45000, 5)).toBe(9000)
  })

  it('rounds up to a whole lira', () => {
    expect(suggestedMonthlyAmount(1000, 3)).toBe(334)
  })

  it('treats zero months as one', () => {
    expect(suggestedMonthlyAmount(500, 0)).toBe(500)
  })
})

describe('goalPace', () => {
  // 12.000₺ over 4 months of 3.000₺, started 15 Ocak
  const plan = {
    startDate: '2026-01-15',
    monthlyAmount: 3000,
    targetAmount: 12000,
  }

  it('expects the first payment in the starting month itself', () => {
    const pace = goalPace({
      ...plan,
      saved: 3000,
      today: new Date(2026, 0, 20),
    })
    expect(pace.expectedSaved).toBe(3000)
    expect(pace.delta).toBe(0)
    expect(pace.monthsBehind).toBe(0)
  })

  it('does not call a goal late before its day of the month comes round again', () => {
    // 10 Şubat: the 15th has not arrived, so only one payment is due
    const pace = goalPace({
      ...plan,
      saved: 3000,
      today: new Date(2026, 1, 10),
    })
    expect(pace.expectedSaved).toBe(3000)
    expect(pace.monthsBehind).toBe(0)
  })

  it('counts the second payment once the day comes round', () => {
    const pace = goalPace({
      ...plan,
      saved: 3000,
      today: new Date(2026, 1, 15),
    })
    expect(pace.expectedSaved).toBe(6000)
    expect(pace.delta).toBe(-3000)
    expect(pace.monthsBehind).toBe(1)
  })

  it('reports two months behind when two are missed', () => {
    const pace = goalPace({
      ...plan,
      saved: 3000,
      today: new Date(2026, 2, 15),
    })
    expect(pace.monthsBehind).toBe(2)
    expect(pace.monthsAhead).toBe(0)
  })

  it('reports being ahead', () => {
    const pace = goalPace({
      ...plan,
      saved: 9000,
      today: new Date(2026, 1, 15),
    })
    expect(pace.delta).toBe(3000)
    expect(pace.monthsAhead).toBe(1)
    expect(pace.monthsBehind).toBe(0)
  })

  it('rounds a part-month shortfall up to a whole month behind', () => {
    const pace = goalPace({
      ...plan,
      saved: 5000,
      today: new Date(2026, 1, 15),
    })
    expect(pace.delta).toBe(-1000)
    expect(pace.monthsBehind).toBe(1)
  })

  it('never expects more than the target, so a finished goal is never behind', () => {
    // long past the end of the schedule
    const pace = goalPace({
      ...plan,
      saved: 12000,
      today: new Date(2027, 5, 15),
    })
    expect(pace.expectedSaved).toBe(12000)
    expect(pace.delta).toBe(0)
    expect(pace.monthsBehind).toBe(0)
  })

  it('survives a 31 Ocak start rolling through Şubat', () => {
    const jan31 = {
      startDate: '2026-01-31',
      monthlyAmount: 1000,
      targetAmount: 6000,
    }
    // 28 Şubat: the 31st never arrives, so Şubat does not add a payment
    expect(
      goalPace({ ...jan31, saved: 1000, today: new Date(2026, 1, 28) })
        .monthsBehind,
    ).toBe(0)
    // 31 Mart: two full months have passed
    expect(
      goalPace({ ...jan31, saved: 1000, today: new Date(2026, 2, 31) })
        .expectedSaved,
    ).toBe(3000)
  })

  it('compares in kuruş, so float dust is not a month of debt', () => {
    const pace = goalPace({
      startDate: '2026-01-15',
      monthlyAmount: 0.1,
      targetAmount: 1,
      saved: 0.1 + 0.2 - 0.2, // 0.10000000000000003
      today: new Date(2026, 0, 20),
    })
    expect(pace.monthsBehind).toBe(0)
    expect(pace.delta).toBe(0)
  })

  it('treats a goal with no monthly plan as never behind', () => {
    const pace = goalPace({
      startDate: '2026-01-15',
      monthlyAmount: 0,
      targetAmount: 100,
      saved: 10,
      today: new Date(2026, 5, 1),
    })
    expect(pace.monthsBehind).toBe(0)
    expect(pace.monthsAhead).toBe(0)
  })
})
