import { describe, expect, it } from 'vitest'

import { findDate, findTime } from '@/features/assistant/tr-date'

// 26 Eylül 2026, Cumartesi. Every expectation below is anchored to it.
const TODAY = new Date(2026, 8, 26)

const on = (text: string) => findDate(text, TODAY)?.iso ?? null

describe('findDate', () => {
  it('reads the relative words', () => {
    expect(on('bugün markete gittim')).toBe('2026-09-26')
    expect(on('yarın sinemaya gidiyoruz')).toBe('2026-09-27')
    expect(on('öbür gün toplantı var')).toBe('2026-09-28')
    expect(on('dün 200 harcadım')).toBe('2026-09-25')
  })

  it('reads a weekday as the next one, today included', () => {
    // bugün cumartesi
    expect(on('cumartesi maç var')).toBe('2026-09-26')
    expect(on('cuma sinemaya gidiyoruz')).toBe('2026-10-02')
    expect(on('pazartesi doktor')).toBe('2026-09-28')
  })

  // "haftaya cuma" is never this week's Friday — that is the whole point of
  // saying "haftaya".
  it('pushes "haftaya" a week out', () => {
    expect(on('haftaya cuma sinemaya gidiyoruz')).toBe('2026-10-09')
    expect(on('gelecek hafta pazartesi başlıyoruz')).toBe('2026-10-05')
  })

  // "cumartesi" contains "cuma"; the shorter word must not win.
  it('does not find Friday inside Saturday', () => {
    expect(on('cumartesi maç var')).toBe('2026-09-26')
  })

  it('reads a written date', () => {
    expect(on('3 Ekim tiyatro')).toBe('2026-10-03')
    expect(on('3 ekim 2027 tiyatro')).toBe('2027-10-03')
    expect(on('15 Ağustos')).toBe('2027-08-15') // bu yılki geçti
  })

  it('reads a numeric date', () => {
    expect(on('15/10 fatura')).toBe('2026-10-15')
    expect(on('15.10.2026 fatura')).toBe('2026-10-15')
    expect(on('2026-12-31 yılbaşı')).toBe('2026-12-31')
  })

  it('reads a counted offset', () => {
    expect(on('3 gün sonra teslim')).toBe('2026-09-29')
    expect(on('2 hafta sonra tatil')).toBe('2026-10-10')
    expect(on('5 gün önce ödedim')).toBe('2026-09-21')
  })

  it('reads the weekend as the coming Saturday', () => {
    expect(on('hafta sonu pikniğe gidiyoruz')).toBe('2026-09-26')
    expect(
      findDate('hafta sonu pikniğe gidiyoruz', new Date(2026, 8, 28))?.iso,
    ).toBe('2026-10-03')
  })

  it('understands text typed without Turkish letters', () => {
    expect(on('persembe aksam yemek')).toBe('2026-10-01')
    expect(on('3 agustos')).toBe('2027-08-03')
  })

  // A price is not a date. "5.10 TL" becoming 5 October is exactly the kind
  // of silent, plausible mistake that is never noticed until a plan is wrong.
  it('does not turn money into a date', () => {
    expect(on('kahve 5.10 TL')).toBeNull()
    expect(on('markete 12.50 lira verdim')).toBeNull()
  })

  it('rejects a day that does not exist', () => {
    expect(on('31 Nisan')).toBeNull()
    expect(on('31/02')).toBeNull()
  })

  it('says nothing when there is no date', () => {
    expect(on('markete gittim')).toBeNull()
    expect(findDate('', TODAY)).toBeNull()
  })

  // The prefix is part of the date phrase. Leaving it behind meant the title
  // came out as "Haftaya tiyatro".
  it('reports the whole date phrase, prefix included', () => {
    const hit = findDate('haftaya cuma sinemaya gidiyoruz', TODAY)
    expect(hit?.text).toBe('haftaya cuma')
  })

  it('does not swallow a stray prefix that belongs elsewhere', () => {
    const hit = findDate('gelecek planlar için cuma', TODAY)
    expect(hit?.text).toBe('cuma')
    expect(hit?.iso).toBe('2026-10-02')
  })
})

