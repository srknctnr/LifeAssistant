import { describe, expect, it } from 'vitest'

import { addDays, startOfWeek, weekDays } from '@/features/calendar/week-math'
import { toISODate } from '@/lib/dates'

describe('startOfWeek', () => {
  it('returns Monday for a mid-week day', () => {
    expect(toISODate(startOfWeek(new Date(2026, 6, 8)))).toBe('2026-07-06')
  })

  it('returns the previous Monday for a Sunday', () => {
    expect(toISODate(startOfWeek(new Date(2026, 6, 12)))).toBe('2026-07-06')
  })

  it('keeps a Monday as-is', () => {
    expect(toISODate(startOfWeek(new Date(2026, 6, 6)))).toBe('2026-07-06')
  })
})

describe('weekDays', () => {
  it('builds Monday..Sunday for the anchor week', () => {
    const days = weekDays(new Date(2026, 6, 8)).map(toISODate)
    expect(days).toEqual([
      '2026-07-06',
      '2026-07-07',
      '2026-07-08',
      '2026-07-09',
      '2026-07-10',
      '2026-07-11',
      '2026-07-12',
    ])
  })
})

describe('addDays', () => {
  it('rolls over month boundaries', () => {
    expect(toISODate(addDays(new Date(2026, 6, 30), 3))).toBe('2026-08-02')
  })
})
