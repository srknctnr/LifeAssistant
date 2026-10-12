import { describe, expect, it } from 'vitest'

import { buildIcs } from '@/features/calendar/ics'

const STAMP = new Date(Date.UTC(2026, 9, 12, 9, 0, 0))

const ics = (
  over: Parameters<typeof buildIcs>[0]['events'] = [],
  reminders: Parameters<typeof buildIcs>[0]['reminders'] = [],
) => buildIcs({ events: over, reminders, stamp: STAMP })

const event = (
  over: Partial<Parameters<typeof buildIcs>[0]['events'][0]> = {},
) => ({
  id: 'e1',
  title: 'Sinema',
  starts_on: '2026-10-15',
  starts_at: null,
  note: null,
  ...over,
})

describe('buildIcs', () => {
  it('wraps the entries in a valid calendar', () => {
    const out = ics([event()])
    expect(out.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(out.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(out).toContain('VERSION:2.0')
    // RFC 5545 wants CRLF and every real parser means it
    expect(out.includes('\n')).toBe(true)
    expect(out.split('\n').every((l) => l === '' || l.endsWith('\r'))).toBe(
      true,
    )
  })

  // DTEND is exclusive for a date value: off by one and every all-day entry
  // spans two days in the user's calendar.
  it('ends an all-day entry the morning after', () => {
    const out = ics([event()])
    expect(out).toContain('DTSTART;VALUE=DATE:20261015')
    expect(out).toContain('DTEND;VALUE=DATE:20261016')
  })

  it('rolls an all-day entry over a month end', () => {
    expect(ics([event({ starts_on: '2026-10-31' })])).toContain(
      'DTEND;VALUE=DATE:20261101',
    )
    expect(ics([event({ starts_on: '2026-12-31' })])).toContain(
      'DTEND;VALUE=DATE:20270101',
    )
  })

  // Floating time: no Z and no TZID, so 19:30 is 19:30 on whatever device
  // opens the file.
  it('writes a timed entry as floating local time', () => {
    const out = ics([event({ starts_at: '19:30:00' })])
    expect(out).toContain('DTSTART:20261015T193000')
    expect(out).not.toContain('DTSTART:20261015T193000Z')
    expect(out).not.toContain('TZID')
  })

  it('puts an alarm on a timed entry and not on an all-day one', () => {
    expect(ics([event({ starts_at: '19:30:00' })])).toContain('TRIGGER:-PT1H')
    expect(ics([event()])).not.toContain('BEGIN:VALARM')
  })

  // Unescaped commas and semicolons end the value early, which silently
  // truncates the title or breaks the file.
  it('escapes what RFC 5545 reserves', () => {
    const out = ics([
      event({ title: 'Market; ekmek, süt', note: 'satır1\nsatır2' }),
    ])
    expect(out).toContain('SUMMARY:Market\\; ekmek\\, süt')
    expect(out).toContain('DESCRIPTION:satır1\\nsatır2')
  })

  it('escapes a backslash before anything else', () => {
    expect(ics([event({ title: 'a\\b' })])).toContain('SUMMARY:a\\\\b')
  })

  // An unfolded long line is where parsers start rejecting the whole file.
  it('folds a line past 75 octets', () => {
    const long =
      'Kapadokya balon turu ve Göreme açık hava müzesi gezisi ile akşam yemeği'
    const out = ics([event({ title: long })])
    const physical = out.split(CRLF_SPLIT)
    expect(
      physical.every((l) => new TextEncoder().encode(l).length <= 75),
    ).toBe(true)
    // and the title survives the fold
    expect(out.replace(/\r\n /g, '')).toContain(`SUMMARY:${long}`)
  })

  it('gives every entry its own stable id', () => {
    const out = ics(
      [event(), event({ id: 'e2' })],
      [{ id: 'r1', title: 'Kira', due_on: '2026-11-01' }],
    )
    expect(out).toContain('UID:event-e1@life-assistant')
    expect(out).toContain('UID:event-e2@life-assistant')
    expect(out).toContain('UID:reminder-r1@life-assistant')
  })

  it('exports reminders as all-day entries', () => {
    const out = ics(
      [],
      [{ id: 'r1', title: 'Kira günü', due_on: '2026-11-01' }],
    )
    expect(out).toContain('DTSTART;VALUE=DATE:20261101')
    expect(out).toContain('SUMMARY:Kira günü')
  })

  it('is still a valid calendar with nothing in it', () => {
    const out = ics()
    expect(out).toContain('BEGIN:VCALENDAR')
    expect(out).toContain('END:VCALENDAR')
    expect(out).not.toContain('BEGIN:VEVENT')
  })

  // VALARM is a sub-component; strict parsers want the component's own
  // properties before it.
  it('puts the alarm after the properties it belongs to', () => {
    const out = ics([event({ starts_at: '19:30:00' })])
    expect(out.indexOf('SUMMARY:')).toBeLessThan(out.indexOf('BEGIN:VALARM'))
    expect(out.indexOf('BEGIN:VALARM')).toBeLessThan(out.indexOf('END:VEVENT'))
  })
})

const CRLF_SPLIT = '\r\n'
