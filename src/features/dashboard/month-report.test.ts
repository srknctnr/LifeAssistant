import { describe, expect, it } from 'vitest'

import {
  monthSpendTotal,
  monthlyExpenseTotal,
  monthlyIncomeTotal,
} from '@/features/budget/money'
import {
  buildMonthReport,
  monthReportIsNews,
} from '@/features/dashboard/month-report'

const TODAY = new Date(2026, 8, 3) // 3 Eylül 2026 → rapor Ağustos'u anlatır

const incomes = [
  { amount: 60000, income_date: null, created_at: '2025-01-01T00:00:00Z' },
]
const expenses = [
  {
    amount: 29000,
    period: 'monthly' as const,
    expense_date: null,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
] // harcanabilir: 31.000₺

function tx(amount: number, spent_on: string, category: string | null = null) {
  return { amount, category, spent_on }
}

const base = {
  incomes,
  expenses,
  contributions: [],
  movies: [],
  trips: [],
  today: TODAY,
}

describe('buildMonthReport', () => {
  it('reports the month before today by default', () => {
    const report = buildMonthReport({
      ...base,
      transactions: [tx(1000, '2026-08-10'), tx(500, '2026-09-01')],
    })
    expect(report?.key).toBe('2026-08')
    expect(report?.spent).toBe(1000) // eylül sayılmaz
    expect(report?.spendable).toBe(31000)
    expect(report?.left).toBe(30000)
  })

  it('says nothing about a month the user was not here for', () => {
    const report = buildMonthReport({
      ...base,
      incomes: [
        {
          amount: 60000,
          income_date: null,
          created_at: '2026-09-01T00:00:00Z',
        },
      ],
      expenses: [],
      transactions: [],
    })
    expect(report).toBeNull()
  })

  it('reports a month that was overspent as overspent', () => {
    const report = buildMonthReport({
      ...base,
      transactions: [tx(36000, '2026-08-15')],
    })
    expect(report?.left).toBe(-5000)
  })

  // The report and the budget page must not describe one month differently.
  it('agrees with the budget page, because it asks the same functions', () => {
    const transactions = [
      tx(1200.5, '2026-08-02', 'Market'),
      tx(800, '2026-08-19', 'Ulaşım'),
    ]
    const report = buildMonthReport({ ...base, transactions })
    const august = new Date(2026, 7, 1)
    expect(report?.spent).toBe(monthSpendTotal(transactions, august))
    expect(report?.spendable).toBe(
      monthlyIncomeTotal(incomes, august) -
        monthlyExpenseTotal(expenses, august),
    )
  })

  it('names the three biggest categories with their share of the month', () => {
    const report = buildMonthReport({
      ...base,
      transactions: [
        tx(5000, '2026-08-02', 'Market'),
        tx(3000, '2026-08-05', 'Ulaşım'),
        tx(1500, '2026-08-09', 'Kahve'),
        tx(500, '2026-08-11', 'Kitap'),
      ],
    })
    expect(report?.topCategories.map((c) => c.category)).toEqual([
      'Market',
      'Ulaşım',
      'Kahve',
    ])
    expect(report?.topCategories[0].share).toBeCloseTo(0.5)
  })

  it('compares with the month before it', () => {
    const report = buildMonthReport({
      ...base,
      transactions: [tx(1000, '2026-08-10'), tx(2500, '2026-07-14')],
    })
    expect(report?.spentBefore).toBe(2500)
  })

  // A zero from a month nobody used is not an improvement to celebrate.
  it('refuses to compare against a month with no record at all', () => {
    const report = buildMonthReport({
      ...base,
      transactions: [tx(1000, '2026-08-10')],
    })
    expect(report?.spentBefore).toBeNull()
  })

  it('counts what else happened that month', () => {
    const report = buildMonthReport({
      ...base,
      transactions: [tx(1000, '2026-08-10')],
      contributions: [
        { amount: 3000, contributed_on: '2026-08-05' },
        { amount: 9000, contributed_on: '2026-09-05' },
      ],
      movies: [
        { watched_on: '2026-08-08' },
        { watched_on: '2026-08-20' },
        { watched_on: '2026-07-30' },
        { watched_on: null },
      ],
      trips: [
        {
          title: 'Kapadokya',
          cover_emoji: '🎈',
          starts_on: '2026-08-12',
          ends_on: '2026-08-16',
        },
        {
          title: 'Roma',
          cover_emoji: null,
          starts_on: '2026-10-01',
          ends_on: '2026-10-05',
        },
      ],
    })
    expect(report?.saved).toBe(3000)
    expect(report?.moviesWatched).toBe(2)
    expect(report?.trips).toEqual([{ title: 'Kapadokya', emoji: '🎈' }])
  })

  it('counts a trip that only clipped the month', () => {
    const report = buildMonthReport({
      ...base,
      transactions: [tx(1000, '2026-08-10')],
      trips: [
        {
          title: 'Uzun yol',
          cover_emoji: '🚗',
          starts_on: '2026-07-28',
          ends_on: '2026-09-02',
        },
      ],
    })
    expect(report?.trips).toHaveLength(1)
  })

  it('can be pointed at any month, not just last one', () => {
    const report = buildMonthReport({
      ...base,
      transactions: [tx(444, '2026-06-10')],
      month: new Date(2026, 5, 1),
    })
    expect(report?.key).toBe('2026-06')
    expect(report?.spent).toBe(444)
  })
})

describe('monthReportIsNews', () => {
  const report = buildMonthReport({
    ...base,
    transactions: [tx(1000, '2026-08-10')],
  })

  it('shows a report the user has not dismissed', () => {
    expect(monthReportIsNews(report, null)).toBe(true)
    expect(monthReportIsNews(report, '2026-07')).toBe(true)
  })

  it('stays gone once dismissed', () => {
    expect(monthReportIsNews(report, '2026-08')).toBe(false)
  })

  it('has nothing to show when there is no report', () => {
    expect(monthReportIsNews(null, null)).toBe(false)
  })

  // A recap that expires mid-month would hide from the person who opens the
  // app once every few weeks — the one who has actually missed the month.
  it('does not expire partway through the month', () => {
    expect(monthReportIsNews(report, null)).toBe(true)
  })
})

describe('buildMonthReport refuses a verdict it cannot support', () => {
  // A month the user never opened the app in looks exactly like a month of
  // perfect restraint. Congratulating them for 31.000₺ they did not save is
  // the fastest way to make the whole card untrustworthy.
  it('says nothing about a month with a plan but no logged spending', () => {
    expect(
      buildMonthReport({ ...base, transactions: [tx(500, '2026-09-03')] }),
    ).toBeNull()
  })

  // Nothing to exceed means nobody exceeded anything.
  it('says nothing when there was no plan to measure against', () => {
    expect(
      buildMonthReport({
        ...base,
        incomes: [],
        expenses: [],
        transactions: [tx(500, '2026-08-03')],
      }),
    ).toBeNull()
  })

  it('still reports a month that has both', () => {
    const report = buildMonthReport({
      ...base,
      transactions: [tx(1000, '2026-08-10')],
    })
    expect(report?.left).toBe(30000)
  })
})
