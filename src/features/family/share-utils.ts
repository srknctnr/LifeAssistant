import type { FamilyModule, ModuleShare } from '@/features/family/api'

export type ShareMode = 'full' | 'ask' | 'summary' | null

// The strongest level I opened for a module across all my families:
// full > ask > summary. Forms use this to decide whether a new record
// syncs to the family automatically ('full') or per record ('ask').
export function myShareMode(
  shares: ModuleShare[],
  userId: string | undefined,
  module: FamilyModule,
): ShareMode {
  let mode: ShareMode = null
  for (const share of shares) {
    if (share.user_id !== userId || share.module !== module) continue
    if (share.level === 'full') return 'full'
    if (share.level === 'ask') mode = 'ask'
    else if (mode === null) mode = 'summary'
  }
  return mode
}

// What to write into is_family_visible when saving a record:
// full = always shared, ask = the user's per-record choice,
// summary/none = keep whatever the record already had.
export function resolveFamilyVisibility(
  mode: ShareMode,
  choice: boolean,
  existing = false,
): boolean {
  if (mode === 'full') return true
  if (mode === 'ask') return choice
  return existing
}
