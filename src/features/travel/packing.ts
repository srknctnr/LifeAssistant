export interface PackingCheckLike {
  user_id: string
  checked_at: string
}

export interface PackingItemLike {
  id: string
  title: string
  category: string | null
  is_group_item: boolean
  trip_packing_checks: PackingCheckLike[]
}

export interface PackingRow {
  item: PackingItemLike
  /** whether YOU have ticked it */
  mineChecked: boolean
  /** everyone who has ticked it, in the order they did */
  checkedBy: string[]
  /** whether it counts as handled for you — the rule below */
  done: boolean
}

/**
 * One definition of "packed", used by every surface that shows this list.
 *
 * The whole slice turns on this: "pasaport" is four passports and four ticks,
 * "çadır" is one object and one tick. So a group item is done the moment
 * ANYONE has it, and a personal item is done only when YOU do — your row is
 * never closed by somebody else's hands.
 */
export function buildPackingView(
  items: PackingItemLike[],
  userId: string | undefined,
): PackingRow[] {
  return items.map((item) => {
    const checkedBy = [...item.trip_packing_checks]
      .sort((a, b) => a.checked_at.localeCompare(b.checked_at))
      .map((c) => c.user_id)
    const mineChecked = userId !== undefined && checkedBy.includes(userId)
    return {
      item,
      mineChecked,
      checkedBy,
      done: item.is_group_item ? checkedBy.length > 0 : mineChecked,
    }
  })
}

export function packingProgress(rows: PackingRow[]): {
  done: number
  total: number
  ratio: number
} {
  const done = rows.filter((r) => r.done).length
  return {
    done,
    total: rows.length,
    ratio: rows.length ? done / rows.length : 0,
  }
}

/**
 * Category headings, uncategorized last — the same rule the itinerary uses for
 * undated rows, so the two lists in one Sheet read the same way.
 */
export function groupPackingByCategory(
  rows: PackingRow[],
): { category: string | null; rows: PackingRow[] }[] {
  const groups = new Map<string, PackingRow[]>()
  const loose: PackingRow[] = []

  for (const row of rows) {
    const category = row.item.category?.trim()
    if (!category) {
      loose.push(row)
      continue
    }
    const bucket = groups.get(category)
    if (bucket) bucket.push(row)
    else groups.set(category, [row])
  }

  const named = [...groups.entries()].map(([category, rows]) => ({
    category,
    rows,
  }))
  return loose.length > 0 ? [...named, { category: null, rows: loose }] : named
}

/**
 * The key the database compares titles by, reproduced here.
 *
 * title_key is `lower(btrim(title))`, and Postgres lower() uses Unicode's
 * SIMPLE case mapping, where İ (U+0130) becomes a bare i. JavaScript's
 * toLowerCase() uses the FULL mapping and yields i + U+0307 instead — so the
 * two disagree on precisely the letter Turkish leans on hardest, and the
 * disagreement is invisible: the client decides a title is new, the unique
 * constraint decides it is a duplicate, and the upsert drops it.
 *
 * A tr-locale fold would be worse still, mapping I to ı where Postgres keeps
 * i. So: normalize İ first, lowercase, then strip the combining dot the full
 * mapping leaves behind.
 */
export function packingTitleKey(title: string): string {
  return title.trim().replace(/İ/g, 'i').toLowerCase().replace(/̇/g, '')
}

/** Titles to actually insert when a list is copied or a template applied. */
export function mergePackingTitles(
  existing: string[],
  incoming: string[],
): string[] {
  const seen = new Set(existing.map(packingTitleKey))
  const out: string[] = []

  for (const raw of incoming) {
    const title = raw.trim()
    if (!title) continue
    const key = packingTitleKey(title)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(title)
  }
  return out
}

export interface PackingTemplate {
  key: string
  label: string
  emoji: string
  titles: string[]
}

