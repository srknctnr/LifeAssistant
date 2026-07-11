const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function formatDate(isoDate: string | Date): string {
  const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate
  return dateFormatter.format(date)
}

export function toISODate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

export function todayISO(): string {
  return toISODate(new Date())
}
