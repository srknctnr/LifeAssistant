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
