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

describe('parseEntry action choice', () => {
  // Rent on the 15th is not an appointment. Offering a calendar entry for it
  // fills the calendar with bills.
  it('does not put a bill on the calendar', () => {
    expect(parse('15 Ekim kira 22.000 TL')?.actions).toEqual(['plan-expense'])
    expect(parse('3 Ekim elektrik faturası 900 TL')?.actions).toEqual([
      'plan-expense',
    ])
  })

  // Nobody writes a clock time for a rent payment, so one is the clearest
  // signal that this is something you attend.
  it('treats a written time as an appointment', () => {
    const draft = parse('haftaya cuma akşam 8 tiyatro 450 lira')
    expect(draft?.actions).toEqual(['event', 'plan-expense'])
    expect(draft?.title).toBe('Tiyatro')
  })

  // Both would put two entries on the calendar for one plan.
  it('never offers a film night and a plain event together', () => {
    const actions = parse('cuma sinemaya gidiyoruz, 600 TL')?.actions ?? []
    expect(actions).toContain('movie-night')
    expect(actions).not.toContain('event')
  })

  it('offers the calendar for a dated plan with no money', () => {
    expect(parse('pazartesi doktor randevusu')?.actions).toEqual(['event'])
    expect(parse('salı toplantı')?.actions).toEqual(['event'])
  })

  // Understanding a word but having nothing to offer is not understanding.
  // A bare category has no amount to spend and no day to sit on, and the
  // honest answer is to say so rather than invent today.
  it('says nothing when it has nothing to propose', () => {
    expect(parse('market')).toBeNull()
    expect(parse('sinema')).toBeNull()
    expect(parse('cuma sinema')).not.toBeNull()
  })
})

describe('parseEntry, past-tense dates', () => {
  // A spend made eleven days ago was being filed as a plan for next year —
  // wrong in the year, wrong in the table, and invisible until a month total
  // came out short.
  it('files a past-tense spend in the year it happened', () => {
    expect(parse('3 eylülde markete 450 TL harcadım')).toMatchObject({
      dateISO: '2026-09-03',
      actions: ['spend'],
      amount: 450,
    })
    expect(parse('15.09 markete 450 TL harcadım')?.dateISO).toBe('2026-09-15')
    expect(parse('1 eylül kira 15.000 TL ödedim')?.dateISO).toBe('2026-09-01')
  })

  it('still reads a future plan as a future plan', () => {
    expect(parse('3 Ekim tiyatro')?.dateISO).toBe('2026-10-03')
    expect(parse('15 Ekim kira 22.000 TL')?.dateISO).toBe('2026-10-15')
  })

  it('reads a clock as a clock, not a date', () => {
    const draft = parse('cuma saat 14.05 toplantı')
    expect(draft?.dateISO).toBe('2026-10-02')
    expect(draft?.time).toBe('14:05')
  })
})

describe('parseEntry category matching', () => {
  // As bare substrings these keywords live inside ordinary words, and each
  // one wrote a wrong category quietly into the budget.
  it('does not find a keyword inside another word', () => {
    expect(parse('kalbim için ilaç 100 TL aldım')?.category).toBe('Sağlık')
    expect(parse('amacım 5000 TL biriktirmek')?.category).toBeNull()
    expect(parse('kiraz 50 TL aldım')?.category).toBeNull()
    expect(parse('ev sahibime 5000 TL kira verdim')?.category).toBe('Konut')
  })

  it('still reads a keyword carrying a Turkish ending', () => {
    expect(parse('markete 250 TL verdim')?.category).toBe('Market')
    expect(parse('kiraya 5000 TL verdim')?.category).toBe('Konut')
    expect(parse('eczaneden 90 TL ilaç aldım')?.category).toBe('Sağlık')
    expect(parse('sinemaya 200 TL verdim')?.category).toBe('Eğlence')
  })

  // The same trap for the words that decide the tense and the film night.
  it('does not see a film or a past tense inside another word', () => {
    expect(parse('filmi izledim 100 TL')?.actions).toContain('spend')
    expect(parse('20 Ekim filmler festivali')?.actions).toContain('movie-night')
  })
})

describe('parseEntry, money that has not been spent yet', () => {
  // With no date the sentence reads as "now", so this became a spend and the
  // budget recorded six hundred lira for a film nobody had seen.
  it('does not log a stated budget as a spend', () => {
    const draft = parse('sinemaya 600 TL bütçem var')
    expect(draft?.past).toBe(false)
    expect(draft?.actions).not.toContain('spend')
    expect(draft?.actions).toContain('plan-expense')
  })

  it('treats setting money aside as a plan', () => {
    expect(parse('düğün için 50.000 TL bütçe ayırdım')?.actions).toEqual([
      'plan-expense',
    ])
    expect(parse('tatil için 20.000 TL bütçem var')?.actions).toContain(
      'plan-expense',
    )
  })

  it('still logs a real spend as a spend', () => {
    expect(parse('markete 250 TL harcadım')?.actions).toEqual(['spend'])
    expect(parse('kahve 85 TL')?.actions).toEqual(['spend'])
  })
})

describe('parseEntry, a receipt is not a plan', () => {
  // A purchase already made does not belong on the calendar.
  it('does not offer the calendar for a spend that already happened', () => {
    expect(parse('3 eylülde eczaneden 90 TL ilaç aldım')?.actions).toEqual([
      'spend',
    ])
    expect(parse('dün sinemaya 200 TL verdim')?.actions).toEqual(['spend'])
  })

  // With no money attached, a log of what happened is the only reading left.
  it('still offers the calendar for a past day with nothing spent', () => {
    expect(parse('dün toplantı vardı')?.actions).toEqual(['event'])
  })

  it('still offers it for an outing that has not happened', () => {
    expect(parse('haftaya cuma akşam 8 tiyatro 450 lira')?.actions).toEqual([
      'event',
      'plan-expense',
    ])
  })
})
