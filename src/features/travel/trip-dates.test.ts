import { describe, expect, it } from 'vitest'

import {
  daysUntil,
  sortTrips,
  tripDayNumber,
  tripLength,
  tripNights,
  tripPhase,
} from '@/features/travel/trip-dates'

const today = '2026-09-01'
const rome = { starts_on: '2026-09-12', ends_on: '2026-09-19' }

describe('tripPhase', () => {
  it('counts both boundary days as being on the trip', () => {
    expect(tripPhase(rome, '2026-09-12')).toBe('ongoing')
    expect(tripPhase(rome, '2026-09-19')).toBe('ongoing')
  })

  it('separates upcoming from past', () => {
    expect(tripPhase(rome, '2026-09-11')).toBe('upcoming')
    expect(tripPhase(rome, '2026-09-20')).toBe('past')
  })

  it('handles a day trip', () => {
    const day = { starts_on: '2026-09-12', ends_on: '2026-09-12' }
    expect(tripPhase(day, '2026-09-12')).toBe('ongoing')
    expect(tripPhase(day, '2026-09-13')).toBe('past')
  })
})

describe('daysUntil', () => {
  it('counts the days to departure', () => {
    expect(daysUntil(rome.starts_on, today)).toBe(11)
    expect(daysUntil(rome.starts_on, '2026-09-12')).toBe(0)
  })

  it('crosses month and year boundaries', () => {
    expect(daysUntil('2026-10-01', '2026-09-28')).toBe(3)
    expect(daysUntil('2027-01-02', '2026-12-30')).toBe(3)
  })

  it('goes negative once the date has passed', () => {
    expect(daysUntil('2026-09-12', '2026-09-15')).toBe(-3)
  })

  it('is unaffected by a DST change in between', () => {
    // Turkey keeps a fixed offset, but the helper must not depend on that
    expect(daysUntil('2026-03-30', '2026-03-27')).toBe(3)
    expect(daysUntil('2026-11-02', '2026-10-30')).toBe(3)
  })
})

describe('tripNights / tripLength', () => {
  it('counts nights between the two days', () => {
    expect(tripNights(rome.starts_on, rome.ends_on)).toBe(7)
    expect(tripLength(rome)).toBe(8)
  })

  it('gives a day trip zero nights and one day', () => {
    expect(tripNights('2026-09-12', '2026-09-12')).toBe(0)
    expect(tripLength({ starts_on: '2026-09-12', ends_on: '2026-09-12' })).toBe(
      1,
    )
  })
})

describe('tripDayNumber', () => {
  it('numbers the days of an ongoing trip from one', () => {
    expect(tripDayNumber(rome, '2026-09-12')).toBe(1)
    expect(tripDayNumber(rome, '2026-09-14')).toBe(3)
    expect(tripDayNumber(rome, '2026-09-19')).toBe(8)
  })

  it('is null outside the trip', () => {
    expect(tripDayNumber(rome, '2026-09-11')).toBeNull()
    expect(tripDayNumber(rome, '2026-09-20')).toBeNull()
  })
})

describe('sortTrips', () => {
  it('puts the trip you are on first, then the next ones, then history', () => {
    const trips = [
      { id: 'past', starts_on: '2026-05-01', ends_on: '2026-05-05' },
      { id: 'later', starts_on: '2026-12-01', ends_on: '2026-12-10' },
      { id: 'now', starts_on: '2026-08-30', ends_on: '2026-09-03' },
      { id: 'soon', starts_on: '2026-09-12', ends_on: '2026-09-19' },
      { id: 'older', starts_on: '2026-01-01', ends_on: '2026-01-05' },
    ]
    expect(sortTrips(trips, today).map((t) => t.id)).toEqual([
      'now',
      'soon',
      'later',
      'past',
      'older',
    ])
  })

  it('does not mutate the input', () => {
    const trips = [
      { id: 'b', starts_on: '2026-12-01', ends_on: '2026-12-10' },
      { id: 'a', starts_on: '2026-09-12', ends_on: '2026-09-19' },
    ]
    sortTrips(trips, today)
    expect(trips.map((t) => t.id)).toEqual(['b', 'a'])
  })
})
