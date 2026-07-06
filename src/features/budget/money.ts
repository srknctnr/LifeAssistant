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
}

// This month's total: recurring items normalized to monthly + one-time
// items whose expense_date falls in the current month
export function monthlyExpenseTotal(
  items: ExpenseLike[],
  today: Date = new Date(),
): number {
  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  return items.reduce((sum, item) => {
    if (item.period === 'once') {
      return item.expense_date?.startsWith(month) ? sum + item.amount : sum
    }
    return sum + monthlyEquivalent(item.amount, item.period)
  }, 0)
}
