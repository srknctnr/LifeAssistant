import { useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { Switch } from '@/components/Switch'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import type { Income } from '@/features/budget/api'
import { useCreateIncome, useUpdateIncome } from '@/features/budget/hooks'
import { todayISO } from '@/lib/dates'
import { parseAmountInput } from '@/lib/money'

interface IncomeFormProps {
  income?: Income
  onDone: () => void
}

export function IncomeForm({ income, onDone }: IncomeFormProps) {
  const { session } = useAuth()
  const createIncome = useCreateIncome()
  const updateIncome = useUpdateIncome()
  const [name, setName] = useState(income?.name ?? '')
  const [amount, setAmount] = useState(income ? String(income.amount) : '')
  const [isOnce, setIsOnce] = useState(income?.income_date != null)
  const [incomeDate, setIncomeDate] = useState(
    income?.income_date ?? todayISO(),
  )
  const [salaryDay, setSalaryDay] = useState(
    income?.salary_day ? String(income.salary_day) : '1',
  )
  const [autoRenew, setAutoRenew] = useState(income?.auto_renew ?? true)
  const [error, setError] = useState<string | null>(null)

  const isPending = createIncome.isPending || updateIncome.isPending

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const parsedAmount = parseAmountInput(amount)
    if (!parsedAmount) {
      setError('Geçerli bir tutar gir (örn. 4500 veya 4500,50).')
      return
    }

    let day: number | null = null
    if (isOnce) {
      if (!incomeDate) {
        setError('Gelirin tarihini seç.')
        return
      }
    } else {
      day = Number.parseInt(salaryDay, 10)
      if (!day || day < 1 || day > 31) {
        setError('Maaş günü 1 ile 31 arasında olmalı.')
        return
      }
    }
    if (!session) return

    const values = {
      name: name.trim(),
      amount: parsedAmount,
      salary_day: isOnce ? null : day,
      income_date: isOnce ? incomeDate : null,
      auto_renew: isOnce ? false : autoRenew,
    }

    try {
      if (income) {
        await updateIncome.mutateAsync({ id: income.id, patch: values })
      } else {
        await createIncome.mutateAsync({ user_id: session.user.id, ...values })
      }
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
        placeholder={isOnce ? 'İkramiye' : 'Maaş'}
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
        label="Tek seferlik gelir (ek gelir)"
      />
      {isOnce ? (
        <TextField
          label="Tarih"
          type="date"
          required
          value={incomeDate}
          onChange={(e) => setIncomeDate(e.target.value)}
        />
      ) : (
        <>
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
        </>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button type="submit" isLoading={isPending} className="w-full">
        Kaydet
      </Button>
    </form>
  )
}
