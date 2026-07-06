import { useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import type { WishlistItem } from '@/features/wishlist/api'
import {
  monthsUntil,
  suggestedMonthlyAmount,
} from '@/features/wishlist/goal-math'
import { useConvertWishlistItem } from '@/features/wishlist/hooks'
import { formatMoney, parseAmountInput } from '@/lib/money'

interface ConvertFormProps {
  item: WishlistItem
  onDone: () => void
}

function suggestFor(item: WishlistItem, dateStr: string): string {
  if (!dateStr) return ''
  const months = monthsUntil(new Date(dateStr))
  return String(suggestedMonthlyAmount(item.estimated_amount, months))
}

export function ConvertForm({ item, onDone }: ConvertFormProps) {
  const convert = useConvertWishlistItem()
  const [targetDate, setTargetDate] = useState(item.target_date ?? '')
  const [monthly, setMonthly] = useState(() =>
    suggestFor(item, item.target_date ?? ''),
  )
  const [error, setError] = useState<string | null>(null)

  const months = targetDate ? monthsUntil(new Date(targetDate)) : null
  const parsedMonthly = parseAmountInput(monthly)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!targetDate) {
      setError('Hedefe ulaşmak istediğin tarihi seç.')
      return
    }
    if (!parsedMonthly) {
      setError('Geçerli bir aylık tutar gir.')
      return
    }

    try {
      await convert.mutateAsync({
        wishlistItemId: item.id,
        monthlyAmount: parsedMonthly,
        targetDate,
      })
      onDone()
    } catch {
      setError('Dönüştürme başarısız oldu. Tekrar dener misin?')
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800">
        <p className="font-medium">{item.name}</p>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Hedef tutar: {formatMoney(item.estimated_amount, item.currency)}
        </p>
      </div>

      <TextField
        label="Hedef tarih"
        type="date"
        required
        min={new Date().toISOString().split('T')[0]}
        value={targetDate}
        onChange={(e) => {
          setTargetDate(e.target.value)
          setMonthly(suggestFor(item, e.target.value))
        }}
      />

      <TextField
        label="Aylık biriktirilecek tutar (₺)"
        required
        inputMode="decimal"
        placeholder="0,00"
        value={monthly}
        onChange={(e) => setMonthly(e.target.value)}
      />

      {months !== null && parsedMonthly && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {months} ay × {formatMoney(parsedMonthly)} ={' '}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {formatMoney(months * parsedMonthly)}
          </span>
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button type="submit" isLoading={convert.isPending} className="w-full">
        Bütçeme gider olarak ekle
      </Button>
      <p className="text-center text-xs text-zinc-400">
        Bütçene &quot;{item.name}&quot; adında aylık bir tasarruf kalemi
        eklenecek.
      </p>
    </form>
  )
}
