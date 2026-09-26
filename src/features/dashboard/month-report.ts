import {
  monthlyExpenseTotal,
  monthlyIncomeTotal,
  monthSpendTotal,
  transactionTotalsByCategory,
} from '@/features/budget/money'

interface IncomeLike {
  amount: number
  income_date: string | null
  created_at?: string
}

interface ExpenseLike {
  amount: number
  period: 'once' | 'weekly' | 'monthly' | 'yearly'
  expense_date: string | null
  is_active: boolean
  created_at?: string
}

interface TransactionLike {
  amount: number
  category: string | null
  spent_on: string
}

interface ContributionLike {
  amount: number
  contributed_on: string
}

interface MovieLike {
  watched_on: string | null
}

interface TripLike {
  title: string
  cover_emoji: string | null
  starts_on: string
  ends_on: string
}

export interface MonthReport {
  /** yyyy-mm of the month being reported */
  key: string
  /** first day of it, for formatting */
  anchor: Date
  spendable: number
  spent: number
  /** spendable − spent; negative means the month was overspent */
  left: number
  /** the month before it, or null when there is nothing to compare against */
  spentBefore: number | null
  topCategories: { category: string; total: number; share: number }[]
  saved: number
  moviesWatched: number
  trips: { title: string; emoji: string }[]
}

/**
 * What last month looked like, once it is over.
 *
 * Built from the very functions the budget page uses for a chosen month —
 * monthlyIncomeTotal, monthlyExpenseTotal, monthSpendTotal and
 * transactionTotalsByCategory — so the recap and the page cannot disagree
 * about the same month. That agreement is the whole reason this composes
 * existing helpers instead of summing rows itself.
 *
 * Returns null when there is nothing to report: a month with no plan and no
 * spending is a month the user was not here for, and a recap of it would be a
 * card full of zeroes pretending to be news.
 */
export function buildMonthReport(input: {
  incomes: IncomeLike[]
  expenses: ExpenseLike[]
  transactions: TransactionLike[]
  contributions: ContributionLike[]
  movies: MovieLike[]
  trips: TripLike[]
  /** which month to report; defaults to the one before today's */
  month?: Date
  today?: Date
}): MonthReport | null {
  const today = input.today ?? new Date()
  const anchor =
    input.month ?? new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const key = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`

  const spendable =
    monthlyIncomeTotal(input.incomes, anchor) -
    monthlyExpenseTotal(input.expenses, anchor)
  const spent = monthSpendTotal(input.transactions, anchor)

  // A verdict needs both sides. With no plan there is nothing to come in
  // under, and with nothing logged there is no evidence of coming in under
  // it — a month the user simply did not open the app in looks exactly like
  // a month of perfect restraint, and congratulating them for it is the same
  // fabricated improvement the spentBefore rule below refuses to make.
  if (spendable <= 0 || spent === 0) return null

  const before = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1)
  const spentBeforeRaw = monthSpendTotal(input.transactions, before)
  const hadMonthBefore = input.transactions.some((t) =>
    t.spent_on.startsWith(
      `${before.getFullYear()}-${String(before.getMonth() + 1).padStart(2, '0')}`,
    ),
  )

  const categories = transactionTotalsByCategory(input.transactions, anchor)
  const topCategories = categories.slice(0, 3).map((row) => ({
    ...row,
    share: spent > 0 ? row.total / spent : 0,
  }))

  return {
    key,
    anchor,
    spendable,
    spent,
    left: spendable - spent,
    // a zero from a month that was never used is not a comparison, it is a
    // fabricated improvement — say nothing instead
    spentBefore: hadMonthBefore ? spentBeforeRaw : null,
    topCategories,
    saved: input.contributions.reduce(
      (sum, c) => (c.contributed_on.startsWith(key) ? sum + c.amount : sum),
      0,
    ),
    moviesWatched: input.movies.filter((m) => m.watched_on?.startsWith(key))
      .length,
    // a trip counts for the month it touched, even by one day
    trips: input.trips
      .filter(
        (t) => t.starts_on.slice(0, 7) <= key && t.ends_on.slice(0, 7) >= key,
      )
      .map((t) => ({ title: t.title, emoji: t.cover_emoji ?? '✈️' })),
  }
}

/**
 * Whether the recap still belongs on the landing screen.
 *
 * Lives here rather than as a guard inside the component because that is the
 * one place this repo's tests cannot reach — a rule written inline there has
 * shipped wrong before.
 *
 * There is deliberately no "expires on the 15th" rule. A cap like that hides
 * the recap from exactly the person it is for: the one who opens the app
 * rarely. Dismissing it is what makes it go away, and that is a decision the
 * user makes rather than the calendar.
 */
export function monthReportIsNews(
  report: MonthReport | null,
  seen: string | null,
): report is MonthReport {
  if (!report) return false
  return seen !== report.key
}
