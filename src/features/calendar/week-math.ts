export const DAY_INITIALS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

// Monday-based week start (Turkish convention)
export function startOfWeek(date: Date): Date {
  const day = date.getDay() // 0 = Sunday … 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day
  return addDays(date, diff)
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}
