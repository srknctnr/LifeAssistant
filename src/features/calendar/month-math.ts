import { addDays, startOfWeek } from '@/features/calendar/week-math'

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date: Date, months: number): Date {
  // Clamp the day so 31 Ocak + 1 ay lands on the last day of February
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate()
  return new Date(
    target.getFullYear(),
    target.getMonth(),
    Math.min(date.getDate(), lastDay),
  )
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

// Monday-first grid covering the whole month: always full weeks, so the
// month view keeps a stable 7-column layout (5 or 6 rows)
export function monthGrid(anchor: Date): Date[][] {
  const first = startOfMonth(anchor)
  const gridStart = startOfWeek(first)
  const lastOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)

  const weeks: Date[][] = []
  let cursor = gridStart
  do {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)))
    cursor = addDays(cursor, 7)
  } while (cursor <= lastOfMonth)

  return weeks
}
