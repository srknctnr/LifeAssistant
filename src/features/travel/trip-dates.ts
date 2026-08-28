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

export interface TripItemOrder {
  starts_on: string | null
  starts_at: string | null
  created_at: string
}

// Dated rows first in day order; within a day the all-day ones come first and
// then the timed ones ascending, matching the calendar (event-day.ts). Undated
// rows (passport, packing) sit last in the order they were written.
export function sortTripItems<T extends TripItemOrder>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.starts_on === null && b.starts_on === null) {
      return a.created_at.localeCompare(b.created_at)
    }
    if (a.starts_on === null) return 1
    if (b.starts_on === null) return -1
    if (a.starts_on !== b.starts_on) {
      return a.starts_on.localeCompare(b.starts_on)
    }
    if (a.starts_at === b.starts_at) {
      return a.created_at.localeCompare(b.created_at)
    }
    if (a.starts_at === null) return -1
    if (b.starts_at === null) return 1
    return a.starts_at.localeCompare(b.starts_at)
  })
}

export interface TripSpan {
  tripId: string
  title: string
  emoji: string
  isStart: boolean
  isEnd: boolean
}

interface TripLike extends TripRange {
  id: string
  title: string
  cover_emoji: string | null
}

// Every day covered by a trip, so the calendar can paint the range as one
// continuous band. Overlapping trips: the one that starts earlier wins the
// day, which keeps the band stable while you scroll.
export function tripDayMap(trips: TripLike[]): Map<string, TripSpan> {
  const days = new Map<string, TripSpan>()
  const ordered = [...trips].sort((a, b) =>
    a.starts_on.localeCompare(b.starts_on),
  )

  for (const trip of ordered) {
    const total = daysBetween(trip.starts_on, trip.ends_on)
    if (total < 0) continue
    for (let offset = 0; offset <= total; offset += 1) {
      const iso = addDaysISO(trip.starts_on, offset)
      if (days.has(iso)) continue
      days.set(iso, {
        tripId: trip.id,
        title: trip.title,
        emoji: trip.cover_emoji ?? '✈️',
        isStart: offset === 0,
        isEnd: offset === total,
      })
    }
  }
  return days
}

// UTC arithmetic, same reason as daysBetween: a DST change must not shift a day
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const shifted = new Date(Date.UTC(y, m - 1, d + days))
  return shifted.toISOString().slice(0, 10)
}

export interface TripItemDay<T> {
  // null is the "no date yet" group, which always comes last
  iso: string | null
  items: T[]
}

// The notebook read as an itinerary: one group per day in trip order, with the
// undated rows (passport, packing) gathered at the end. Days with nothing on
// them are not invented — this groups what exists, it does not lay out a grid.
export function groupTripItemsByDay<T extends TripItemOrder>(
  items: T[],
): TripItemDay<T>[] {
  const groups: TripItemDay<T>[] = []
  for (const item of sortTripItems(items)) {
    const iso = item.starts_on
    const last = groups[groups.length - 1]
    if (last && last.iso === iso) {
      last.items.push(item)
    } else {
      groups.push({ iso, items: [item] })
    }
  }
  return groups
}
