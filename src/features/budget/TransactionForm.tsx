import { useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import type { Transaction } from '@/features/budget/api'
import { CategoryPicker } from '@/features/budget/CategoryPicker'
import {
  useCreateTransaction,
  useUpdateTransaction,
} from '@/features/budget/hooks'
import { FamilyVisibilityField } from '@/features/family/FamilyVisibilityField'
import { useMyShareMode } from '@/features/family/hooks'
import { resolveFamilyVisibility } from '@/features/family/share-utils'
import { todayISO } from '@/lib/dates'
import { saveErrorMessage } from '@/lib/errors'
import { parseAmountInput } from '@/lib/money'

interface TransactionFormProps {
  transaction?: Transaction
  onDone: () => void
}

export function TransactionForm({ transaction, onDone }: TransactionFormProps) {
  const { session } = useAuth()
  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount) : '',
  )
  const [category, setCategory] = useState(transaction?.category ?? '')
  const [note, setNote] = useState(transaction?.note ?? '')
  const [spentOn, setSpentOn] = useState(transaction?.spent_on ?? todayISO())
  const shareMode = useMyShareMode('budget')
  const [familyVisible, setFamilyVisible] = useState(
    transaction?.is_family_visible ?? false,
  )
  const [error, setError] = useState<string | null>(null)

  const isPending = createTransaction.isPending || updateTransaction.isPending

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const parsedAmount = parseAmountInput(amount)
    if (!parsedAmount) {
      setError('Geçerli bir tutar gir (örn. 350 veya 349,90).')
      return
    }
    if (!session) return

    const values = {
      amount: parsedAmount,
      category: category.trim() || null,
      note: note.trim() || null,
      spent_on: spentOn,
      is_family_visible: resolveFamilyVisibility(
        shareMode,
        familyVisible,
        transaction?.is_family_visible,
      ),
    }

    try {
      if (transaction) {
        await updateTransaction.mutateAsync({
          id: transaction.id,
          patch: values,
        })
      } else {
        await createTransaction.mutateAsync({
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
        label="Tutar (₺)"
        required
        autoFocus
        inputMode="decimal"
        placeholder="0,00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <CategoryPicker value={category} onChange={setCategory} />
      <TextField
        label="Not (isteğe bağlı)"
        placeholder="Öğle yemeği"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <TextField
        label="Tarih"
        type="date"
        required
        value={spentOn}
        onChange={(e) => setSpentOn(e.target.value)}
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