describe('findTime', () => {
  const at = (text: string) => findTime(text)?.time ?? null

  it('reads a clock time', () => {
    expect(at('cuma 19:30 sinema')).toBe('19:30')
    expect(at('saat 9 toplantı')).toBe('09:00')
    expect(at('saat 19.30 sinema')).toBe('19:30')
  })

  it('lets the part of day settle am or pm', () => {
    expect(at('akşam 8 buluşalım')).toBe('20:00')
    expect(at('sabah 9.30 doktor')).toBe('09:30')
    expect(at('öğlen 1 yemek')).toBe('13:00')
    expect(at('gece 11 film')).toBe('23:00')
  })

  it('keeps a stated 24-hour time as it is', () => {
    expect(at('akşam 20 buluşalım')).toBe('20:00')
  })

  // "sabah 12" is noon, not midnight; "gece 12" is the midnight one.
  it('reads twelve by the part of day that frames it', () => {
    expect(at('sabah 12 kahvaltı')).toBe('12:00')
    expect(at('gece 12 film')).toBe('00:00')
    expect(at('öğlen 12 yemek')).toBe('12:00')
  })

  // An invented hour on a reminder is indistinguishable from one the user set.
  it('invents nothing when no time is written', () => {
    expect(at('akşam sinemaya gidelim')).toBeNull()
    expect(at('yarın markete gideceğim')).toBeNull()
  })

  it('refuses an impossible clock', () => {
    expect(at('saat 25:00')).toBeNull()
    expect(at('19:75 buluşalım')).toBeNull()
  })

  // The date has already claimed these digits; reading them again as a time
  // would put 15:10 on a 15 October entry.
  it('does not read the date it was told to skip', () => {
    const date = findDate('15.10 fatura', TODAY)
    expect(findTime('15.10 fatura', date)).toBeNull()
  })
})

describe('findDate, the cases that used to be silently wrong', () => {
  // "saat 14.05" is a clock. The date reader got there first and turned a
  // 14:05 meeting into 14 May 2027.
  it('does not turn a clock into a date', () => {
    expect(findDate('saat 14.05 toplantı', TODAY)).toBeNull()
    expect(findDate('akşam 8.10 sinema', TODAY)).toBeNull()
    expect(findTime('saat 14.05 toplantı')?.time).toBe('14:05')
    expect(findTime('akşam 8.10 sinema')?.time).toBe('20:10')
  })

  it('still reads a real dotted date', () => {
    expect(on('sinema 20.10')).toBe('2026-10-20')
    expect(on('15.10 fatura')).toBe('2026-10-15')
  })

  // Turkish glues its case endings on. Before this the date was simply lost
  // and the entry quietly landed on today.
  it('reads a weekday carrying a case ending', () => {
    expect(on('cumaya sinemaya gidiyoruz')).toBe('2026-10-02')
    expect(on('salıya doktor')).toBe('2026-09-29')
    expect(on('pazartesiye toplantı')).toBe('2026-09-28')
    expect(on('perşembeye rapor')).toBe('2026-10-01')
  })

  it('reads a month carrying a case ending', () => {
    expect(on('3 eylülde market')).toBe('2027-09-03')
    expect(on('15 ağustosta tatil')).toBe('2027-08-15')
    expect(on('20 ekimde fatura')).toBe('2026-10-20')
  })

  // The suffix must not let "cuma" swallow "cumartesi".
  it('keeps Saturday out of Friday even with an ending', () => {
    expect(on('cumartesi maç')).toBe('2026-09-26')
    expect(on('cumartesiye maç')).toBe('2026-09-26')
  })

  // A year-less date leans the way the sentence does.
  it('leans a bare date the way the sentence points', () => {
    expect(findDate('15.09 harcadım', TODAY, 'past')?.iso).toBe('2026-09-15')
    expect(findDate('15.09 fatura', TODAY, 'future')?.iso).toBe('2027-09-15')
    expect(findDate('3 ekim', TODAY, 'past')?.iso).toBe('2025-10-03')
    expect(findDate('3 ekim', TODAY, 'future')?.iso).toBe('2026-10-03')
  })
})

describe('findDate, "gelecek" is also an ordinary word', () => {
  // These used to pass only because the lookbehind window happened to cut
  // the prefix off. The rule is adjacency, and these exercise it.
  it('only shifts a week when the prefix sits on the weekday', () => {
    expect(on('gelecek cuma sinema')).toBe('2026-10-09')
    expect(on('gelecek planlar için cuma buluşalım')).toBe('2026-10-02')
    expect(on('gelecek yıl taşınıyoruz, cuma bakacağız')).toBe('2026-10-02')
    expect(on('haftaya pazartesi başlıyoruz')).toBe('2026-10-05')
  })

  it('consumes the prefix it used, and nothing it did not', () => {
    expect(findDate('gelecek cuma sinema', TODAY)?.text).toBe('gelecek cuma')
    expect(findDate('gelecek planlar için cuma', TODAY)?.text).toBe('cuma')
  })
})
