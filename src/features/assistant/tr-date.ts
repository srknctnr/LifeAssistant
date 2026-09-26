import { MONTHS_TR, WEEKDAYS_TR, foldTrIndexed } from '@/lib/turkish'
import { toISODate } from '@/lib/dates'

export interface DateMatch {
  /** yyyy-mm-dd */
  iso: string
  /** the exact words consumed, so the caller can strip them and show its work */
  text: string
  /** where in the folded input the match started */
  index: number
  length: number
}

export interface TimeMatch {
  /** HH:MM */
  time: string
  text: string
  index: number
  length: number
}

// Dates are built by walking a local Date so "yarın" means the next calendar
// day the user will actually live through. Arithmetic on ISO strings would
// need UTC to survive DST, and this deliberately does not: the day someone
// means when they type "yarın" is a local one.
function shift(today: Date, days: number): string {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

function fromParts(year: number, month: number, day: number): string | null {
  const d = new Date(year, month - 1, day)
  // reject 31 Nisan and friends: Date rolls them forward silently
  if (d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return toISODate(d)
}

/** days from `today` forward to the next `weekday` (0 = Monday), today = 0 */
function daysUntilWeekday(today: Date, weekday: number): number {
  const current = (today.getDay() + 6) % 7 // JS Sunday=0 → Monday=0
  return (weekday - current + 7) % 7
}

// Longest first, so "öbür gün" is not eaten by "gün" and "haftaya cuma" beats
// a bare "cuma".
const RELATIVE: { word: string; days: number }[] = [
  { word: 'obur gun', days: 2 },
  { word: 'oburgun', days: 2 },
  { word: 'bugun', days: 0 },
  { word: 'yarin', days: 1 },
  { word: 'dun', days: -1 },
]

const NEXT_WEEK = ['haftaya', 'gelecek hafta', 'onumuzdeki hafta', 'gelecek']

/**
 * Finds the first date expression in a Turkish sentence.
 *
 * Deliberately conservative: it returns null rather than guessing. A quick
 * entry that silently files something on the wrong day is worse than one that
 * asks, because the wrong day is invisible until the thing is missed.
 */
export function findDate(input: string, today = new Date()): DateMatch | null {
  const { text, at } = foldTrIndexed(input)
  const candidates: DateMatch[] = []

  // folded indices are translated back through the map, so the words handed
  // to the caller are the ones the user actually typed
  const push = (iso: string | null, index: number, length: number) => {
    if (!iso) return
    const from = at[index]
    const to = at[index + length] ?? input.length
    candidates.push({
      iso,
      text: input.slice(from, to),
      index: from,
      length: to - from,
    })
  }

  // 2026-10-15
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    push(fromParts(+m[1], +m[2], +m[3]), m.index, m[0].length)
  }

  // 15/10/2026, 15.10.2026 — and the year-less forms.
  //
  // "5.10 TL" matches this shape too and would quietly become 5 October. A
  // currency word right after the number settles it: that is money, and a
  // date parser has no business touching it.
  const money = /^\s*(tl|₺|lira)/
  for (const m of text.matchAll(
    /\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/g,
  )) {
    if (money.test(text.slice(m.index + m[0].length))) continue
    if (text[m.index - 1] === '₺') continue
    const day = +m[1]
    const month = +m[2]
    let year = m[3] ? +m[3] : today.getFullYear()
    if (m[3] && m[3].length === 2) year += 2000
    const iso = fromParts(year, month, day)
    // a year-less date that has already passed means the next one
    if (iso && !m[3] && iso < toISODate(today)) {
      push(fromParts(year + 1, month, day), m.index, m[0].length)
    } else {
      push(iso, m.index, m[0].length)
    }
  }

  // 3 Ekim / 3 Ekim 2026
  const monthWords = MONTHS_TR.join('|')
  for (const m of text.matchAll(
    new RegExp(`\\b(\\d{1,2})\\s+(${monthWords})(?:\\s+(\\d{4}))?\\b`, 'g'),
  )) {
    const day = +m[1]
    const month = MONTHS_TR.indexOf(m[2] as (typeof MONTHS_TR)[number]) + 1
    const year = m[3] ? +m[3] : today.getFullYear()
    const iso = fromParts(year, month, day)
    if (iso && !m[3] && iso < toISODate(today)) {
      push(fromParts(year + 1, month, day), m.index, m[0].length)
    } else {
      push(iso, m.index, m[0].length)
    }
  }

  // bugün / yarın / öbür gün / dün
  for (const r of RELATIVE) {
    const i = text.indexOf(r.word)
    if (i > -1) push(shift(today, r.days), i, r.word.length)
  }

  // "3 gün sonra" / "2 hafta sonra" / "5 gün önce"
  for (const m of text.matchAll(
    /\b(\d{1,3})\s+(gun|hafta)\s+(sonra|once)\b/g,
  )) {
    const unit = m[2] === 'hafta' ? 7 : 1
    const sign = m[3] === 'once' ? -1 : 1
    push(shift(today, +m[1] * unit * sign), m.index, m[0].length)
  }

  // "hafta sonu" → the coming Saturday
  const weekendAt = text.indexOf('hafta sonu')
  if (weekendAt > -1) {
    push(
      shift(today, daysUntilWeekday(today, 5)),
      weekendAt,
      'hafta sonu'.length,
    )
  }

  // weekday, optionally prefixed by "haftaya" / "gelecek hafta"
  for (let w = 0; w < WEEKDAYS_TR.length; w++) {
    const word = WEEKDAYS_TR[w]
    // \b would not fire before Turkish suffixes like "cumaya"; match the word
    // and let the suffix stay in the title
    const re = new RegExp(`\\b${word}\\b`, 'g')
    for (const m of text.matchAll(re)) {
      // "cumartesi" contains "cuma": skip a match that is only part of a
      // longer weekday name
      if (word === 'cuma' && text.startsWith('cumartesi', m.index)) continue
      const before = text.slice(Math.max(0, m.index - 20), m.index)
      const nextWeek = NEXT_WEEK.some((p) => before.includes(p))
      let days = daysUntilWeekday(today, w)
      // "haftaya cuma" is never today and never this week's Friday
      if (nextWeek) days += 7
      push(shift(today, days), m.index, m[0].length)
    }
  }

  if (!candidates.length) return null
  // earliest mention wins; a tie goes to the longer, more specific phrase
  candidates.sort((a, b) => a.index - b.index || b.length - a.length)
  return candidates[0]
}

// Each part of day gets its own rule rather than a shared "add twelve".
// "akşam 8" is 20:00, "gece 12" is midnight, but "sabah 12" and "öğlen 12"
// are both noon — one blanket rule gets at least one of those wrong.
const DAYPARTS: { word: string; hour: (h: number) => number }[] = [
  // the morning never shifts: it is already the small hours
  { word: 'sabah', hour: (h) => h },
  // "öğlen 1" is 13:00, but "öğlen 11" is nobody's afternoon — only the
  // hours that plausibly follow noon move
  { word: 'ogleden sonra', hour: (h) => (h >= 1 && h <= 6 ? h + 12 : h) },
  { word: 'oglen', hour: (h) => (h >= 1 && h <= 6 ? h + 12 : h) },
  { word: 'aksam', hour: (h) => (h === 12 ? 0 : h < 12 ? h + 12 : h) },
  { word: 'gece', hour: (h) => (h === 12 ? 0 : h < 12 ? h + 12 : h) },
]

/**
 * Finds a clock time.
 *
 * Only reads a time that is actually written down. "Akşam sinemaya gidelim"
 * gets no time at all rather than a made-up 20:00 — an invented hour on a
 * reminder is indistinguishable from one the user chose.
 */
export function findTime(
  input: string,
  skip?: DateMatch | null,
): TimeMatch | null {
  const { text, at } = foldTrIndexed(input)
  // `skip` carries source indices, so the folded match has to be translated
  // before the two ranges can be compared at all
  const blocked = (i: number, len: number) => {
    if (!skip) return false
    const from = at[i]
    const to = at[i + len] ?? input.length
    return from < skip.index + skip.length && skip.index < to
  }

  const make = (
    h: number,
    min: number,
    index: number,
    length: number,
  ): TimeMatch | null => {
    if (h > 23 || min > 59) return null
    const from = at[index]
    const to = at[index + length] ?? input.length
    return {
      time: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
      text: input.slice(from, to),
      index: from,
      length: to - from,
    }
  }

  // 19:30 — a colon is unambiguous
  for (const m of text.matchAll(/\b(\d{1,2}):(\d{2})\b/g)) {
    if (blocked(m.index, m[0].length)) continue
    const hit = make(+m[1], +m[2], m.index, m[0].length)
    if (hit) return hit
  }

  // "saat 19", "saat 19.30" — the word carries the meaning the colon would
  for (const m of text.matchAll(/\bsaat\s+(\d{1,2})(?:[.:](\d{2}))?\b/g)) {
    if (blocked(m.index, m[0].length)) continue
    const hit = make(+m[1], m[2] ? +m[2] : 0, m.index, m[0].length)
    if (hit) return hit
  }

  // "akşam 8", "sabah 9.30" — the daypart decides am/pm
  for (const part of DAYPARTS) {
    const re = new RegExp(
      `\\b${part.word}\\s+(\\d{1,2})(?:[.:](\\d{2}))?\\b`,
      'g',
    )
    for (const m of text.matchAll(re)) {
      if (blocked(m.index, m[0].length)) continue
      const hit = make(part.hour(+m[1]), m[2] ? +m[2] : 0, m.index, m[0].length)
      if (hit) return hit
    }
  }

  return null
}
