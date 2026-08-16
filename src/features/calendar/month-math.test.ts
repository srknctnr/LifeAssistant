import { describe, expect, it } from 'vitest'

import {
  addMonths,
  isSameMonth,
  monthGrid,
  startOfMonth,
} from '@/features/calendar/month-math'
import { toISODate } from '@/lib/dates'

describe('startOfMonth', () => {
  it('returns the first day of the month', () => {
    expect(toISODate(startOfMonth(new Date(2026, 6, 24)))).toBe('2026-07-01')
  })
})

describe('addMonths', () => {
  it('moves forward and backward', () => {
    expect(toISODate(addMonths(new Date(2026, 6, 15), 1))).toBe('2026-08-15')
    expect(toISODate(addMonths(new Date(2026, 6, 15), -1))).toBe('2026-06-15')
  })

  it('crosses year boundaries', () => {
    expect(toISODate(addMonths(new Date(2026, 11, 10), 1))).toBe('2027-01-10')
    expect(toISODate(addMonths(new Date(2026, 0, 10), -1))).toBe('2025-12-10')
  })

  it('clamps to the last day of a shorter month', () => {
    expect(toISODate(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-28')
    expect(toISODate(addMonths(new Date(2024, 0, 31), 1))).toBe('2024-02-29')
  })
})

describe('isSameMonth', () => {
  it('compares year and month only', () => {
    expect(isSameMonth(new Date(2026, 6, 1), new Date(2026, 6, 31))).toBe(true)
    expect(isSameMonth(new Date(2026, 6, 31), new Date(2026, 7, 1))).toBe(false)
    expect(isSameMonth(new Date(2025, 6, 1), new Date(2026, 6, 1))).toBe(false)
  })
})

describe('monthGrid', () => {
  it('starts on the Monday of the first week and covers the month', () => {
    // 1 Temmuz 2026 is a Wednesday -> grid starts Monday 29 Haziran
    const weeks = monthGrid(new Date(2026, 6, 24))
    expect(toISODate(weeks[0][0])).toBe('2026-06-29')
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    const last = weeks[weeks.length - 1][6]
    expect(toISODate(last)).toBe('2026-08-02')
  })

  it('uses exactly as many weeks as the month needs', () => {
    // Mart 2026 starts on a Sunday and has 31 days -> spills into 6 rows
    expect(monthGrid(new Date(2026, 2, 10))).toHaveLength(6)
    // Subat 2026 also starts on a Sunday but 28 days fit in 5 rows
    expect(monthGrid(new Date(2026, 1, 10))).toHaveLength(5)
    // Temmuz 2026 fits in 5 rows
    expect(monthGrid(new Date(2026, 6, 10))).toHaveLength(5)
  })

  it('contains every day of the month exactly once', () => {
    const anchor = new Date(2026, 6, 10)
    const days = monthGrid(anchor).flat().map(toISODate)
    const inMonth = days.filter((iso) => iso.startsWith('2026-07'))
    expect(inMonth).toHaveLength(31)
    expect(new Set(days).size).toBe(days.length)
  })
})
