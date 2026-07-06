import { useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { Switch } from '@/components/Switch'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import { useCreateIncome } from '@/features/budget/hooks'
import { parseAmountInput } from '@/lib/money'

export function IncomeForm({ onDone }: { onDone: () => void }) {
  const { session } = useAuth()
  const createIncome = useCreateIncome()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [salaryDay, setSalaryDay] = useState('1')
  const [autoRenew, setAutoRenew] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const parsedAmount = parseAmountInput(amount)
    if (!parsedAmount) {
      setError('Geçerli bir tutar gir (örn. 4500 veya 4500,50).')
      return
    }
    const day = Number.parseInt(salaryDay, 10)
    if (!day || day < 1 || day > 31) {
      setError('Maaş günü 1 ile 31 arasında olmalı.')
      return
    }
    if (!session) return

    try {
      await createIncome.mutateAsync({
        user_id: session.user.id,
        name: name.trim(),
        amount: parsedAmount,
        salary_day: day,
        auto_renew: autoRenew,
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
        placeholder="Maaş"
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
      <TextField
        label="Maaş günü (ayın kaçı?)"
        required
        type="number"
        min={1}
        max={31}
        value={salaryDay}
        onChange={(e) => setSalaryDay(e.target.value)}
      />
      <Switch
        checked={autoRenew}
        onChange={setAutoRenew}
        label="Maaş gününde otomatik yenile"
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button
        type="submit"
        isLoading={createIncome.isPending}
        className="w-full"
      >
        Kaydet
      </Button>
    </form>
  )
}
