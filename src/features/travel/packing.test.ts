import { describe, expect, it } from 'vitest'

import {
  buildPackingView,
  groupPackingByCategory,
  mergePackingTitles,
  packingCheckedLabel,
  packingProgress,
  packingSources,
  packingTitleKey,
  type PackingItemLike,
} from '@/features/travel/packing'

const ME = 'me'
const AYSE = 'ayse'

function item(overrides: Partial<PackingItemLike> = {}): PackingItemLike {
  return {
    id: 'i1',
    title: 'Pasaport',
    category: null,
    is_group_item: false,
    trip_packing_checks: [],
    ...overrides,
  }
}

function check(user_id: string, checked_at = '2026-09-01T10:00:00Z') {
  return { user_id, checked_at }
}

describe('buildPackingView', () => {
  // The whole slice turns on this pair of rules.
  it('leaves a personal item unpacked for you when someone else ticks it', () => {
    const [row] = buildPackingView(
      [item({ trip_packing_checks: [check(AYSE)] })],
      ME,
    )
    expect(row.done).toBe(false)
    expect(row.mineChecked).toBe(false)
    expect(row.checkedBy).toEqual([AYSE])
  })

  it('closes a group item for everyone as soon as anyone has it', () => {
    const [row] = buildPackingView(
      [
        item({
          title: 'Çadır',
          is_group_item: true,
          trip_packing_checks: [check(AYSE)],
        }),
      ],
      ME,
    )
    expect(row.done).toBe(true)
    expect(row.mineChecked).toBe(false)
  })

  it('counts your own tick on a personal item', () => {
    const [row] = buildPackingView(
      [item({ trip_packing_checks: [check(AYSE), check(ME)] })],
      ME,
    )
    expect(row.done).toBe(true)
    expect(row.mineChecked).toBe(true)
  })

  it('orders the names by when they ticked', () => {
    const [row] = buildPackingView(
      [
        item({
          trip_packing_checks: [
            check(ME, '2026-09-02T10:00:00Z'),
            check(AYSE, '2026-09-01T10:00:00Z'),
          ],
        }),
      ],
      ME,
    )
    expect(row.checkedBy).toEqual([AYSE, ME])
  })

  it('shows nothing as yours before the session is known', () => {
    const [row] = buildPackingView(
      [item({ trip_packing_checks: [check(AYSE)] })],
      undefined,
    )
    expect(row.mineChecked).toBe(false)
    expect(row.done).toBe(false)
  })
})

describe('packingProgress', () => {
  it('counts what is done for YOU, not what is ticked in total', () => {
    const rows = buildPackingView(
      [
        item({ id: 'a', trip_packing_checks: [check(ME)] }),
        item({ id: 'b', trip_packing_checks: [check(AYSE)] }), // hers, not mine
        item({
          id: 'c',
          is_group_item: true,
          trip_packing_checks: [check(AYSE)],
        }),
        item({ id: 'd' }),
      ],
      ME,
    )
    expect(packingProgress(rows)).toEqual({ done: 2, total: 4, ratio: 0.5 })
  })

  it('does not divide by zero on an empty list', () => {
    expect(packingProgress([])).toEqual({ done: 0, total: 0, ratio: 0 })
  })
})

describe('groupPackingByCategory', () => {
  it('keeps uncategorized items last, like the itinerary does with undated rows', () => {
    const rows = buildPackingView(
      [
        item({ id: 'a', category: 'Giyim' }),
        item({ id: 'b', category: null }),
        item({ id: 'c', category: 'Elektronik' }),
        item({ id: 'd', category: 'Giyim' }),
        item({ id: 'e', category: '   ' }),
      ],
      ME,
    )
    const groups = groupPackingByCategory(rows)
    expect(groups.map((g) => g.category)).toEqual(['Giyim', 'Elektronik', null])
    expect(groups[0].rows).toHaveLength(2)
    expect(groups[2].rows).toHaveLength(2) // null and blank fall together
  })

  it('omits the loose group entirely when everything is categorized', () => {
    const rows = buildPackingView([item({ category: 'Giyim' })], ME)
    expect(groupPackingByCategory(rows).map((g) => g.category)).toEqual([
      'Giyim',
    ])
  })
})

describe('mergePackingTitles', () => {
  it('drops what is already on the list, ignoring case and padding', () => {
    expect(
      mergePackingTitles(['Pasaport', 'Şarj aleti'], ['  pasaport ', 'Mayo']),
    ).toEqual(['Mayo'])
  })

  it('drops repeats inside the incoming list too', () => {
    expect(mergePackingTitles([], ['Mayo', 'mayo', 'MAYO'])).toEqual(['Mayo'])
  })

  it('skips blank titles rather than inserting rows the check constraint rejects', () => {
    expect(mergePackingTitles([], ['  ', 'Mayo', ''])).toEqual(['Mayo'])
  })

  // The database's title_key is SQL lower(), which uses Unicode's SIMPLE case
  // mapping. A tr-locale fold would map I to ı where Postgres keeps i — and
  // plain toLowerCase, which this first shipped with, turns İ into i + U+0307
  // where Postgres gives a bare i. Both disagree with the unique constraint,
  // and the disagreement is silent: the upsert just drops the row.
  it('folds I the way Postgres does, not the way Turkish does', () => {
    expect(mergePackingTitles(['Islak mendil'], ['ISLAK MENDIL'])).toEqual([])
  })

  it('folds İ the way Postgres does, not the way JavaScript does', () => {
    expect(mergePackingTitles(['İlaç'], ['ilaç'])).toEqual([])
    expect(mergePackingTitles(['ilaç'], ['İLAÇ'])).toEqual([])
    expect(packingTitleKey('İlaçlar')).toBe('ilaçlar')
    // no stray combining mark survives to make the key un-comparable
    expect(packingTitleKey('İlaçlar')).toHaveLength(7)
  })
})

