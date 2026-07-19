import { describe, expect, it } from 'vitest'

import { generateInviteCode } from '@/features/family/invite-code'

describe('generateInviteCode', () => {
  it('produces 6 characters from the safe alphabet', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateInviteCode()
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
    }
  })

  it('produces varying codes', () => {
    const codes = new Set(
      Array.from({ length: 10 }, () => generateInviteCode()),
    )
    expect(codes.size).toBeGreaterThan(1)
  })
})
