import { describe, expect, it } from 'vitest'

import type { ModuleShare } from '@/features/family/api'
import { myShareMode, resolveFamilyVisibility } from './share-utils'

function share(over: Partial<ModuleShare>): ModuleShare {
  return {
    id: 's1',
    family_id: 'f1',
    user_id: 'u1',
    module: 'budget',
    level: 'full',
    created_at: '',
    updated_at: '',
    ...over,
  }
}

describe('myShareMode', () => {
  it('returns null when I have no share for the module', () => {
    expect(myShareMode([], 'u1', 'budget')).toBeNull()
    expect(
      myShareMode([share({ module: 'movies' })], 'u1', 'budget'),
    ).toBeNull()
  })

  it('ignores shares belonging to other members', () => {
    expect(myShareMode([share({ user_id: 'u2' })], 'u1', 'budget')).toBeNull()
  })

  it('full wins over ask and summary across families', () => {
    const shares = [
      share({ id: 'a', family_id: 'f1', level: 'summary' }),
      share({ id: 'b', family_id: 'f2', level: 'ask' }),
      share({ id: 'c', family_id: 'f3', level: 'full' }),
    ]
    expect(myShareMode(shares, 'u1', 'budget')).toBe('full')
  })

  it('ask wins over summary', () => {
    const shares = [
      share({ id: 'a', family_id: 'f1', level: 'summary' }),
      share({ id: 'b', family_id: 'f2', level: 'ask' }),
    ]
    expect(myShareMode(shares, 'u1', 'budget')).toBe('ask')
  })

  it('returns summary when that is my only level', () => {
    expect(myShareMode([share({ level: 'summary' })], 'u1', 'budget')).toBe(
      'summary',
    )
  })
})

describe('resolveFamilyVisibility', () => {
  it('full always shares', () => {
    expect(resolveFamilyVisibility('full', false)).toBe(true)
  })

  it('ask follows the per-record choice', () => {
    expect(resolveFamilyVisibility('ask', true)).toBe(true)
    expect(resolveFamilyVisibility('ask', false)).toBe(false)
  })

  it('summary and none keep the existing flag', () => {
    expect(resolveFamilyVisibility('summary', true, false)).toBe(false)
    expect(resolveFamilyVisibility(null, true, true)).toBe(true)
    expect(resolveFamilyVisibility(null, true)).toBe(false)
  })
})
