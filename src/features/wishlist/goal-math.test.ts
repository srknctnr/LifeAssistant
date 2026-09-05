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
  // 12.000₺ over four months of 3.000₺, target date 6 Kasım 2026 — the shape
  // ConvertForm produces: monthly = ceil(target / monthsUntil(date))
  const plan = {
    targetDate: '2026-11-06',
    monthlyAmount: 3000,
    targetAmount: 12000,
  }

  it('owes nothing on the day the goal is created', () => {
    // the reminder for this month is not due until the 30th; the pace line
    // must not contradict it by saying the goal is already a month behind
    const pace = goalPace({ ...plan, saved: 0, today: new Date(2026, 6, 6) })
    expect(pace?.expectedSaved).toBe(0)
    expect(pace?.monthsBehind).toBe(0)
  })

  it('still owes nothing on the last day of the opening month', () => {
    const pace = goalPace({ ...plan, saved: 0, today: new Date(2026, 6, 31) })
    expect(pace?.monthsBehind).toBe(0)
  })

  it('owes the first payment once the opening month has passed', () => {
    const pace = goalPace({ ...plan, saved: 0, today: new Date(2026, 7, 1) })
    expect(pace?.expectedSaved).toBe(3000)
    expect(pace?.monthsBehind).toBe(1)
  })

  it('is on plan when the payments kept up', () => {
    const pace = goalPace({
      ...plan,
      saved: 3000,
      today: new Date(2026, 7, 15),
    })
    expect(pace?.delta).toBe(0)
    expect(pace?.monthsBehind).toBe(0)
    expect(pace?.monthsAhead).toBe(0)
  })

  it('counts two missed months as two', () => {
    const pace = goalPace({ ...plan, saved: 0, today: new Date(2026, 8, 10) })
    expect(pace?.expectedSaved).toBe(6000)
    expect(pace?.monthsBehind).toBe(2)
  })

  it('reports being ahead', () => {
    const pace = goalPace({
      ...plan,
      saved: 6000,
      today: new Date(2026, 7, 15),
    })
    expect(pace?.delta).toBe(3000)
    expect(pace?.monthsAhead).toBe(1)
  })

  it('rounds a part-month shortfall up to a whole month', () => {
    const pace = goalPace({
      ...plan,
      saved: 2000,
      today: new Date(2026, 7, 15),
    })
    expect(pace?.delta).toBe(-1000)
    expect(pace?.monthsBehind).toBe(1)
  })

  it('expects the whole target once the target month has arrived', () => {
    const pace = goalPace({
      ...plan,
      saved: 9000,
      today: new Date(2026, 10, 1),
    })
    expect(pace?.expectedSaved).toBe(12000)
    expect(pace?.monthsBehind).toBe(1)
  })

  it('expects the whole target after the date has passed, not one payment less', () => {
    const pace = goalPace({ ...plan, saved: 9000, today: new Date(2027, 2, 1) })
    expect(pace?.expectedSaved).toBe(12000)
    expect(pace?.delta).toBe(-3000)
  })

  it('never expects more than the target, so a saved-up goal is never behind', () => {
    const pace = goalPace({
      ...plan,
      saved: 12000,
      today: new Date(2027, 2, 1),
    })
    expect(pace?.delta).toBe(0)
    expect(pace?.monthsBehind).toBe(0)
  })

  // The two halves of re-planning have to agree: accepting a new plan means
  // being on it. Both presets in GoalPlanForm solve remaining = monthly ×
  // months-left, which is exactly the equation goalPace measures.
  describe('after a re-plan', () => {
    const behind = goalPace({
      ...plan,
      saved: 3000,
      today: new Date(2026, 9, 1),
    })

    it('was behind before the re-plan', () => {
      expect(behind?.monthsBehind).toBe(2) // 9.000 due, 3.000 saved
    })

    it('"Tarihi ertele" — keep the monthly amount, push the date — lands on plan', () => {
      // 9.000 left at 3.000/ay needs three more months: Kasım, Aralık, Ocak
      const pace = goalPace({
        ...plan,
        targetDate: '2027-01-01',
        saved: 3000,
        today: new Date(2026, 9, 1),
      })
      expect(pace?.monthsBehind).toBe(0)
      expect(pace?.delta).toBe(0)
    })

    it('"Aynı tarihe yetiş" — raise the monthly amount, keep the date — lands on plan', () => {
      // 9.000 left over the one month still ahead
      const pace = goalPace({
        ...plan,
        monthlyAmount: 9000,
        saved: 3000,
        today: new Date(2026, 9, 1),
      })
      expect(pace?.monthsBehind).toBe(0)
    })

    it('does not charge a raised monthly amount to months already paid', () => {
      // the old bug: 7.000 saved exactly on plan at 1.000/ay, target rises to
      // 18.000, the preset sets 2.200 — and the goal read "4 ay geride"
      const pace = goalPace({
        targetDate: '2026-12-05',
        monthlyAmount: 2200,
        targetAmount: 18000,
        saved: 7000,
        today: new Date(2026, 6, 5),
      })
      expect(pace?.monthsBehind).toBe(0)
    })

    it('does not credit a long saver with phantom months ahead', () => {
      // 30.000 of 45.000 saved over a year, three months left at 5.000
      const pace = goalPace({
        targetDate: '2026-10-01',
        monthlyAmount: 5000,
        targetAmount: 45000,
        saved: 30000,
        today: new Date(2026, 6, 1),
      })
      expect(pace?.monthsAhead).toBe(0)
      expect(pace?.monthsBehind).toBe(0)
    })
  })

  it('compares in kuruş, so float dust is not a month of debt', () => {
    const pace = goalPace({
      targetDate: '2026-08-06',
      monthlyAmount: 0.1,
      targetAmount: 0.2,
      saved: 0.1 + 0.2 - 0.2, // 0.10000000000000003
      today: new Date(2026, 6, 6),
    })
    expect(pace?.delta).toBe(0)
    expect(pace?.monthsBehind).toBe(0)
  })

  it('has nothing to measure without a target date or a monthly amount', () => {
    expect(goalPace({ ...plan, targetDate: null, saved: 0 })).toBeNull()
    expect(goalPace({ ...plan, monthlyAmount: 0, saved: 0 })).toBeNull()
  })
})
