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
 * When both separators appear, the last one is the decimal mark and the other
 * is grouping — that covers both "1.250,50" and an English "1,250.50".
 *
 * When only one kind appears, its meaning is decided by shape, and the same
 * rule applies to the dot and the comma alike: a separator followed by
 * exactly three digits, with one to three digits in front of it, is grouping.
 * Everything else is a decimal mark.
 *
 * That symmetry matters. Kuruş has two digits, so "1,250" cannot be one lira
 * and two hundred fifty kuruş — it is somebody typing a thousand two hundred
 * fifty with the separator their phone keyboard offered. Reading it as 1,25
 * logs a thousandth of what was spent, and nothing on screen looks wrong.
 *
 * Returns null for anything it cannot read confidently.
 */
export function parseTrAmountToMinor(raw: string): number | null {
  const text = raw.trim()
  if (!/^[\d.,\s]+$/.test(text) || !/\d/.test(text)) return null

  const compact = text.replace(/\s/g, '')
  let whole = compact
  let fraction = ''

  const hasComma = compact.includes(',')
  const hasDot = compact.includes('.')

  if (hasComma && hasDot) {
    // mixed: whichever comes last is the decimal mark
    const cut = Math.max(compact.lastIndexOf(','), compact.lastIndexOf('.'))
    whole = compact.slice(0, cut)
    fraction = compact.slice(cut + 1)
  } else if (hasComma || hasDot) {
    const parts = compact.split(hasComma ? ',' : '.')
    const grouped =
      parts[0].length >= 1 &&
      parts[0].length <= 3 &&
      parts.slice(1).every((p) => p.length === 3)
    if (!grouped) {
      fraction = parts[parts.length - 1]
      whole = parts.slice(0, -1).join('')
    }
  }

  const digits = whole.replace(/[.,]/g, '')
  if (!digits || !/^\d+$/.test(digits)) return null
  if (fraction && !/^\d+$/.test(fraction)) return null

  const kurus = (fraction + '00').slice(0, 2)
  return Number(digits) * 100 + Number(kurus)
}

/**
 * Turkish case and derivation endings, longest first.
 *
 * Turkish glues these onto the word — "markete", "marketten", "cumaya",
 * "3 eylülde" — so a bare \b after the stem matches none of them.
 */
const SUFFIXES = [
  'larindan',
  'lerinden',
  'larinda',
  'lerinde',
  'lardan',
  'lerden',
  'larda',
  'lerde',
  'ciya',
  'ciye',
  'cisi',
  'lari',
  'leri',
  'lara',
  'lere',
  'ndan',
  'nden',
  'lar',
  'ler',
  'nin',
  'nun',
  'yla',
  'yle',
  'dan',
  'den',
  'tan',
  'ten',
  'nda',
  'nde',
  'lik',
  'da',
  'de',
  'ta',
  'te',
  'ya',
  'ye',
  'yi',
  'yu',
  'si',
  'su',
  'na',
  'ne',
  'la',
  'le',
  'ci',
  'cu',
  'in',
  'un',
  'im',
  'um',
  'a',
  'e',
  'i',
  'u',
]

export const TR_SUFFIX = `(?:${SUFFIXES.join('|')})?`

/**
 * A folded stem, matched as a whole word with an optional Turkish ending.
 *
 * Bare substring matching is how "kalbim" becomes a trip to BİM, "amacım"
 * becomes a football match and "kiraz" becomes rent. The leading boundary
 * stops a keyword being found inside a longer word; the ending list stops
 * "kiraz" passing as "kira" while still letting "kiraya" through.
 */
export function trWord(stem: string, flags = ''): RegExp {
  return new RegExp(`\\b${stem}${TR_SUFFIX}\\b`, flags)
}
