import { useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { Segmented } from '@/components/Segmented'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import { useCreateExpenseItem } from '@/features/budget/hooks'
import { PERIOD_LABELS, type ExpensePeriod } from '@/features/budget/money'
import { parseAmountInput } from '@/lib/money'

const periodOptions = (
  Object.entries(PERIOD_LABELS) as [ExpensePeriod, string][]
).map(([value, label]) => ({ value, label }))

export function ExpenseForm({ onDone }: { onDone: () => void }) {
  const { session } = useAuth()
  const createExpenseItem = useCreateExpenseItem()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState<ExpensePeriod>('monthly')
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
    if (!session) return

    try {
      await createExpenseItem.mutateAsync({
        user_id: session.user.id,
        name: name.trim(),
        amount: parsedAmount,
        period,
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
        placeholder="Kira"
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
      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-zinc-700">Periyot</span>
        <Segmented<ExpensePeriod>
          options={periodOptions}
          value={period}
          onChange={setPeriod}
        />
      </div>
      <TextField
        label="Kategori (isteğe bağlı)"
        placeholder="Konut, ulaşım, abonelik…"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

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
