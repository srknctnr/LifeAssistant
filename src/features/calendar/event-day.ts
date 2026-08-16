// Pure derivations for the day panel and the grid dots. Structural types so
// tests can pass bare literals; no Date objects — ISO dates and 'HH:MM:SS'
// times compare correctly as strings.

export interface DayEvent {
  starts_on: string
  starts_at: string | null
}

// All-day events first, then timed ones ascending. Sorts a copy.
export function sortDayEvents<T extends DayEvent>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    if (a.starts_at === b.starts_at) return 0
    if (a.starts_at === null) return -1
    if (b.starts_at === null) return 1
    return a.starts_at.localeCompare(b.starts_at)
  })
}

export function eventsOnDay<T extends DayEvent>(events: T[], iso: string): T[] {
  return sortDayEvents(events.filter((e) => e.starts_on === iso))
}

// ISO days carrying at least one event — drives the grid dots. Built once per
// render by the page, never per cell.
export function busyDates(events: DayEvent[]): Set<string> {
  return new Set(events.map((e) => e.starts_on))
}
