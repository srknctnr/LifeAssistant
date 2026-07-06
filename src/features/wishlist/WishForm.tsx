import { useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { Segmented } from '@/components/Segmented'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import { useCreateWishlistItem } from '@/features/wishlist/hooks'
import type { Enums } from '@/lib/database.types'
import { parseAmountInput } from '@/lib/money'

type WishlistKind = Enums<'wishlist_kind'>

export function WishForm({ onDone }: { onDone: () => void }) {
  const { session } = useAuth()
  const createItem = useCreateWishlistItem()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<WishlistKind>('purchase')
  const [amount, setAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
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
      await createItem.mutateAsync({
        user_id: session.user.id,
        name: name.trim(),
        kind,
        estimated_amount: parsedAmount,
        target_date: targetDate || null,
      })
      onDone()
    } catch {
      setError('Kaydedilemedi. Bağlantını kontrol edip tekrar dene.')
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <TextField
        label="Ne istiyorsun?"
        required
        placeholder="Kapadokya gezisi, yeni telefon…"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-zinc-700">Tür</span>
        <Segmented<WishlistKind>
          options={[
            { value: 'purchase', label: 'Harcama' },
            { value: 'travel', label: 'Seyahat' },
          ]}
          value={kind}
          onChange={setKind}
        />
      </div>
      <TextField
        label="Tahmini tutar (₺)"
        required
        inputMode="decimal"
        placeholder="0,00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <TextField
        label="Hedef tarih (isteğe bağlı)"
        type="date"
        min={new Date().toISOString().split('T')[0]}
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button type="submit" isLoading={createItem.isPending} className="w-full">
        Kaydet
      </Button>
    </form>
  )
}
