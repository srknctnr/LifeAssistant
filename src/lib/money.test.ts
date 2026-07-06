import { describe, expect, it } from 'vitest'

import { formatMoney, parseAmountInput } from '@/lib/money'

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
