import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CalendarGrid } from '@/features/calendar/CalendarGrid'
import type { TripSpan } from '@/features/travel/trip-dates'
import { toISODate } from '@/lib/dates'

// Monday-first week, the same shape weekDays()/monthGrid() hand over
const week = Array.from(
  { length: 7 },
  (_, index) => new Date(2026, 8, 7 + index),
)
const departure = week[0]
const departureISO = toISODate(departure)

function span(overrides: Partial<TripSpan> = {}): TripSpan {
  return {
    tripId: 'roma',
    title: 'Roma',
    emoji: '✈️',
    isStart: true,
    isEnd: false,
    ...overrides,
  }
}

function renderGrid(busy: string[], tripDays: [string, TripSpan][]) {
  render(
    <CalendarGrid
      weeks={[week]}
      selectedISO={toISODate(week[3])}
      anchorMonth={8}
      busy={new Set(busy)}
      tripDays={new Map(tripDays)}
      onSelect={() => {}}
    />,
  )
}

describe('CalendarGrid trip band', () => {
  it('marks the departure day with the trip emoji', () => {
    renderGrid([], [[departureISO, span()]])
    expect(screen.getByText('✈️')).toBeInTheDocument()
  })

  // "Takvime ekle" files an all-day anchor event on the trip's first day, so
  // the departure day of a filed trip is always busy. While the dot and the
  // emoji shared one slot the dot won, and the emoji was missing on exactly
  // the trips the user had put on the calendar.
  it('still shows the emoji when the departure day also carries an event', () => {
    renderGrid([departureISO], [[departureISO, span()]])
    expect(screen.getByText('✈️')).toBeInTheDocument()
  })

  it('marks only the start of the run', () => {
    renderGrid(
      [],
      [
        [departureISO, span()],
        [toISODate(week[1]), span({ isStart: false, isEnd: true })],
      ],
    )
    expect(screen.getAllByText('✈️')).toHaveLength(1)
  })

  it('names the trip for screen readers on every day it covers', () => {
    renderGrid([], [[departureISO, span()]])
    expect(screen.getByRole('button', { name: /Roma/ })).toBeInTheDocument()
  })
})
