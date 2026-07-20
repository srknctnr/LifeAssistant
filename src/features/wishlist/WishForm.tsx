import { useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { Segmented } from '@/components/Segmented'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import { FamilyVisibilityField } from '@/features/family/FamilyVisibilityField'
import { useMyShareMode } from '@/features/family/hooks'
import { resolveFamilyVisibility } from '@/features/family/share-utils'
import type { WishlistItem } from '@/features/wishlist/api'
import {
  useCreateWishlistItem,
  useUpdateWishlistItem,
} from '@/features/wishlist/hooks'
import type { Enums } from '@/lib/database.types'
import { parseAmountInput } from '@/lib/money'

type WishlistKind = Enums<'wishlist_kind'>

interface WishFormProps {
  item?: WishlistItem
  onDone: () => void
}

export function WishForm({ item, onDone }: WishFormProps) {
  const { session } = useAuth()
  const createItem = useCreateWishlistItem()
  const updateItem = useUpdateWishlistItem()
  const [name, setName] = useState(item?.name ?? '')
  const [kind, setKind] = useState<WishlistKind>(item?.kind ?? 'purchase')
  const [amount, setAmount] = useState(
    item ? String(item.estimated_amount) : '',
  )
  const [targetDate, setTargetDate] = useState(item?.target_date ?? '')
  const shareMode = useMyShareMode('wishlist')
  const [familyVisible, setFamilyVisible] = useState(
    item?.is_family_visible ?? false,
  )
  const [error, setError] = useState<string | null>(null)

  const isPending = createItem.isPending || updateItem.isPending

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const parsedAmount = parseAmountInput(amount)
    if (!parsedAmount) {
      setError('Geçerli bir tutar gir (örn. 4500 veya 4500,50).')
      return
    }
    if (!session) return

    const values = {
      name: name.trim(),
      kind,
      estimated_amount: parsedAmount,
      target_date: targetDate || null,
      is_family_visible: resolveFamilyVisibility(
        shareMode,
        familyVisible,
        item?.is_family_visible,
      ),
    }

    try {
      if (item) {
        await updateItem.mutateAsync({ id: item.id, patch: values })
      } else {
        await createItem.mutateAsync({ user_id: session.user.id, ...values })
      }
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
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tür
        </span>
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
      {shareMode === 'ask' && (
        <FamilyVisibilityField
          value={familyVisible}
          onChange={setFamilyVisible}
        />
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
