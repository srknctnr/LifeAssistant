export const DEFAULT_CATEGORIES = [
  'Market',
  'Yemek',
  'Ulaşım',
  'Konut',
  'Faturalar',
  'Abonelik',
  'Sağlık',
  'Giyim',
  'Eğlence',
  'Eğitim',
  'Kişisel Bakım',
  'Hediye',
  'Tatil',
  'Diğer',
]

// Defaults first, then the user's custom names and any names already used
// on records — deduplicated Turkish case-insensitively
export function mergeCategoryNames(
  custom: string[],
  used: (string | null)[],
): string[] {
  const seen = new Set(DEFAULT_CATEGORIES.map((c) => c.toLocaleLowerCase('tr')))
  const merged = [...DEFAULT_CATEGORIES]

  for (const name of [...custom, ...used]) {
    const trimmed = name?.trim()
    if (!trimmed) continue
    const key = trimmed.toLocaleLowerCase('tr')
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(trimmed)
  }

  return merged
}
