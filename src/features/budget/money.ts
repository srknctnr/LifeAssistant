import { fromMinor, toMinor } from '@/features/expenses/split-math'
import { toISODate } from '@/lib/dates'
import type { Enums } from '@/lib/database.types'

export type ExpensePeriod = Enums<'expense_period'>

export const PERIOD_LABELS: Record<ExpensePeriod, string> = {
  once: 'Tek seferlik',
  weekly: 'Haftalık',
  monthly: 'Aylık',
  yearly: 'Yıllık',
}

export const PERIOD_SUFFIX: Record<ExpensePeriod, string> = {
  once: '',
  weekly: '/hafta',
  monthly: '/ay',
  yearly: '/yıl',
}

const WEEKS_PER_MONTH = 52 / 12

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// Monthly cost of a recurring expense; one-time expenses don't recur
export function monthlyEquivalent(
  amount: number,
  period: ExpensePeriod,
): number {
  switch (period) {
    case 'once':
      return 0
    case 'weekly':
      return amount * WEEKS_PER_MONTH
    case 'monthly':
      return amount
    case 'yearly':
      return amount / 12
  }
}

interface ExpenseLike {
  amount: number
  period: ExpensePeriod
  expense_date: string | null
  is_active: boolean
}

// What this item contributes to the given month: recurring items are
// normalized to monthly, one-time items count only in their own month,
// inactive items (e.g. paused savings goals) count as zero
function monthlyValue(item: ExpenseLike, month: string): number {
  if (!item.is_active) return 0
  if (item.period === 'once') {
    return item.expense_date?.startsWith(month) ? item.amount : 0
  }
  return monthlyEquivalent(item.amount, item.period)
}

export function monthlyExpenseTotal(
  items: ExpenseLike[],
  today: Date = new Date(),
): number {
  const month = monthKey(today)
  return items.reduce((sum, item) => sum + monthlyValue(item, month), 0)
}

// This month's expense distribution, largest first; uncategorized items are
// grouped under "Diğer"
export function expenseTotalsByCategory(
  items: (ExpenseLike & { category: string | null })[],
  today: Date = new Date(),
): { category: string; total: number }[] {
  const month = monthKey(today)
  const totals = new Map<string, number>()

  for (const item of items) {
    const value = monthlyValue(item, month)
    if (value <= 0) continue
    const category = item.category?.trim() || 'Diğer'
    totals.set(category, (totals.get(category) ?? 0) + value)
  }

  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
}

interface IncomeLike {
  amount: number
  income_date: string | null
}

// Recurring incomes count every month; one-time incomes only in their month
export function monthlyIncomeTotal(
  items: IncomeLike[],
  today: Date = new Date(),
): number {
  const month = monthKey(today)
  return items.reduce((sum, item) => {
    if (item.income_date) {
      return item.income_date.startsWith(month) ? sum + item.amount : sum
    }
    return sum + item.amount
  }, 0)
}

export interface PaceReport {
  spendable: number // ay bütçesi: gelir − planlı giderler
  spent: number // bu ayki gerçek harcamalar (transactions)
  remaining: number
  dailyAllowance: number // kalan güne bölünmüş güvenli günlük harcama
  projectedTotal: number // bu hızla ay sonu tahmini toplam harcama
  onTrack: boolean
  daysLeft: number
  spentToday: number
  todayBudget: number // bugünün payı — gün boyunca sabit
  todayLeft: number // bugünün payından kalan; eksiye düşebilir
  tomorrowRate: number | null // yarından itibaren günlük; ayın son günü null
}

interface PaceInput {
  monthlyIncome: number
  plannedExpense: number
  transactions: { amount: number; spent_on: string }[]
  today?: Date
}

