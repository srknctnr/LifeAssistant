import { useId, useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import { useCreateSettlement } from '@/features/expenses/hooks'
import type { LedgerMember, LedgerTransfer } from '@/features/expenses/ledger'
import { todayISO } from '@/lib/dates'
import { saveErrorMessage } from '@/lib/errors'
import { currencySymbol, parseAmountInput } from '@/lib/money'

const fieldClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20'

interface SettlementFormProps {
  familyId: string
  currency: string
  members: LedgerMember[]
  // prefilled when the sheet is opened from a "kim kime ödesin" row
  suggestion?: LedgerTransfer
  onDone: () => void
}

export function SettlementForm({
  familyId,
  currency,
  members,
  suggestion,
  onDone,
}: SettlementFormProps) {
  const { session } = useAuth()
  const create = useCreateSettlement(familyId)
  const fromId = useId()
  const toId = useId()

  const me = members.find((m) => m.isSelf)
  const [fromUser, setFromUser] = useState(
    suggestion?.fromUser ?? me?.userId ?? members[0]?.userId ?? '',
  )
  const [toUser, setToUser] = useState(
    suggestion?.toUser ??
      members.find((m) => !m.isSelf)?.userId ??
      members[0]?.userId ??
      '',
  )
  const [amount, setAmount] = useState(
    suggestion ? String(suggestion.amount) : '',
  )
  const [settledOn, setSettledOn] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault()
    setError(null)

    const parsed = parseAmountInput(amount)
    if (!parsed) {
      setError('Geçerli bir tutar gir.')
      return
    }
    if (fromUser === toUser) {
      setError('Ödeyen ve alan aynı kişi olamaz.')
      return
    }
    if (!session) return

    try {
      await create.mutateAsync({
        familyId,
        fromUser,
        toUser,
        amount: parsed,
        currency,
        settledOn,
        note: note.trim() || null,
        createdBy: session.user.id,
      })
      onDone()
    } catch (saveError) {
      setError(saveErrorMessage(saveError))
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label
          htmlFor={fromId}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Kim ödedi?
        </label>
        <select
          id={fromId}
          value={fromUser}
          onChange={(e) => setFromUser(e.target.value)}
          className={fieldClass}
        >
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.isSelf ? `${member.name} (sen)` : member.name}
              {member.isFormer ? ' · ayrıldı' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={toId}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Kime?
        </label>
        <select
          id={toId}
          value={toUser}
          onChange={(e) => setToUser(e.target.value)}
          className={fieldClass}
        >
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.isSelf ? `${member.name} (sen)` : member.name}
              {member.isFormer ? ' · ayrıldı' : ''}
            </option>
          ))}
        </select>
      </div>

      <TextField
        label={`Tutar (${currencySymbol(currency)})`}
        required
        inputMode="decimal"
        placeholder="0,00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <TextField
        label="Tarih"
        type="date"
        required
        value={settledOn}
        onChange={(e) => setSettledOn(e.target.value)}
      />
      <TextField
        label="Not (isteğe bağlı)"
        placeholder="Havale, nakit…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button type="submit" isLoading={create.isPending} className="w-full">
        Ödeşmeyi kaydet
      </Button>
    </form>
  )
}
