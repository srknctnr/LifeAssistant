/**
 * Turkish text handling.
 *
 * Lives in lib rather than under a feature because two features need it:
 * the quick-entry parser reads sentences with it, and the film recommender
 * folds titles with it so its exclusion list actually excludes.
 *
 * Everything here exists because a phone keyboard is not a form. People type
 * "persembe" for Perşembe, "YARIN" in caps, and "1.250,50 TL" for a number
 * JavaScript reads as 1.25. None of that should be the user's problem.
 */

// Matching is diacritic- and case-insensitive on purpose: somebody typing
// "carsamba" in a hurry means Çarşamba, and refusing to understand that is a
// worse failure than a rare false match.
//
// İ and ı are folded explicitly rather than left to toLocaleLowerCase('tr'),
// which would turn "I" into "ı" and then fail to match the keyword "i". The
// packing list learned this the hard way: Postgres and JS disagree about the
// dotted capital İ, so the only safe move is to decide the mapping ourselves.
const FOLD: Record<string, string> = {
  İ: 'i',
  I: 'i',
  ı: 'i',
  Ş: 's',
  ş: 's',
  Ğ: 'g',
  ğ: 'g',
  Ü: 'u',
  ü: 'u',
  Ö: 'o',
  ö: 'o',
  Ç: 'c',
  ç: 'c',
  Â: 'a',
  â: 'a',
  Î: 'i',
  î: 'i',
  Û: 'u',
  û: 'u',
}

/** lower-case, diacritic-free form used for every keyword comparison */
export function foldTr(text: string): string {
  let out = ''
  for (const ch of text) {
    // the combining dot above survives NFD-ish input and would otherwise
    // wedge itself between "i" and the next letter
    if (ch === '̇') continue
    out += FOLD[ch] ?? ch.toLowerCase()
  }
  return out
}

export interface FoldedText {
  /** the folded string, safe to match keywords and regexes against */
  text: string
  /** source index of each folded character, plus the end, so a match can be
   *  sliced back out of the original */
  at: number[]
}

/**
 * Folds while remembering where every character came from.
 *
 * The plain fold can change length — "İ".toLowerCase() is two code points and
 * one of them is dropped here — so a match index found in the folded string
 * does not necessarily point at the same place in the original. Anything that
 * shows the user their own words back has to go through this, or it will one
 * day slice a sentence off by one and blame them for the typo.
 */
export function foldTrIndexed(input: string): FoldedText {
  let text = ''
  const at: number[] = []
  let i = 0
  for (const ch of input) {
    const folded = ch === '̇' ? '' : (FOLD[ch] ?? ch.toLowerCase())
    for (let k = 0; k < folded.length; k++) at.push(i)
    text += folded
    i += ch.length
  }
  at.push(input.length)
  return { text, at }
}

/** Monday-first, matching the calendar grid's own week order */
export const WEEKDAYS_TR = [
  'pazartesi',
  'sali',
  'carsamba',
  'persembe',
  'cuma',
  'cumartesi',
  'pazar',
] as const

/** January-first; index + 1 is the month number */
export const MONTHS_TR = [
  'ocak',
  'subat',
  'mart',
  'nisan',
  'mayis',
  'haziran',
  'temmuz',
  'agustos',
  'eylul',
  'ekim',
  'kasim',
  'aralik',
] as const

/**
 * Turkish written money → integer kuruş.
 *
 * "1.250,50" is one thousand two hundred fifty lira fifty kuruş. Number()
 * reads it as 1.25, which is the kind of silent, plausible wrongness that
 * ends up in a budget and is never noticed. The dot is a thousands separator
 * here and the comma is the decimal mark.
 *
 * With no comma present, the dots are read as grouping when they actually
 * group — every segment after the first exactly three digits long, the first
 * one to three — and as a decimal point otherwise. So "1.250" is 1250 lira,
 * while "1250.50" is 1250 lira 50 kuruş: four digits before the dot is not a
 * group any Turkish writer would produce, so the only sensible reading left is
 * an English keyboard layout.
 *
 * Returns null for anything it cannot read confidently.
 */
export function parseTrAmountToMinor(raw: string): number | null {
  const text = raw.trim()
  if (!/^[\d.,\s]+$/.test(text) || !/\d/.test(text)) return null

  const compact = text.replace(/\s/g, '')
  const lastComma = compact.lastIndexOf(',')

  let whole = compact
  let fraction = ''

  if (lastComma > -1) {
    // a comma is always the decimal mark here: 1.250,50
    whole = compact.slice(0, lastComma)
    fraction = compact.slice(lastComma + 1)
  } else if (compact.includes('.')) {
    const parts = compact.split('.')
    const grouped =
      parts.length > 1 &&
      parts[0].length >= 1 &&
      parts[0].length <= 3 &&
      parts.slice(1).every((p) => p.length === 3)
    if (!grouped) {
      fraction = parts[parts.length - 1]
      whole = parts.slice(0, -1).join('.')
    }
  }

  const digits = whole.replace(/[.,]/g, '')
  if (!digits || !/^\d+$/.test(digits)) return null
  if (fraction && !/^\d+$/.test(fraction)) return null

  const kurus = (fraction + '00').slice(0, 2)
  return Number(digits) * 100 + Number(kurus)
}
