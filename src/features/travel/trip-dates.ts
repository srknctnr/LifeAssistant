import { todayISO } from '@/lib/dates'

export interface TripRange {
  starts_on: string
  ends_on: string
}

export type TripPhase = 'upcoming' | 'ongoing' | 'past'

// Both boundary days count as being on the trip: you are in Rome on the day
// you land and on the day you fly home.
export function tripPhase(trip: TripRange, today = todayISO()): TripPhase {
  if (today < trip.starts_on) return 'upcoming'
  if (today > trip.ends_on) return 'past'
  return 'ongoing'
}

// Whole days between two ISO dates. Parsed as UTC on purpose — mixing
// new Date('YYYY-MM-DD') with local getters is how DST silently eats a day.
function toUtc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000)
}

export function daysUntil(startsOn: string, today = todayISO()): number {
  return daysBetween(today, startsOn)
}

export function tripNights(startsOn: string, endsOn: string): number {
  return Math.max(0, daysBetween(startsOn, endsOn))
}

// "3. gün / 8" while the trip is running; null outside it
export function tripDayNumber(
  trip: TripRange,
  today = todayISO(),
): number | null {
  if (tripPhase(trip, today) !== 'ongoing') return null
  return daysBetween(trip.starts_on, today) + 1
}

export function tripLength(trip: TripRange): number {
  return daysBetween(trip.starts_on, trip.ends_on) + 1
}

// Ongoing first (you are in it now), then the next departures, then history
// most recent first. Sorts a copy.
export function sortTrips<T extends TripRange>(
  trips: T[],
  today = todayISO(),
): T[] {
  const rank: Record<TripPhase, number> = { ongoing: 0, upcoming: 1, past: 2 }
  return [...trips].sort((a, b) => {
    const pa = tripPhase(a, today)
    const pb = tripPhase(b, today)
    if (pa !== pb) return rank[pa] - rank[pb]
    if (pa === 'past') return b.starts_on.localeCompare(a.starts_on)
    return a.starts_on.localeCompare(b.starts_on)
  })
}
