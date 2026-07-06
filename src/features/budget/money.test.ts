import { describe, expect, it } from 'vitest'

import { monthlyEquivalent, monthlyExpenseTotal } from '@/features/budget/money'

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

  it('treats one-time expenses as non-recurring', () => {
    expect(monthlyEquivalent(500, 'once')).toBe(0)
  })
})

describe('monthlyExpenseTotal', () => {
  const today = new Date(2026, 6, 6) // 6 Temmuz 2026

  it('normalizes recurring expenses to monthly', () => {
    const total = monthlyExpenseTotal(
      [
        { amount: 100, period: 'monthly', expense_date: null },
        { amount: 120, period: 'weekly', expense_date: null },
      ],
      today,
    )
    expect(total).toBeCloseTo(620)
  })

  it('counts one-time expenses dated in the current month', () => {
    const total = monthlyExpenseTotal(
      [
        { amount: 100, period: 'monthly', expense_date: null },
        { amount: 300, period: 'once', expense_date: '2026-07-10' },
      ],
      today,
    )
    expect(total).toBe(400)
  })

  it('excludes one-time expenses from other months', () => {
    const total = monthlyExpenseTotal(
      [{ amount: 300, period: 'once', expense_date: '2026-08-01' }],
      today,
    )
    expect(total).toBe(0)
  })
})
