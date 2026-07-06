import { useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import type { GoalWithWish } from '@/features/wishlist/api'
import { useAddContribution } from '@/features/wishlist/hooks'
import { parseAmountInput } from '@/lib/money'

interface ContributionFormProps {
  goal: GoalWithWish
  onDone: () => void
}

export function ContributionForm({ goal, onDone }: ContributionFormProps) {
  const { session } = useAuth()
  const addContribution = useAddContribution()
  const [amount, setAmount] = useState(String(goal.monthly_amount))
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const parsedAmount = parseAmountInput(amount)
    if (!parsedAmount) {
      setError('Geçerli bir tutar gir.')
      return
    }
    if (!session) return

    try {
      await addContribution.mutateAsync({
        user_id: session.user.id,
        savings_goal_id: goal.id,
        amount: parsedAmount,
        note: note.trim() || null,
      })
      onDone()
    } catch {
      setError('Kaydedilemedi. Tekrar dener misin?')
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <TextField
        label="Tutar (₺)"
        required
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <TextField
        label="Not (isteğe bağlı)"
        placeholder="Temmuz katkısı"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button
        type="submit"
        isLoading={addContribution.isPending}
        className="w-full"
      >
        Katkıyı kaydet
      </Button>
    </form>
  )
}
