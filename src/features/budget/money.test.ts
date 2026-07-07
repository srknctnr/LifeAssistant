import { describe, expect, it } from 'vitest'

import {
  expenseTotalsByCategory,
  monthlyEquivalent,
  monthlyExpenseTotal,
  monthlyFlowSeries,
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

describe('monthlyFlowSeries', () => {
  const today = new Date(2026, 6, 6) // Temmuz 2026

  it('builds the requested window around the current month', () => {
    const series = monthlyFlowSeries({
      incomes: [],
      expenses: [],
      monthsBack: 2,
      monthsForward: 3,
      today,
    })
    expect(series.map((m) => m.key)).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ])
  })

  it('starts recurring items from their creation month', () => {
    const series = monthlyFlowSeries({
      incomes: [
        {
          amount: 60000,
          income_date: null,
          created_at: '2026-06-10T00:00:00Z',
        },
      ],
      expenses: [
        {
          amount: 15000,
          period: 'monthly',
          expense_date: null,
          is_active: true,
          created_at: '2026-07-01T00:00:00Z',
        },
      ],
      monthsBack: 2,
      monthsForward: 1,
      today,
    })
    const byKey = Object.fromEntries(series.map((m) => [m.key, m]))
    expect(byKey['2026-05']).toMatchObject({ income: 0, expense: 0 })
    expect(byKey['2026-06']).toMatchObject({ income: 60000, expense: 0 })
    expect(byKey['2026-07']).toMatchObject({ income: 60000, expense: 15000 })
    expect(byKey['2026-08']).toMatchObject({ income: 60000, expense: 15000 })
  })

  it('places one-time items and skips inactive ones', () => {
    const series = monthlyFlowSeries({
      incomes: [
        {
          amount: 10000,
          income_date: '2026-09-15',
          created_at: '2026-07-01T00:00:00Z',
        },
      ],
      expenses: [
        {
          amount: 300,
          period: 'once',
          expense_date: '2026-08-10',
          is_active: true,
          created_at: '2026-07-01T00:00:00Z',
        },
        {
          amount: 9000,
          period: 'monthly',
          expense_date: null,
          is_active: false,
          created_at: '2026-07-01T00:00:00Z',
        },
      ],
      monthsBack: 0,
      monthsForward: 2,
      today,
    })
    const byKey = Object.fromEntries(series.map((m) => [m.key, m]))
    expect(byKey['2026-07']).toMatchObject({ income: 0, expense: 0 })
    expect(byKey['2026-08']).toMatchObject({ income: 0, expense: 300 })
    expect(byKey['2026-09']).toMatchObject({ income: 10000, expense: 0 })
  })
})
