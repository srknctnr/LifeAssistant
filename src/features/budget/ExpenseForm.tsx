import { useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { Segmented } from '@/components/Segmented'
import { Switch } from '@/components/Switch'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import type { ExpenseItem } from '@/features/budget/api'
import { CategoryPicker } from '@/features/budget/CategoryPicker'
import {
  useCreateExpenseItem,
  useUpdateExpenseItem,
} from '@/features/budget/hooks'
import { PERIOD_LABELS, type ExpensePeriod } from '@/features/budget/money'
import { todayISO } from '@/lib/dates'
import { saveErrorMessage } from '@/lib/errors'
import { parseAmountInput } from '@/lib/money'

type RecurringPeriod = Exclude<ExpensePeriod, 'once'>

const recurringOptions = (['weekly', 'monthly', 'yearly'] as const).map(
  (value) => ({ value, label: PERIOD_LABELS[value] }),
)

interface ExpenseFormProps {
  item?: ExpenseItem
  onDone: () => void
}

export function ExpenseForm({ item, onDone }: ExpenseFormProps) {
  const { session } = useAuth()
  const createExpenseItem = useCreateExpenseItem()
  const updateExpenseItem = useUpdateExpenseItem()
  const [name, setName] = useState(item?.name ?? '')
  const [amount, setAmount] = useState(item ? String(item.amount) : '')
  const [isOnce, setIsOnce] = useState(item?.period === 'once')
  const [period, setPeriod] = useState<RecurringPeriod>(
    item && item.period !== 'once' ? item.period : 'monthly',
  )
  const [expenseDate, setExpenseDate] = useState(
    item?.expense_date ?? todayISO(),
  )
  const [category, setCategory] = useState(item?.category ?? '')
  const [error, setError] = useState<string | null>(null)

  const isPending = createExpenseItem.isPending || updateExpenseItem.isPending

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

    const values = {
      name: name.trim(),
      amount: parsedAmount,
      period: (isOnce ? 'once' : period) as ExpensePeriod,
      expense_date: isOnce ? expenseDate : null,
      category: category.trim() || null,
    }

    try {
      if (item) {
        await updateExpenseItem.mutateAsync({ id: item.id, patch: values })
      } else {
        await createExpenseItem.mutateAsync({
          user_id: session.user.id,
          ...values,
        })
      }
      onDone()
    } catch (saveError) {
      setError(saveErrorMessage(saveError))
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
      <CategoryPicker value={category} onChange={setCategory} />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button type="submit" isLoading={isPending} className="w-full">
        Kaydet
      </Button>
    </form>
  )
}