// Plain data, not a table: a saved-template table would be a third surface to
// secure for something the "copy a previous trip" button already covers.
export const PACKING_TEMPLATES: PackingTemplate[] = [
  {
    key: 'temel',
    label: 'Temel',
    emoji: '🧳',
    titles: [
      'Kimlik / pasaport',
      'Şarj aleti',
      'Powerbank',
      'İlaçlar',
      'Diş fırçası',
      'İç çamaşırı',
      'Çorap',
      'Pijama',
    ],
  },
  {
    key: 'yaz',
    label: 'Yaz',
    emoji: '🏖️',
    titles: [
      'Mayo',
      'Güneş kremi',
      'Güneş gözlüğü',
      'Havlu',
      'Şapka',
      'Terlik',
    ],
  },
  {
    key: 'kis',
    label: 'Kış',
    emoji: '🧣',
    titles: ['Mont', 'Atkı', 'Bere', 'Eldiven', 'Termal içlik', 'Bot'],
  },
  {
    key: 'bebek',
    label: 'Bebekli',
    emoji: '🍼',
    titles: [
      'Bez',
      'Islak mendil',
      'Mama',
      'Biberon',
      'Yedek kıyafet',
      'Battaniye',
    ],
  },
  {
    key: 'is',
    label: 'İş',
    emoji: '💼',
    titles: [
      'Dizüstü',
      'Dizüstü şarjı',
      'Gömlek',
      'Ayakkabı boyası',
      'Kartvizit',
    ],
  },
]

/**
 * The line under a row that says what the rest of the group has done.
 *
 * A string, but it lives here rather than in the component for the reason the
 * first version proved: written inline, one of its three branches quietly
 * hardcoded the count as "1 kişi", and nothing could catch it — the pure tests
 * did not reach it and no test renders the component.
 *
 * Returns null when there is nothing worth saying: a personal trip, or a
 * personal item nobody else has touched.
 */
export function packingCheckedLabel(
  row: PackingRow,
  isGroupTrip: boolean,
  userId: string | undefined,
  nameOf?: (id: string) => string | undefined,
): string | null {
  if (!isGroupTrip) return null
  const others = row.checkedBy.filter((id) => id !== userId)
  if (others.length === 0) return null

  // Names beat a count — "Ayşe aldı" ends the question, "1 kişi aldı" starts
  // one. Two at most, because the row is one line: beyond that the tail is
  // still a count, and the count is what tells the group whether anyone needs
  // to bring the thing.
  const named = others
    .map((id) => nameOf?.(id))
    .filter((n): n is string => Boolean(n))
  const rest = others.length - named.length
  const shown = named.slice(0, 2)
  const hidden = named.length - shown.length + rest

  const who =
    shown.length === 0
      ? `${others.length} kişi`
      : hidden > 0
        ? `${shown.join(', ')} ve ${hidden} kişi`
        : shown.join(', ')

  const verb = row.item.is_group_item ? 'aldı' : 'hazırladı'
  return row.item.is_group_item && row.mineChecked
    ? `sen ve ${who} ${verb}`
    : `${who} ${verb}`
}

export interface PackingSource<T> {
  trip: T
  count: number
}

/**
 * Which earlier trips have a list worth copying.
 *
 * Nothing new is asked of the database: the rows this reads are the ones RLS
 * already lets the caller see, so a trip appears here exactly when its list
 * could be opened directly. The current trip is never offered as its own
 * source.
 */
export function packingSources<T extends { id: string; starts_on: string }>(
  items: { trip_id: string }[],
  trips: T[],
  currentTripId: string,
): PackingSource<T>[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    if (item.trip_id === currentTripId) continue
    counts.set(item.trip_id, (counts.get(item.trip_id) ?? 0) + 1)
  }

  return trips
    .filter((trip) => counts.has(trip.id))
    .map((trip) => ({ trip, count: counts.get(trip.id) ?? 0 }))
    .sort((a, b) => b.trip.starts_on.localeCompare(a.trip.starts_on))
}
