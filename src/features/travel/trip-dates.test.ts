import { describe, expect, it } from 'vitest'

import {
  daysUntil,
  groupTripItemsByDay,
  addDaysISO,
  sortTripItems,
  sortTrips,
  tripDayNumber,
  tripLength,
  tripNights,
  tripDayMap,
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

describe('sortTripItems', () => {
  const row = (
    id: string,
    starts_on: string | null,
    starts_at: string | null,
    created_at = '2026-01-01',
  ) => ({ id, starts_on, starts_at, created_at })

  it('orders by day, then by time, with all-day rows first in a day', () => {
    const sorted = sortTripItems([
      row('c', '2026-09-13', '09:00:00'),
      row('b', '2026-09-12', '20:00:00'),
      row('a', '2026-09-12', null),
    ])
    expect(sorted.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('puts undated rows last, in the order they were written', () => {
    const sorted = sortTripItems([
      row('note2', null, null, '2026-01-02'),
      row('dated', '2026-09-12', null),
      row('note1', null, null, '2026-01-01'),
    ])
    expect(sorted.map((r) => r.id)).toEqual(['dated', 'note1', 'note2'])
  })

  it('does not mutate the input', () => {
    const items = [row('b', '2026-09-13', null), row('a', '2026-09-12', null)]
    sortTripItems(items)
    expect(items.map((r) => r.id)).toEqual(['b', 'a'])
  })
})

describe('addDaysISO', () => {
  it('crosses months, years and a DST change', () => {
    expect(addDaysISO('2026-09-28', 3)).toBe('2026-10-01')
    expect(addDaysISO('2026-12-30', 3)).toBe('2027-01-02')
    expect(addDaysISO('2026-03-27', 3)).toBe('2026-03-30')
    expect(addDaysISO('2026-09-12', -1)).toBe('2026-09-11')
  })
})

describe('tripDayMap', () => {
  const trip = (id: string, starts_on: string, ends_on: string) => ({
    id,
    title: id,
    cover_emoji: null,
    starts_on,
    ends_on,
  })

  it('covers every day of a trip and marks the ends', () => {
    const map = tripDayMap([trip('rome', '2026-09-12', '2026-09-15')])
    expect([...map.keys()]).toEqual([
      '2026-09-12',
      '2026-09-13',
      '2026-09-14',
      '2026-09-15',
    ])
    expect(map.get('2026-09-12')?.isStart).toBe(true)
    expect(map.get('2026-09-12')?.isEnd).toBe(false)
    expect(map.get('2026-09-15')?.isEnd).toBe(true)
    expect(map.get('2026-09-13')?.isStart).toBe(false)
  })

  it('marks a day trip as both ends', () => {
    const map = tripDayMap([trip('day', '2026-09-12', '2026-09-12')])
    expect(map.get('2026-09-12')).toMatchObject({ isStart: true, isEnd: true })
  })

  it('gives an overlapping day to the trip that started first', () => {
    const map = tripDayMap([
      trip('second', '2026-09-14', '2026-09-16'),
      trip('first', '2026-09-12', '2026-09-15'),
    ])
    expect(map.get('2026-09-14')?.tripId).toBe('first')
    expect(map.get('2026-09-16')?.tripId).toBe('second')
  })

  it('falls back to a plane when the trip has no emoji', () => {
    const map = tripDayMap([trip('x', '2026-09-12', '2026-09-12')])
    expect(map.get('2026-09-12')?.emoji).toBe('✈️')
  })

  it('returns an empty map for no trips', () => {
    expect(tripDayMap([]).size).toBe(0)
  })
})

describe('groupTripItemsByDay', () => {
  const row = (
    id: string,
    starts_on: string | null,
    starts_at: string | null = null,
    created_at = '2026-01-01',
  ) => ({ id, starts_on, starts_at, created_at })

  it('groups by day in trip order and keeps the undated rows last', () => {
    const groups = groupTripItemsByDay([
      row('note', null),
      row('dinner', '2026-09-12', '20:00:00'),
      row('museum', '2026-09-13'),
      row('hotel', '2026-09-12'),
    ])
    expect(groups.map((g) => g.iso)).toEqual(['2026-09-12', '2026-09-13', null])
    expect(groups[0].items.map((i) => i.id)).toEqual(['hotel', 'dinner'])
    expect(groups[2].items.map((i) => i.id)).toEqual(['note'])
  })

  it('returns one group when everything shares a day', () => {
    const groups = groupTripItemsByDay([
      row('a', '2026-09-12'),
      row('b', '2026-09-12', '09:00:00'),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].items).toHaveLength(2)
  })

  it('returns nothing for an empty notebook', () => {
    expect(groupTripItemsByDay([])).toEqual([])
  })
})
