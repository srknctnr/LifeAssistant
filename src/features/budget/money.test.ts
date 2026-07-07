import { describe, expect, it } from 'vitest'

import {
  expenseTotalsByCategory,
  monthlyEquivalent,
  monthlyExpenseTotal,
  monthlyIncomeTotal,
} from '@/features/budget/money'

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
        { amount: 100, period: 'monthly', expense_date: null, is_active: true },
        { amount: 120, period: 'weekly', expense_date: null, is_active: true },
      ],
      today,
    )
    expect(total).toBeCloseTo(620)
  })

  it('counts one-time expenses dated in the current month', () => {
    const total = monthlyExpenseTotal(
      [
        { amount: 100, period: 'monthly', expense_date: null, is_active: true },
        {
          amount: 300,
          period: 'once',
          expense_date: '2026-07-10',
          is_active: true,
        },
      ],
      today,
    )
    expect(total).toBe(400)
  })

  it('excludes one-time expenses from other months', () => {
    const total = monthlyExpenseTotal(
      [
        {
          amount: 300,
          period: 'once',
          expense_date: '2026-08-01',
          is_active: true,
        },
      ],
      today,
    )
    expect(total).toBe(0)
  })

  it('excludes inactive items (e.g. paused savings goals)', () => {
    const total = monthlyExpenseTotal(
      [
        { amount: 100, period: 'monthly', expense_date: null, is_active: true },
        {
          amount: 9000,
          period: 'monthly',
          expense_date: null,
          is_active: false,
        },
      ],
      today,
    )
    expect(total).toBe(100)
  })
})

describe('expenseTotalsByCategory', () => {
  const today = new Date(2026, 6, 6)

  it('groups by category, largest first, with Diğer for uncategorized', () => {
    const totals = expenseTotalsByCategory(
      [
        {
          amount: 15000,
          period: 'monthly',
          expense_date: null,
          is_active: true,
          category: 'Konut',
        },
        {
          amount: 1200,
          period: 'monthly',
          expense_date: null,
          is_active: true,
          category: null,
        },
        {
          amount: 2000,
          period: 'monthly',
          expense_date: null,
          is_active: true,
          category: 'Konut',
        },
      ],
      today,
    )
    expect(totals).toEqual([
      { category: 'Konut', total: 17000 },
      { category: 'Diğer', total: 1200 },
    ])
  })

  it('skips inactive items and one-time items from other months', () => {
    const totals = expenseTotalsByCategory(
      [
        {
          amount: 500,
          period: 'monthly',
          expense_date: null,
          is_active: false,
          category: 'Konut',
        },
        {
          amount: 300,
          period: 'once',
          expense_date: '2026-08-01',
          is_active: true,
          category: 'Alışveriş',
        },
      ],
      today,
    )
    expect(totals).toEqual([])
  })
})

describe('monthlyIncomeTotal', () => {
  const today = new Date(2026, 6, 6)

  it('counts recurring incomes every month', () => {
    const total = monthlyIncomeTotal(
      [{ amount: 60000, income_date: null }],
      today,
    )
    expect(total).toBe(60000)
  })

  it('counts one-time incomes only in their own month', () => {
    const total = monthlyIncomeTotal(
      [
        { amount: 60000, income_date: null },
        { amount: 10000, income_date: '2026-07-15' },
        { amount: 5000, income_date: '2026-08-15' },
      ],
      today,
    )
    expect(total).toBe(70000)
  })
})
