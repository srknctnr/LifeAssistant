import { describe, expect, it } from 'vitest'

import {
  expenseTotalsByCategory,
  monthlyEquivalent,
  monthlyExpenseTotal,
  monthlyFlowSeries,
  monthlyIncomeTotal,
  monthSpendTotal,
  paceReport,
  transactionTotalsByCategory,
} from '@/features/budget/money'
import { toMinor } from '@/features/expenses/split-math'

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

describe('paceReport', () => {
  // 10 Temmuz 2026: 31 günlük ayın 10. günü, 22 gün kaldı
  const today = new Date(2026, 6, 10)

  it('computes remaining, daily allowance and an on-track projection', () => {
    const report = paceReport({
      monthlyIncome: 60000,
      plannedExpense: 29000,
      transactions: [
        { amount: 5000, spent_on: '2026-07-03' },
        { amount: 3000, spent_on: '2026-07-08' },
        { amount: 1000, spent_on: '2026-06-30' }, // önceki ay, sayılmaz
      ],
      today,
    })
    expect(report.spendable).toBe(31000)
    expect(report.spent).toBe(8000)
    expect(report.remaining).toBe(23000)
    expect(report.daysLeft).toBe(22)
    expect(report.dailyAllowance).toBeCloseTo(23000 / 22)
    expect(report.projectedTotal).toBeCloseTo(24800)
    expect(report.onTrack).toBe(true)
  })

  it('flags an unsustainable burn rate', () => {
    const report = paceReport({
      monthlyIncome: 60000,
      plannedExpense: 29000,
      transactions: [{ amount: 15000, spent_on: '2026-07-05' }],
      today,
    })
    expect(report.projectedTotal).toBeCloseTo(46500)
    expect(report.onTrack).toBe(false)
  })

  it('clamps the daily allowance at zero when over budget', () => {
    const report = paceReport({
      monthlyIncome: 10000,
      plannedExpense: 8000,
      transactions: [{ amount: 5000, spent_on: '2026-07-02' }],
      today,
    })
    expect(report.remaining).toBe(-3000)
    expect(report.dailyAllowance).toBe(0)
  })
})

