import type { Enums } from '@/lib/database.types'

export type ExpensePeriod = Enums<'expense_period'>

export const PERIOD_LABELS: Record<ExpensePeriod, string> = {
  weekly: 'Haftalık',
  monthly: 'Aylık',
  yearly: 'Yıllık',
}

export const PERIOD_SUFFIX: Record<ExpensePeriod, string> = {
  weekly: '/hafta',
  monthly: '/ay',
  yearly: '/yıl',
}

const WEEKS_PER_MONTH = 52 / 12

export function monthlyEquivalent(
  amount: number,
  period: ExpensePeriod,
): number {
  switch (period) {
    case 'weekly':
      return amount * WEEKS_PER_MONTH
    case 'monthly':
      return amount
    case 'yearly':
      return amount / 12
  }
}
