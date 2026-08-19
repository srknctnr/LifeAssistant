// The currencies a group can keep its ledger in. Personal budget stays TRY;
// this is for a holiday group that spends in euros.
export const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'] as const

export type Currency = (typeof CURRENCIES)[number]

const SYMBOLS: Record<string, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
}

export function currencySymbol(currency: string): string {
  return SYMBOLS[currency] ?? currency
}

export function formatMoney(amount: number, currency = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Accepts "4500", "4500,50" and "4500.50"; rejects anything else
export function parseAmountInput(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) && value > 0 ? value : null
}