// PocketGuard-style pace: how much is safe to spend per remaining day, and
// whether the current burn rate fits the month's budget
export function paceReport({
  monthlyIncome,
  plannedExpense,
  transactions,
  today = new Date(),
}: PaceInput): PaceReport {
  const month = monthKey(today)
  const spent = transactions
    .filter((t) => t.spent_on.startsWith(month))
    .reduce((sum, t) => sum + t.amount, 0)

  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate()
  const dayOfMonth = today.getDate()
  const daysLeft = daysInMonth - dayOfMonth + 1

  const spendable = monthlyIncome - plannedExpense
  const remaining = spendable - spent
  const dailyAllowance = Math.max(0, remaining / daysLeft)
  const projectedTotal = (spent / dayOfMonth) * daysInMonth
  const onTrack = projectedTotal <= spendable

  // Today's share of what is left, and what is left OF today.
  //
  // The whole point is that logging 200₺ takes 200₺ off the headline. That
  // only holds if today's budget is blind to today's own spending, so the
  // numerator is spendable minus what was spent on OTHER days. Deriving it
  // from `remaining` instead looks like the same thing — algebraically
  // `spendable - spentBefore === remaining + spentToday` — but `remaining`
  // already contains today, so the headline would move by 200/daysLeft again,
  // which is the invisible feedback this exists to fix. It would also pass a
  // test that logs nothing today, because with spentToday = 0 the two agree.
  //
  // Only the pool is clamped, never todayLeft: a day you have blown reads
  // negative, because it is.
  const todayIso = toISODate(today)
  const spendableMinor = toMinor(spendable)
  const spentMinor = toMinor(spent)
  const spentTodayMinor = transactions.reduce(
    (sum, t) => (t.spent_on === todayIso ? sum + toMinor(t.amount) : sum),
    0,
  )
  const spentBeforeMinor = spentMinor - spentTodayMinor
  const poolMinor = Math.max(0, spendableMinor - spentBeforeMinor)
  const todayBudgetMinor = Math.floor(poolMinor / daysLeft)

  return {
    spendable,
    spent,
    remaining,
    dailyAllowance,
    projectedTotal,
    onTrack,
    daysLeft,
    spentToday: fromMinor(spentTodayMinor),
    todayBudget: fromMinor(todayBudgetMinor),
    todayLeft: fromMinor(todayBudgetMinor - spentTodayMinor),
    // Tomorrow's rate IS tomorrow's todayBudget — same numerator (what is
    // left once today is over), same denominator (the days after today) — so
    // tonight's forecast and tomorrow's headline can never disagree. That only
    // holds if it is floored in kuruş exactly like todayBudget; an unrounded
    // float promises a kuruş more than tomorrow will hand over. On the last
    // day there is no tomorrow to promise: null forces the card to say so
    // rather than print a 0 ₺ target.
    tomorrowRate:
      daysLeft > 1
        ? fromMinor(
            Math.floor(
              Math.max(0, spendableMinor - spentMinor) / (daysLeft - 1),
            ),
          )
        : null,
  }
}

export interface MonthFlow {
  key: string // yyyy-mm
  date: Date // first day of the month
  income: number
  expense: number
}

interface FlowSeriesInput {
  incomes: (IncomeLike & { created_at: string })[]
  expenses: (ExpenseLike & { created_at: string })[]
  monthsBack?: number
  monthsForward?: number
  today?: Date
}

// Month-by-month planned flow. Recurring items count from the month they
// were created onward (past months before an item existed stay empty);
// one-time items land exactly in their own month.
export function monthlyFlowSeries({
  incomes,
  expenses,
  monthsBack = 4,
  monthsForward = 7,
  today = new Date(),
}: FlowSeriesInput): MonthFlow[] {
  const series: MonthFlow[] = []

  for (let offset = -monthsBack; offset <= monthsForward; offset++) {
    const date = new Date(today.getFullYear(), today.getMonth() + offset, 1)
    const key = monthKey(date)

    const income = incomes.reduce((sum, item) => {
      if (item.income_date) {
        return item.income_date.startsWith(key) ? sum + item.amount : sum
      }
      return monthKey(new Date(item.created_at)) <= key
        ? sum + item.amount
        : sum
    }, 0)

    const expense = expenses.reduce((sum, item) => {
      if (!item.is_active) return sum
      if (item.period === 'once') {
        return item.expense_date?.startsWith(key) ? sum + item.amount : sum
      }
      return monthKey(new Date(item.created_at)) <= key
        ? sum + monthlyEquivalent(item.amount, item.period)
        : sum
    }, 0)

    series.push({ key, date, income, expense })
  }

  return series
}
