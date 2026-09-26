import { describe, expect, it } from 'vitest'

import { parseEntry } from '@/features/assistant/parse-entry'
import { DEFAULT_CATEGORIES } from '@/features/budget/categories'

// 26 Eylül 2026, Cumartesi
const TODAY = new Date(2026, 8, 26)
const parse = (text: string) => parseEntry(text, TODAY)

describe('parseEntry', () => {
  // The sentence the project document itself uses to describe this feature.
  it('reads the example the roadmap was written around', () => {
    const draft = parse('cuma sinemaya gidiyoruz, 600 TL bütçem var')
    expect(draft).not.toBeNull()
    expect(draft?.dateISO).toBe('2026-10-02')
    expect(draft?.amount).toBe(600)
    expect(draft?.category).toBe('Eğlence')
    expect(draft?.actions[0]).toBe('movie-night')
    // Friday has not happened, so the 600 is a plan and not a spend
    expect(draft?.actions).toContain('plan-expense')
    expect(draft?.actions).not.toContain('spend')
    expect(draft?.title).toBe('Sinemaya gidiyoruz')
  })

  it('reads a spend that already happened', () => {
    const draft = parse('bugün markete 250 TL verdim')
    expect(draft?.dateISO).toBe('2026-09-26')
    expect(draft?.amount).toBe(250)
    expect(draft?.category).toBe('Market')
    expect(draft?.actions[0]).toBe('spend')
    expect(draft?.past).toBe(true)
  })

  it('treats a sentence with no date as now', () => {
    const draft = parse('kahve 85 TL')
    expect(draft?.dateISO).toBeNull()
    expect(draft?.past).toBe(true)
    expect(draft?.actions).toEqual(['spend'])
    expect(draft?.category).toBe('Yemek')
  })

  // Money on a day that has not arrived is a plan. Writing it as a spend
  // would make the budget claim the user has already paid.
  it('never files a spend on a future day', () => {
    const draft = parse('15 Ekim kira 22.000 TL')
    expect(draft?.dateISO).toBe('2026-10-15')
    expect(draft?.amount).toBe(22000)
    expect(draft?.actions).toContain('plan-expense')
    expect(draft?.actions).not.toContain('spend')
  })

  // "cuma ... harcadım" cannot be a spend: Friday has not happened yet.
  it('lets the written date overrule the past tense', () => {
    const draft = parse('cuma 300 TL harcadım')
    expect(draft?.past).toBe(false)
    expect(draft?.actions).not.toContain('spend')
  })

  it('reads a time only when one is written', () => {
    expect(parse('yarın 19:30 sinema')?.time).toBe('19:30')
    expect(parse('yarın akşam sinema')?.time).toBeNull()
  })

  // The date has already claimed those digits.
  it('does not spend the date as money', () => {
    const draft = parse('3 Ekim tiyatro')
    expect(draft?.dateISO).toBe('2026-10-03')
    expect(draft?.amount).toBeNull()
  })

  it('reads a bare number as money only when the sentence is about spending', () => {
    expect(parse('markete gittim 250')?.amount).toBe(250)
    // otherwise a count is just a count
    expect(parse('3 kişiyiz yarın')?.amount).toBeNull()
  })

  it('reads Turkish thousands and kuruş', () => {
    expect(parse('kira 12.500 TL')?.amount).toBe(12500)
    expect(parse('market 1.250,50 TL harcadım')?.amount).toBe(1250.5)
  })

  it('understands text typed without Turkish letters', () => {
    const draft = parse('persembe aksam 8 sinemaya gidiyoruz 400 tl')
    expect(draft?.dateISO).toBe('2026-10-01')
    expect(draft?.time).toBe('20:00')
    expect(draft?.amount).toBe(400)
    expect(draft?.actions[0]).toBe('movie-night')
  })

  it('puts a dated plan with no money on the calendar', () => {
    const draft = parse('pazartesi doktor randevusu')
    expect(draft?.actions).toEqual(['event'])
    expect(draft?.category).toBe('Sağlık')
    expect(draft?.title).toBe('Doktor randevusu')
  })

  // Every field says which words produced it, so the user can see what was
  // read instead of trusting that it was read right.
  it('shows its work', () => {
    const draft = parse('cuma 19:30 sinema 600 TL')
    expect(draft?.matched).toEqual([
      { field: 'date', text: 'cuma' },
      { field: 'time', text: '19:30' },
      { field: 'amount', text: '600 TL' },
      { field: 'category', text: 'Eğlence' },
    ])
  })

  it('says nothing when it understood nothing', () => {
    expect(parse('')).toBeNull()
    expect(parse('   ')).toBeNull()
    expect(parse('deneme yazı')).toBeNull()
  })

  it('leaves an empty title rather than inventing one', () => {
    expect(parse('yarın')?.title).toBe('')
  })

  // A category this parser invents is a category the budget picker has never
  // heard of, and the two surfaces would disagree about the same spend.
  it('only ever names a category the budget page already knows', () => {
    const samples = [
      'market 10 TL',
      'benzin 500 TL',
      'kira 20.000 TL',
      'netflix 150 TL',
      'eczane 90 TL',
      'kuaför 400 TL',
      'sinema 200 TL',
      'kitap 120 TL',
      'ayakkabı 900 TL',
      'otel 3.000 TL',
      'hediye 250 TL',
      'elektrik faturası 800 TL',
      'yemek 300 TL',
    ]
    for (const text of samples) {
      const category = parse(text)?.category
      expect(category).not.toBeNull()
      expect(DEFAULT_CATEGORIES).toContain(category)
    }
  })
})
