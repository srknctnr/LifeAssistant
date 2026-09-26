import { describe, expect, it } from 'vitest'

import { foldTr, foldTrIndexed, parseTrAmountToMinor } from '@/lib/turkish'

describe('foldTr', () => {
  it('folds Turkish letters to a plain form', () => {
    expect(foldTr('Perşembe')).toBe('persembe')
    expect(foldTr('ÇARŞAMBA')).toBe('carsamba')
    expect(foldTr('Ağustos')).toBe('agustos')
    expect(foldTr('Eylül')).toBe('eylul')
    expect(foldTr('Şubat')).toBe('subat')
  })

  // Both Turkish i's have to land on the same letter, or "İstanbul" and
  // "ISTANBUL" stop matching the same keyword.
  it('lands every form of i on the same letter', () => {
    expect(foldTr('İSTANBUL')).toBe('istanbul')
    expect(foldTr('istanbul')).toBe('istanbul')
    expect(foldTr('Istanbul')).toBe('istanbul')
    expect(foldTr('ıstanbul')).toBe('istanbul')
  })

  // JS lower-cases İ to "i" plus a combining dot; left in, it would sit
  // between the letters and break every comparison after it.
  it('drops the combining dot JS leaves behind', () => {
    expect(foldTr('İ'.toLowerCase())).toBe('i')
    expect(foldTr('İYİ')).toBe('iyi')
  })

  it('leaves text that needs no folding alone', () => {
    expect(foldTr('cuma sinemaya gidiyoruz')).toBe('cuma sinemaya gidiyoruz')
  })
})

describe('parseTrAmountToMinor', () => {
  it('reads a plain amount', () => {
    expect(parseTrAmountToMinor('600')).toBe(60000)
  })

  // The dot groups thousands in Turkish. Number('1.250') is 1.25, which would
  // put one lira twenty-five into a budget as if it were twelve hundred fifty.
  it('reads the dot as a thousands separator', () => {
    expect(parseTrAmountToMinor('1.250')).toBe(125000)
    expect(parseTrAmountToMinor('12.500')).toBe(1250000)
    expect(parseTrAmountToMinor('1.250.000')).toBe(125000000)
  })

  it('reads the comma as the decimal mark', () => {
    expect(parseTrAmountToMinor('1.250,50')).toBe(125050)
    expect(parseTrAmountToMinor('600,5')).toBe(60050)
    expect(parseTrAmountToMinor('0,99')).toBe(99)
  })

  // Somebody typing on an English keyboard layout still means twelve fifty.
  it('accepts a single dot with two decimals as a decimal point', () => {
    expect(parseTrAmountToMinor('12.50')).toBe(1250)
    expect(parseTrAmountToMinor('99.99')).toBe(9999)
  })

  // Turkish grouping is always three digits at a time, so four digits before
  // the dot cannot be a group — an English layout is the only reading left.
  it('reads a dot as a decimal point when it cannot be grouping', () => {
    expect(parseTrAmountToMinor('1250.50')).toBe(125050)
    expect(parseTrAmountToMinor('1.2')).toBe(120)
  })

  it('still groups a real group', () => {
    expect(parseTrAmountToMinor('100.000')).toBe(10000000)
    expect(parseTrAmountToMinor('100.00')).toBe(10000)
  })

  it('ignores spaces', () => {
    expect(parseTrAmountToMinor(' 1.250 , 50 ')).toBe(125050)
  })

  it('truncates past kuruş rather than rounding into thin air', () => {
    expect(parseTrAmountToMinor('10,999')).toBe(1099)
  })

  it('refuses anything that is not a number', () => {
    expect(parseTrAmountToMinor('')).toBeNull()
    expect(parseTrAmountToMinor('abc')).toBeNull()
    expect(parseTrAmountToMinor('600 TL')).toBeNull() // caller strips the unit
    expect(parseTrAmountToMinor('.')).toBeNull()
    expect(parseTrAmountToMinor(',')).toBeNull()
  })
})

describe('foldTrIndexed', () => {
  it('folds the same way as foldTr', () => {
    const input = 'Perşembe akşam 8, İstanbul'
    expect(foldTrIndexed(input).text).toBe(foldTr(input))
  })

  // A match found in the folded string is sliced back out of the original
  // through this map. Get it wrong and the app quotes the user words they
  // never typed.
  it('points every folded character back at its source', () => {
    const input = 'Cuma 19:30 sinema'
    const { text, at } = foldTrIndexed(input)
    const i = text.indexOf('19:30')
    expect(input.slice(at[i], at[i + 5])).toBe('19:30')
  })

  it('survives a decomposed dotted i, where the lengths differ', () => {
    const input = 'İ'.toLowerCase() + 'yi cuma' // i + U+0307 + 'yi cuma'
    const { text, at } = foldTrIndexed(input)
    expect(text).toBe('iyi cuma')
    expect(text.length).not.toBe(input.length)
    const i = text.indexOf('cuma')
    expect(input.slice(at[i], at[i + 4])).toBe('cuma')
  })

  it('ends with the source length, so a final match can be sliced', () => {
    const { text, at } = foldTrIndexed('cuma')
    expect(at[text.length]).toBe(4)
  })
})
