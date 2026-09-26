import { findDate, findTime } from '@/features/assistant/tr-date'
import { foldTrIndexed, parseTrAmountToMinor, trWord } from '@/lib/turkish'
import { fromMinor } from '@/features/expenses/split-math'

/** what the sentence could reasonably be turned into, best first */
export type EntryAction = 'movie-night' | 'event' | 'spend' | 'plan-expense'

export interface EntryDraft {
  /** the words left after the date, time and amount were lifted out */
  title: string
  dateISO: string | null
  /** HH:MM, only when one was actually written down */
  time: string | null
  /** major units, the way every row in this app stores money */
  amount: number | null
  category: string | null
  /** the date is today or earlier, so money attached to it has been spent */
  past: boolean
  actions: EntryAction[]
  /** the exact words each field came from, so the UI can show its work */
  matched: { field: 'date' | 'time' | 'amount' | 'category'; text: string }[]
}

// Keyword → one of DEFAULT_CATEGORIES. Folded on both sides, longest first so
// "akşam yemeği" is not decided by "yemek" alone. A test pins every value here
// to the budget page's own list: a category this parser invents would be a
// category the picker has never heard of.
const CATEGORY_WORDS: [string, string][] = [
  ['market', 'Market'],
  ['bakkal', 'Market'],
  ['manav', 'Market'],
  ['kasap', 'Market'],
  ['migros', 'Market'],
  ['carrefour', 'Market'],
  ['a101', 'Market'],
  ['bim', 'Market'],
  ['sok market', 'Market'],
  ['alisveris', 'Market'],
  ['restoran', 'Yemek'],
  ['lokanta', 'Yemek'],
  ['kahvalti', 'Yemek'],
  ['yemek', 'Yemek'],
  ['kahve', 'Yemek'],
  ['kafe', 'Yemek'],
  ['cafe', 'Yemek'],
  ['pizza', 'Yemek'],
  ['burger', 'Yemek'],
  ['benzin', 'Ulaşım'],
  ['akaryakit', 'Ulaşım'],
  ['mazot', 'Ulaşım'],
  ['taksi', 'Ulaşım'],
  ['otobus', 'Ulaşım'],
  ['metro', 'Ulaşım'],
  ['dolmus', 'Ulaşım'],
  ['ulasim', 'Ulaşım'],
  ['otopark', 'Ulaşım'],
  ['kira', 'Konut'],
  ['aidat', 'Konut'],
  ['konut', 'Konut'],
  ['fatura', 'Faturalar'],
  ['elektrik', 'Faturalar'],
  ['dogalgaz', 'Faturalar'],
  ['su faturasi', 'Faturalar'],
  ['internet', 'Faturalar'],
  ['abonelik', 'Abonelik'],
  ['netflix', 'Abonelik'],
  ['spotify', 'Abonelik'],
  ['eczane', 'Sağlık'],
  ['doktor', 'Sağlık'],
  ['hastane', 'Sağlık'],
  ['ilac', 'Sağlık'],
  ['dis hekimi', 'Sağlık'],
  ['saglik', 'Sağlık'],
  ['giyim', 'Giyim'],
  ['kiyafet', 'Giyim'],
  ['ayakkabi', 'Giyim'],
  ['sinema', 'Eğlence'],
  ['tiyatro', 'Eğlence'],
  ['konser', 'Eğlence'],
  ['film', 'Eğlence'],
  ['mac', 'Eğlence'],
  ['eglence', 'Eğlence'],
  ['kurs', 'Eğitim'],
  ['okul', 'Eğitim'],
  ['kitap', 'Eğitim'],
  ['egitim', 'Eğitim'],
  ['ders', 'Eğitim'],
  ['kuafor', 'Kişisel Bakım'],
  ['berber', 'Kişisel Bakım'],
  ['kozmetik', 'Kişisel Bakım'],
  ['hediye', 'Hediye'],
  ['dogum gunu', 'Hediye'],
  ['tatil', 'Tatil'],
  ['otel', 'Tatil'],
  ['seyahat', 'Tatil'],
  ['gezi', 'Tatil'],
]

// Only these put a film night on the calendar rather than a plain event.
const MOVIE_WORDS = ['sinema', 'film', 'vizyon']

