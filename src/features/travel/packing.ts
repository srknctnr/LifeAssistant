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
 * Titles to actually insert when a list is copied or a template applied.
 *
 * Folded with plain toLowerCase rather than the Turkish locale on purpose: the
 * database's title_key is SQL lower(), and matching it here keeps the client's
 * idea of "already on the list" the same as the unique constraint's. A
 * tr-locale fold would map I to ı and disagree with the row it is checking
 * against.
 */
export function mergePackingTitles(
  existing: string[],
  incoming: string[],
): string[] {
  const seen = new Set(existing.map((t) => t.trim().toLowerCase()))
  const out: string[] = []

  for (const raw of incoming) {
    const title = raw.trim()
    if (!title) continue
    const key = title.toLowerCase()
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
