import { useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { Segmented } from '@/components/Segmented'
import { Switch } from '@/components/Switch'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import { useCreateExpenseItem } from '@/features/budget/hooks'
import { PERIOD_LABELS, type ExpensePeriod } from '@/features/budget/money'
import { todayISO } from '@/lib/dates'
import { parseAmountInput } from '@/lib/money'

type RecurringPeriod = Exclude<ExpensePeriod, 'once'>

const recurringOptions = (['weekly', 'monthly', 'yearly'] as const).map(
  (value) => ({ value, label: PERIOD_LABELS[value] }),
)

export function ExpenseForm({ onDone }: { onDone: () => void }) {
  const { session } = useAuth()
  const createExpenseItem = useCreateExpenseItem()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [isOnce, setIsOnce] = useState(false)
  const [period, setPeriod] = useState<RecurringPeriod>('monthly')
  const [expenseDate, setExpenseDate] = useState(todayISO())
  const [category, setCategory] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const parsedAmount = parseAmountInput(amount)
    if (!parsedAmount) {
      setError('Geçerli bir tutar gir (örn. 4500 veya 4500,50).')
      return
    }
    if (isOnce && !expenseDate) {
      setError('Harcamanın tarihini seç.')
      return
    }
    if (!session) return

    try {
      await createExpenseItem.mutateAsync({
        user_id: session.user.id,
        name: name.trim(),
        amount: parsedAmount,
        period: isOnce ? 'once' : period,
        expense_date: isOnce ? expenseDate : null,
        category: category.trim() || null,
      })
      onDone()
    } catch {
      setError('Kaydedilemedi. Bağlantını kontrol edip tekrar dene.')
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <TextField
        label="Ad"
        required
        placeholder={isOnce ? 'Ayakkabı' : 'Kira'}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <TextField
        label="Tutar (₺)"
        required
        inputMode="decimal"
        placeholder="0,00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Switch
        checked={isOnce}
        onChange={setIsOnce}
        label="Tek seferlik harcama"
      />
      {isOnce ? (
        <TextField
          label="Tarih"
          type="date"
          required
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
        />
      ) : (
        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Periyot
          </span>
          <Segmented<RecurringPeriod>
            options={recurringOptions}
            value={period}
            onChange={setPeriod}
          />
        </div>
      )}
      <TextField
        label="Kategori (isteğe bağlı)"
        placeholder="Konut, ulaşım, abonelik…"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button
        type="submit"
        isLoading={createExpenseItem.isPending}
        className="w-full"
      >
        Kaydet
      </Button>
    </form>
  )
}