describe('paceReport — bugün', () => {
  const today = new Date(2026, 6, 10) // 10 Temmuz 2026, ayın 31 günü var
  const base = { monthlyIncome: 60000, plannedExpense: 29000, today } // 31.000₺

  it('gives today its share of what the other days left behind', () => {
    const report = paceReport({
      ...base,
      transactions: [{ amount: 9000, spent_on: '2026-07-03' }],
    })
    // 22.000₺ over the 22 days from the 10th to the 31st
    expect(report.daysLeft).toBe(22)
    expect(report.todayBudget).toBe(1000)
    expect(report.todayLeft).toBe(1000)
    expect(report.spentToday).toBe(0)
  })

  // The invariant the whole slice exists for. dailyAllowance moves by
  // amount/daysLeft, which is why logging a spend used to feel ignored.
  it('a spend logged today leaves the headline by exactly its own size', () => {
    const before = paceReport({
      ...base,
      transactions: [{ amount: 9000, spent_on: '2026-07-03' }],
    })
    const after = paceReport({
      ...base,
      transactions: [
        { amount: 9000, spent_on: '2026-07-03' },
        { amount: 200, spent_on: '2026-07-10' },
      ],
    })
    expect(toMinor(before.todayLeft) - toMinor(after.todayLeft)).toBe(20000)
    // today's budget must not notice today's own spending, or the drop shrinks
    expect(after.todayBudget).toBe(before.todayBudget)
    expect(after.spentToday).toBe(200)
    // for contrast: the old number barely moves
    expect(before.dailyAllowance - after.dailyAllowance).toBeCloseTo(200 / 22)
  })

  it('holds to the kuruş, so 349,90₺ moves it by 349,90₺', () => {
    const before = paceReport({ ...base, transactions: [] })
    const after = paceReport({
      ...base,
      transactions: [{ amount: 349.9, spent_on: '2026-07-10' }],
    })
    // exact in kuruş; two lira floats subtracted are not, which is why every
    // comparison in this codebase happens in minor units
    expect(toMinor(before.todayLeft) - toMinor(after.todayLeft)).toBe(34990)
  })

  it('lets a blown day read negative rather than clamping it to zero', () => {
    const report = paceReport({
      ...base,
      transactions: [{ amount: 4000, spent_on: '2026-07-10' }],
    })
    expect(report.todayBudget).toBeGreaterThan(0)
    expect(report.todayLeft).toBeLessThan(0)
  })

  it('spreads yesterday overspend across the days left instead of zeroing today', () => {
    const report = paceReport({
      ...base,
      transactions: [{ amount: 20000, spent_on: '2026-07-09' }],
    })
    expect(report.todayBudget).toBe(500) // 11.000 / 22
    expect(report.todayLeft).toBe(500)
  })

  it('gives nothing to spend once the month itself is spent', () => {
    const report = paceReport({
      ...base,
      transactions: [
        { amount: 35000, spent_on: '2026-07-02' },
        { amount: 200, spent_on: '2026-07-10' },
      ],
    })
    expect(report.todayBudget).toBe(0)
    expect(report.todayLeft).toBe(-200) // still moves 1:1
  })

  it('counts only rows dated today, not the rest of the month', () => {
    const report = paceReport({
      ...base,
      transactions: [
        { amount: 100, spent_on: '2026-07-09' },
        { amount: 200, spent_on: '2026-07-10' },
        { amount: 400, spent_on: '2026-07-11' }, // ileri tarihli
        { amount: 800, spent_on: '2026-06-10' }, // önceki ay
      ],
    })
    expect(report.spentToday).toBe(200)
  })

  it('hands the whole remainder over on the last day, and promises no tomorrow', () => {
    const report = paceReport({
      monthlyIncome: 60000,
      plannedExpense: 29000,
      transactions: [{ amount: 30000, spent_on: '2026-07-02' }],
      today: new Date(2026, 6, 31),
    })
    expect(report.daysLeft).toBe(1)
    expect(report.todayBudget).toBe(1000)
    expect(report.tomorrowRate).toBeNull()
  })

  it("tomorrow's rate is tomorrow's budget, so the forecast cannot contradict it", () => {
    const transactions = [{ amount: 9000, spent_on: '2026-07-03' }]
    const tonight = paceReport({ ...base, transactions })
    const tomorrow = paceReport({
      ...base,
      transactions,
      today: new Date(2026, 6, 11),
    })
    expect(tonight.tomorrowRate).toBe(tomorrow.todayBudget)
  })

  // The boundary the first version got wrong: a spend can legitimately be
  // dated ahead, and tomorrow's budget will be blind to its own day just as
  // today's is — so tonight's promise has to leave that row out too.
  it('keeps the promise even when a spend is already booked for tomorrow', () => {
    const transactions = [{ amount: 11000, spent_on: '2026-07-11' }]
    const tonight = paceReport({ ...base, transactions })
    const tomorrow = paceReport({
      ...base,
      transactions,
      today: new Date(2026, 6, 11),
    })
    expect(tonight.tomorrowRate).toBe(tomorrow.todayBudget)
  })

  it('does not let a spend dated further out inflate tomorrow', () => {
    const transactions = [{ amount: 11000, spent_on: '2026-07-20' }]
    const tonight = paceReport({ ...base, transactions })
    const tomorrow = paceReport({
      ...base,
      transactions,
      today: new Date(2026, 6, 11),
    })
    expect(tonight.tomorrowRate).toBe(tomorrow.todayBudget)
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

describe('transactionTotalsByCategory', () => {
  const today = new Date(2026, 6, 15) // Temmuz 2026
  const rows = [
    { amount: 250.5, category: 'Market', spent_on: '2026-07-02' },
    { amount: 120.25, category: 'market', spent_on: '2026-07-09' },
    { amount: 80, category: ' Ulaşım ', spent_on: '2026-07-11' },
    { amount: 45, category: null, spent_on: '2026-07-12' },
    { amount: 30, category: '', spent_on: '2026-07-13' },
    { amount: 9999, category: 'Market', spent_on: '2026-06-30' }, // önceki ay
    { amount: 8888, category: 'Market', spent_on: '2026-08-01' }, // sonraki ay
  ]

  it('reports what was actually spent this month, largest first', () => {
    const totals = transactionTotalsByCategory(rows, today)
    expect(totals.map((t) => t.category)).toEqual([
      'Market', // 250,50
      'market', // 120,25 — ayrı bir etiket, aşağıdaki teste bak
      'Ulaşım', // 80
      'Diğer', // 45 + 30
    ])
    expect(totals[0].total).toBe(250.5)
  })

  it('trims the label but does not fold case — the picker decides that, not the sum', () => {
    const totals = transactionTotalsByCategory(rows, today)
    expect(totals.find((t) => t.category === 'Ulaşım')?.total).toBe(80)
    expect(totals.find((t) => t.category === 'market')?.total).toBe(120.25)
  })

  it('groups blank and missing categories together', () => {
    const totals = transactionTotalsByCategory(rows, today)
    expect(totals.find((t) => t.category === 'Diğer')?.total).toBe(75)
  })

  it('sums in kuruş, so a long month of small amounts does not drift', () => {
    const many = Array.from({ length: 300 }, (_, i) => ({
      amount: 0.1,
      category: 'Kahve',
      spent_on: `2026-07-${String((i % 28) + 1).padStart(2, '0')}`,
    }))
    expect(transactionTotalsByCategory(many, today)[0].total).toBe(30)
  })

  it('says nothing for a month with no spending', () => {
    expect(transactionTotalsByCategory(rows, new Date(2026, 8, 15))).toEqual([])
  })
})

describe('monthSpendTotal', () => {
  it('adds up only the month asked for', () => {
    const rows = [
      { amount: 100.1, category: null, spent_on: '2026-07-01' },
      { amount: 200.2, category: null, spent_on: '2026-07-31' },
      { amount: 500, category: null, spent_on: '2026-08-01' },
    ]
    expect(monthSpendTotal(rows, new Date(2026, 6, 15))).toBe(300.3)
    expect(monthSpendTotal(rows, new Date(2026, 7, 15))).toBe(500)
    expect(monthSpendTotal(rows, new Date(2026, 8, 15))).toBe(0)
  })
})