// Words that mean "this already happened", which decides whether money is a
// spend or a plan even when no date was written.
const PAST_WORDS = [
  'harcadim',
  'verdim',
  'odedim',
  'aldim',
  'gittim',
  'yaptim',
  'tuttu',
  'attim',
  'cektim',
]

// Words that say the money has NOT been spent yet. Without these, "sinemaya
// 600 TL bütçem var" has no date, so it reads as now, so it becomes a spend —
// and the budget records six hundred lira for a film nobody has seen.
const INTENT_WORDS = [
  'butce',
  'butcem',
  'ayirdim',
  'ayiracagim',
  'lazim',
  'planliyorum',
  'dusunuyorum',
  'alacagim',
  'gidecegiz',
  'gidecegim',
  'gidiyoruz',
]

// Money talk that carries no information once the amount has been lifted out.
// Stripped from the title so "600 TL bütçem var" does not leave "bütçem var".
const FILLER = [
  'butcem var',
  'butce',
  'butcem',
  'harcadim',
  'verdim',
  'odedim',
  'tuttu',
  'attim',
  'cektim',
  'kadar',
]

const CURRENCY = '(?:tl|try|lira|₺)'

interface Span {
  from: number
  to: number
}

/**
 * Turns a Turkish sentence into a draft the user confirms.
 *
 * This is the whole of the "AI assistant" in Faz 4, and it is deliberately not
 * a model. CLAUDE.md's own rule is that the Claude API stays unwired for now,
 * and there is no server to hide a key behind — the app is a static bundle
 * talking straight to Supabase. A model here would mean shipping a key to the
 * browser.
 *
 * Doing it with rules buys three things a model would not: it works offline,
 * it costs nothing per sentence, and — most of all — it can show its work.
 * Every field carries the words it came from, so the user can see what was
 * read rather than trusting that it was read correctly.
 *
 * It never writes anything. It proposes, and the caller confirms.
 *
 * Returns null when nothing usable was found, rather than inventing a record
 * out of a sentence it did not understand.
 */
export function parseEntry(
  input: string,
  today = new Date(),
): EntryDraft | null {
  const source = input.trim()
  if (!source) return null

  const { text, at } = foldTrIndexed(source)
  const spans: Span[] = []
  const matched: EntryDraft['matched'] = []

  // Past tense changes which year a bare "15.09" means, so it has to be
  // known before the date is read rather than after.
  const saidPast = PAST_WORDS.some((w) => trWord(w).test(text))
  const date = findDate(source, today, saidPast ? 'past' : 'future')
  if (date) {
    spans.push({ from: date.index, to: date.index + date.length })
    matched.push({ field: 'date', text: date.text })
  }

  const time = findTime(source, date)
  if (time) {
    spans.push({ from: time.index, to: time.index + time.length })
    matched.push({ field: 'time', text: time.text })
  }

  const taken = (from: number, to: number) =>
    spans.some((s) => from < s.to && s.from < to)

  // Money is read last, so the date and time have already claimed their
  // digits and cannot be spent twice.
  let amount: number | null = null
  const moneyRe = new RegExp(
    `(?:₺\\s*([\\d.,]+)|([\\d.,]+)\\s*${CURRENCY})(?![\\w])`,
    'g',
  )
  for (const m of text.matchAll(moneyRe)) {
    const from = at[m.index]
    const to = at[m.index + m[0].length] ?? source.length
    if (taken(from, to)) continue
    const minor = parseTrAmountToMinor(m[1] ?? m[2])
    if (minor === null || minor <= 0) continue
    amount = fromMinor(minor)
    spans.push({ from, to })
    matched.push({ field: 'amount', text: source.slice(from, to) })
    break
  }

  // A bare number counts as money only when the sentence is already about
  // money — otherwise "3 kişiyiz" would become three lira.
  if (amount === null && saidPast) {
    for (const m of text.matchAll(/\b[\d.,]*\d\b/g)) {
      const from = at[m.index]
      const to = at[m.index + m[0].length] ?? source.length
      if (taken(from, to)) continue
      const minor = parseTrAmountToMinor(m[0])
      if (minor === null || minor <= 0) continue
      amount = fromMinor(minor)
      spans.push({ from, to })
      matched.push({ field: 'amount', text: source.slice(from, to) })
      break
    }
  }

  // Whole words only. As a bare substring, "bim" lives inside "kalbim",
  // "maç" inside "amacım" and "kira" inside "kiraz" — each one a wrong
  // category written quietly into the budget.
  let category: string | null = null
  let categoryAt = -1
  for (const [word, name] of CATEGORY_WORDS) {
    const i = text.search(trWord(word))
    if (i > -1 && (categoryAt === -1 || i < categoryAt)) {
      category = name
      categoryAt = i
    }
  }
  if (category) matched.push({ field: 'category', text: category })

  const isMovie = MOVIE_WORDS.some((w) => trWord(w).test(text))
  // A written date decides for itself, even against "harcadım": a spend
  // cannot be filed on a day that has not happened. With no date at all, the
  // sentence is about now.
  const saidFuture = INTENT_WORDS.some((w) => trWord(w).test(text))
  const past = date ? date.iso <= isoOf(today) : !saidFuture

  if (!date && !amount && !category && !isMovie) return null

  const actions = chooseActions({
    isMovie,
    amount,
    past,
    hasDate: !!date,
    hasTime: !!time,
    category,
  })
  // Understanding a word but having nothing to offer is not understanding.
  if (!actions.length) return null

  return {
    title: buildTitle(source, spans, text, at),
    dateISO: date?.iso ?? null,
    time: time?.time ?? null,
    amount,
    category,
    past,
    actions,
    matched,
  }
}

