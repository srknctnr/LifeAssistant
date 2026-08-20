import type { TripItemKind } from '@/features/travel/api'

// Kept out of the components so fast refresh keeps working (the repo hit the
// same rule with lazy-pages.ts)
export const ITEM_LABELS: Record<TripItemKind, string> = {
  stay: 'Konaklama',
  transport: 'Ulaşım',
  activity: 'Aktivite',
  note: 'Not',
}

export const ITEM_ICONS: Record<TripItemKind, string> = {
  stay: '🛏️',
  transport: '🚆',
  activity: '🎟️',
  note: '📝',
}
