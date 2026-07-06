import { describe, expect, it } from 'vitest'

import {
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
