import { describe, expect, it } from 'vitest'

import {
  formatMoney,
  monthlyEquivalent,
  parseAmountInput,
} from '@/features/budget/money'

describe('monthlyEquivalent', () => {
  it('converts weekly amounts using 52 weeks per year', () => {
    expect(monthlyEquivalent(120, 'weekly')).toBeCloseTo(520)
  })

  it('keeps monthly amounts as-is', () => {
    expect(monthlyEquivalent(100, 'monthly')).toBe(100)
  })

  it('divides yearly amounts by 12', () => {
    expect(monthlyEquivalent(1200, 'yearly')).toBe(100)
  })
})

describe('formatMoney', () => {
  it('formats TRY with the lira symbol', () => {
    expect(formatMoney(1000)).toContain('₺')
  })

  it('drops unnecessary decimals', () => {
    expect(formatMoney(4500)).not.toContain(',00')
  })
})

describe('parseAmountInput', () => {
  it('parses plain integers', () => {
    expect(parseAmountInput('4500')).toBe(4500)
  })

  it('parses comma decimals', () => {
    expect(parseAmountInput('4500,50')).toBe(4500.5)
  })

  it('parses dot decimals', () => {
    expect(parseAmountInput('4500.50')).toBe(4500.5)
  })

  it('rejects invalid input', () => {
    expect(parseAmountInput('abc')).toBeNull()
    expect(parseAmountInput('')).toBeNull()
    expect(parseAmountInput('0')).toBeNull()
    expect(parseAmountInput('1.2.3')).toBeNull()
  })
})
