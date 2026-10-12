interface IcsEvent {
  id: string
  title: string
  starts_on: string
  /** 'HH:MM:SS' from Postgres `time`, or null for an all-day entry */
  starts_at: string | null
  note: string | null
}

interface IcsReminder {
  id: string
  title: string
  due_on: string
}

// RFC 5545 wants CRLF, and every real parser means it.
const CRLF = '\r\n'

/**
 * Folds a content line to 75 octets, continuing with a leading space.
 *
 * Not optional: an unfolded long SUMMARY is where parsers start rejecting the
 * whole file, and a trip called "Kapadokya balon turu ve Göreme açık hava
 * müzesi" is already past the limit.
 */
function fold(line: string): string {
  const bytes = [...new TextEncoder().encode(line)]
  if (bytes.length <= 75) return line
  const parts: string[] = []
  let cut = 0
  while (cut < bytes.length) {
    const size = parts.length === 0 ? 75 : 74
    parts.push(
      new TextDecoder().decode(new Uint8Array(bytes.slice(cut, cut + size))),
    )
    cut += size
  }
  return parts.join(`${CRLF} `)
}

/** escapes the characters RFC 5545 reserves inside a TEXT value */
function esc(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

const compactDate = (iso: string) => iso.replace(/-/g, '')

function nextDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  return next.toISOString().slice(0, 10).replace(/-/g, '')
}

/**
 * Builds an .ics calendar from the app's own events and reminders.
 *
 * Times are written as RFC 5545 "floating" local time — no Z, no TZID, no
 * VTIMEZONE. That is deliberate and it is also the laziest correct answer:
 * 19:30 means 19:30 on whatever device opens the file, which is exactly what
 * a personal calendar entry means. Pinning a zone would mean either carrying
 * a VTIMEZONE block or hardcoding Turkey's +03, and both are work that buys
 * a wrong answer the day the user travels.
 *
 * `stamp` is passed in rather than read from the clock so the output is
 * reproducible and testable.
 */
export function buildIcs(input: {
  events: IcsEvent[]
  reminders: IcsReminder[]
  stamp: Date
}): string {
  const dtstamp = `${input.stamp.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Life Assistant//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Life Assistant',
  ]

  for (const event of input.events) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:event-${event.id}@life-assistant`)
    lines.push(`DTSTAMP:${dtstamp}`)
    if (event.starts_at) {
      const start = `${compactDate(event.starts_on)}T${event.starts_at.slice(0, 8).replace(/:/g, '')}`
      lines.push(`DTSTART:${start}`)
      lines.push('DURATION:PT1H')
    } else {
      // DTEND is exclusive for a date value, so a one-day entry ends the
      // morning after — off by one here and every all-day entry spans two.
      lines.push(`DTSTART;VALUE=DATE:${compactDate(event.starts_on)}`)
      lines.push(`DTEND;VALUE=DATE:${nextDay(event.starts_on)}`)
    }
    lines.push(`SUMMARY:${esc(event.title)}`)
    if (event.note) lines.push(`DESCRIPTION:${esc(event.note)}`)
    // The alarm goes last: VALARM is a sub-component, and strict parsers
    // expect the component's own properties before it. An hour before is the
    // default every calendar app offers, and a timed entry the user bothered
    // to give a clock to is one they want nudging about.
    if (event.starts_at) {
      lines.push('BEGIN:VALARM')
      lines.push('TRIGGER:-PT1H')
      lines.push('ACTION:DISPLAY')
      lines.push(`DESCRIPTION:${esc(event.title)}`)
      lines.push('END:VALARM')
    }
    lines.push('END:VEVENT')
  }

  for (const reminder of input.reminders) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:reminder-${reminder.id}@life-assistant`)
    lines.push(`DTSTAMP:${dtstamp}`)
    lines.push(`DTSTART;VALUE=DATE:${compactDate(reminder.due_on)}`)
    lines.push(`DTEND;VALUE=DATE:${nextDay(reminder.due_on)}`)
    lines.push(`SUMMARY:${esc(reminder.title)}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.map(fold).join(CRLF) + CRLF
}
