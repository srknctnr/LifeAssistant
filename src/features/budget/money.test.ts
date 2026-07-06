import { describe, expect, it } from 'vitest'

import { monthlyEquivalent } from '@/features/budget/money'

describe('monthlyEquivalent', () => {
  it('converts weekly amounts using 52 weeks per year', () => {
    expect(monthlyEquivalent(120, 'weekly')).toBeCloseTo(520)
  })

  it('keeps monthly amounts as-is', () => {
    expect(monthlyEquivalent(100, 'monthly')).toBe(100)
  })

  it('divides yearly amounts by 12', () => {
    expect(monthlyEquivalent(1200, 'yearly')).toBe(100)
  })
})