// Things you go to, as opposed to things you pay. Rent on the 15th is not an
// appointment; a doctor at 19:30 is. Getting this wrong means either a
// calendar full of bills or a theatre outing that never makes the calendar.
const OUTING_CATEGORIES = ['Eğlence', 'Sağlık', 'Eğitim', 'Tatil']

function isoOf(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function chooseActions(input: {
  isMovie: boolean
  amount: number | null
  past: boolean
  hasDate: boolean
  hasTime: boolean
  category: string | null
}): EntryAction[] {
  const { isMovie, amount, past, hasDate, hasTime, category } = input
  const actions: EntryAction[] = []

  // A clock time is the clearest signal there is: nobody writes an hour for a
  // rent payment. Failing that, some categories are places you go.
  const isOuting =
    isMovie ||
    hasTime ||
    (category !== null && OUTING_CATEGORIES.includes(category))
  // Something is happening on a named day, and no money was mentioned — then
  // the only thing it can be is a calendar entry.
  const bareDate = hasDate && amount === null

  if (hasDate && (isOuting || bareDate)) {
    // never both: they would put two entries on the same day for one plan
    actions.push(isMovie ? 'movie-night' : 'event')
  }

  if (amount !== null) {
    // Money on a day that has not happened yet is a plan, not a spend. Writing
    // it as a spend would make the budget claim the user has already paid.
    actions.push(past ? 'spend' : 'plan-expense')
  }
  return actions
}

/** the sentence with every recognised span lifted out, tidied into a title */
function buildTitle(
  source: string,
  spans: Span[],
  folded: string,
  at: number[],
): string {
  const fillerSpans: Span[] = []
  for (const word of FILLER) {
    let i = folded.indexOf(word)
    while (i > -1) {
      fillerSpans.push({
        from: at[i],
        to: at[i + word.length] ?? source.length,
      })
      i = folded.indexOf(word, i + word.length)
    }
  }

  const cuts = [...spans, ...fillerSpans].sort((a, b) => a.from - b.from)
  let out = ''
  let cursor = 0
  for (const cut of cuts) {
    if (cut.from > cursor) out += source.slice(cursor, cut.from)
    cursor = Math.max(cursor, cut.to)
  }
  out += source.slice(cursor)

  const cleaned = out
    .replace(/\s+/g, ' ')
    .replace(/\s*([,;])\s*/g, ' ')
    .replace(/^[\s,;.:-]+|[\s,;.:-]+$/g, '')
    .trim()

  if (!cleaned) return ''
  return cleaned.charAt(0).toLocaleUpperCase('tr') + cleaned.slice(1)
}
