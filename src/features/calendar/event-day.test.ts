import { describe, expect, it } from 'vitest'

import {
  busyDates,
  eventsOnDay,
  sortDayEvents,
} from '@/features/calendar/event-day'

const allDay = { id: 'a', starts_on: '2026-07-24', starts_at: null }
const evening = { id: 'b', starts_on: '2026-07-24', starts_at: '20:30:00' }
const morning = { id: 'c', starts_on: '2026-07-24', starts_at: '09:00:00' }
const otherDay = { id: 'd', starts_on: '2026-07-25', starts_at: '12:00:00' }

describe('sortDayEvents', () => {
  it('puts all-day events before timed ones', () => {
    expect(sortDayEvents([evening, allDay]).map((e) => e.id)).toEqual([
      'a',
      'b',
    ])
  })

  it('sorts timed events ascending', () => {
    expect(sortDayEvents([evening, morning]).map((e) => e.id)).toEqual([
      'c',
      'b',
    ])
  })

  it('keeps the input order of two all-day events', () => {
    const second = { id: 'z', starts_on: '2026-07-24', starts_at: null }
    expect(sortDayEvents([allDay, second]).map((e) => e.id)).toEqual(['a', 'z'])
  })

  it('does not mutate the input', () => {
    const input = [evening, allDay]
    sortDayEvents(input)
    expect(input.map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('returns an empty array for empty input', () => {
    expect(sortDayEvents([])).toEqual([])
  })
})

describe('eventsOnDay', () => {
  it('filters by exact ISO date and returns them sorted', () => {
    const result = eventsOnDay(
      [otherDay, evening, allDay, morning],
      '2026-07-24',
    )
    expect(result.map((e) => e.id)).toEqual(['a', 'c', 'b'])
  })

  it('returns an empty array when nothing matches', () => {
    expect(eventsOnDay([otherDay], '2026-07-24')).toEqual([])
  })
})

describe('busyDates', () => {
  it('dedupes days that carry several events', () => {
    const set = busyDates([allDay, evening, morning, otherDay])
    expect([...set].sort()).toEqual(['2026-07-24', '2026-07-25'])
  })

  it('returns an empty set for empty input', () => {
    expect(busyDates([]).size).toBe(0)
  })
})