describe('packingCheckedLabel', () => {
  const row = (
    overrides: Partial<PackingItemLike>,
    checks: { user_id: string; checked_at: string }[],
  ) =>
    buildPackingView(
      [item({ ...overrides, trip_packing_checks: checks })],
      ME,
    )[0]

  it('says nothing on a personal trip', () => {
    expect(packingCheckedLabel(row({}, [check(AYSE)]), false, ME)).toBeNull()
  })

  it('says nothing when nobody else has touched it', () => {
    expect(packingCheckedLabel(row({}, [check(ME)]), true, ME)).toBeNull()
    expect(packingCheckedLabel(row({}, []), true, ME)).toBeNull()
  })

  it('counts the others on a personal item', () => {
    const r = row({}, [check(AYSE), check('ali'), check(ME)])
    expect(packingCheckedLabel(r, true, ME)).toBe('2 kişi hazırladı')
  })

  // The bug the first version shipped: this branch hardcoded "1 kişi", so it
  // under-reported at exactly the moment a shared item was fully covered.
  it('counts the others on a group item you have also ticked', () => {
    const r = row({ is_group_item: true }, [
      check(AYSE),
      check('ali'),
      check('veli'),
      check(ME),
    ])
    expect(packingCheckedLabel(r, true, ME)).toBe('sen ve 3 kişi aldı')
  })

  it('counts them when you have not ticked it yourself', () => {
    const r = row({ is_group_item: true }, [check(AYSE), check('ali')])
    expect(packingCheckedLabel(r, true, ME)).toBe('2 kişi aldı')
  })
})

describe('packingCheckedLabel with names', () => {
  const names: Record<string, string> = {
    ayse: 'Ayşe',
    ali: 'Ali',
    veli: 'Veli',
  }
  const nameOf = (id: string) => names[id]
  const row = (
    overrides: Partial<PackingItemLike>,
    checks: { user_id: string; checked_at: string }[],
  ) =>
    buildPackingView(
      [item({ ...overrides, trip_packing_checks: checks })],
      ME,
    )[0]

  it('names one person instead of counting them', () => {
    const r = row({ is_group_item: true }, [check(AYSE)])
    expect(packingCheckedLabel(r, true, ME, nameOf)).toBe('Ayşe aldı')
  })

  it('names two', () => {
    const r = row({}, [check(AYSE), check('ali')])
    expect(packingCheckedLabel(r, true, ME, nameOf)).toBe('Ayşe, Ali hazırladı')
  })

  it('keeps the row one line by counting the tail', () => {
    const r = row({}, [check(AYSE), check('ali'), check('veli')])
    expect(packingCheckedLabel(r, true, ME, nameOf)).toBe(
      'Ayşe, Ali ve 1 kişi hazırladı',
    )
  })

  it('says "sen ve" on a group item you also ticked', () => {
    const r = row({ is_group_item: true }, [check(AYSE), check(ME)])
    expect(packingCheckedLabel(r, true, ME, nameOf)).toBe('sen ve Ayşe aldı')
  })

  it('falls back to a count for a member it cannot name', () => {
    const r = row({}, [check('eski-uye')])
    expect(packingCheckedLabel(r, true, ME, nameOf)).toBe('1 kişi hazırladı')
  })

  it('still works with no name source at all', () => {
    const r = row({}, [check(AYSE), check('ali')])
    expect(packingCheckedLabel(r, true, ME)).toBe('2 kişi hazırladı')
  })
})

describe('packingSources', () => {
  const trips = [
    { id: 't1', starts_on: '2026-03-01' },
    { id: 't2', starts_on: '2026-08-01' },
    { id: 't3', starts_on: '2026-01-01' },
  ]
  const items = [
    { trip_id: 't1' },
    { trip_id: 't1' },
    { trip_id: 't2' },
    { trip_id: 'current' },
  ]

  it('offers trips that have a list, newest departure first', () => {
    const sources = packingSources(items, trips, 'current')
    expect(sources.map((s) => s.trip.id)).toEqual(['t2', 't1'])
    expect(sources.map((s) => s.count)).toEqual([1, 2])
  })

  it('never offers the trip you are standing in', () => {
    const sources = packingSources(
      items,
      [...trips, { id: 'current', starts_on: '2026-09-01' }],
      'current',
    )
    expect(sources.map((s) => s.trip.id)).not.toContain('current')
  })

  it('skips trips with no packing rows', () => {
    expect(
      packingSources(items, trips, 'current').map((s) => s.trip.id),
    ).not.toContain('t3')
  })
})
