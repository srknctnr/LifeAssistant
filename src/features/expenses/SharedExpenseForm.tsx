import { Check } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { Segmented } from '@/components/Segmented'
import { TextField } from '@/components/TextField'
import { CategoryPicker } from '@/features/budget/CategoryPicker'
import type { ExpenseWithShares } from '@/features/expenses/api'
import { useDeleteExpense, useSaveExpense } from '@/features/expenses/hooks'
import { equalShares, type LedgerMember } from '@/features/expenses/ledger'
import { todayISO } from '@/lib/dates'
import { saveErrorMessage } from '@/lib/errors'
import { formatMoney, parseAmountInput } from '@/lib/money'

const fieldClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20'

type SplitMode = 'equal' | 'amount'

interface SharedExpenseFormProps {
  familyId: string
  members: LedgerMember[]
  expense?: ExpenseWithShares
  onDone: () => void
}

export function SharedExpenseForm({
  familyId,
  members,
  expense,
  onDone,
}: SharedExpenseFormProps) {
  const save = useSaveExpense(familyId)
  const remove = useDeleteExpense(familyId)
  const payerId = useId()

  const me = members.find((m) => m.isSelf)
  const [title, setTitle] = useState(expense?.title ?? '')
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [paidBy, setPaidBy] = useState(
    expense?.paid_by ?? me?.userId ?? members[0]?.userId ?? '',
  )
  const [spentOn, setSpentOn] = useState(expense?.spent_on ?? todayISO())
  const [category, setCategory] = useState(expense?.category ?? '')
  const [note, setNote] = useState(expense?.note ?? '')
  const [splitMode, setSplitMode] = useState<SplitMode>(
    expense?.split_mode ?? 'equal',
  )
  const [participants, setParticipants] = useState<string[]>(
    expense
      ? expense.expense_shares.map((s) => s.user_id)
      : // a new expense starts with everyone still in the group
        members.filter((m) => !m.isFormer).map((m) => m.userId),
  )
  const [customShares, setCustomShares] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (expense?.expense_shares ?? []).map((s) => [s.user_id, String(s.amount)]),
    ),
  )
  const [error, setError] = useState<string | null>(null)
  const [armed, setArmed] = useState(false)

  const parsedAmount = parseAmountInput(amount) ?? 0
  const isPending = save.isPending || remove.isPending

  // live preview of what each person ends up owing
  const preview =
    splitMode === 'equal' && participants.length > 0 && parsedAmount > 0
      ? equalShares(parsedAmount, participants, paidBy)
      : []
  const customTotal = participants.reduce(
    (sum, id) => sum + (parseAmountInput(customShares[id] ?? '') ?? 0),
    0,
  )

  function toggleParticipant(userId: string) {
    setParticipants((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    )
  }

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Harcamaya bir ad ver.')
      return
    }
    if (!parsedAmount) {
      setError('Geçerli bir tutar gir (örn. 350 veya 349,90).')
      return
    }
    if (participants.length === 0) {
      setError('En az bir kişi bu harcamayı paylaşmalı.')
      return
    }

    const shares =
      splitMode === 'equal'
        ? equalShares(parsedAmount, participants, paidBy)
        : participants.map((user_id) => ({
            user_id,
            amount: parseAmountInput(customShares[user_id] ?? '') ?? 0,
          }))

    const sum = shares.reduce((total, s) => total + s.amount, 0)
    if (Math.round(sum * 100) !== Math.round(parsedAmount * 100)) {
      setError(
        `Payların toplamı ${formatMoney(sum)}, tutar ${formatMoney(parsedAmount)}. Eşitle.`,
      )
      return
    }

    try {
      await save.mutateAsync({
        familyId,
        expenseId: expense?.id ?? null,
        title: title.trim(),
        amount: parsedAmount,
        paidBy,
        spentOn,
        category: category.trim() || null,
        note: note.trim() || null,
        splitMode,
        shares,
      })
      onDone()
    } catch (saveError) {
      setError(saveErrorMessage(saveError))
    }
  }

  async function handleDelete() {
    if (!expense) return
    if (!armed) {
      setArmed(true)
      setTimeout(() => setArmed(false), 3000)
      return
    }
    try {
      await remove.mutateAsync(expense.id)
      onDone()
    } catch (deleteError) {
      setError(saveErrorMessage(deleteError))
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <TextField
        label="Ne için?"
        required
        autoFocus
        placeholder="Market, benzin, akşam yemeği…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
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
        <label
          htmlFor={payerId}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Kim ödedi?
        </label>
        <select
          id={payerId}
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
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
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Kimler paylaşıyor?
        </span>
        <div className="flex flex-wrap gap-1.5">
          {members.map((member) => {
            const on = participants.includes(member.userId)
            return (
              <button
                key={member.userId}
                type="button"
                onClick={() => toggleParticipant(member.userId)}
                aria-pressed={on}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  on
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                }`}
              >
                {on && <Check size={13} strokeWidth={3} />}
                {member.isSelf ? 'Ben' : member.name}
                {member.isFormer && (
                  <span className="text-[10px] opacity-70">ayrıldı</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nasıl bölüşülsün?
        </span>
        <Segmented<SplitMode>
          options={[
            { value: 'equal', label: 'Eşit' },
            { value: 'amount', label: 'Özel tutar' },
          ]}
          value={splitMode}
          onChange={setSplitMode}
        />
      </div>

      {splitMode === 'equal' && preview.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-zinc-50 px-3.5 py-2.5 dark:bg-zinc-800/60">
          {preview.map((share) => {
            const member = members.find((m) => m.userId === share.user_id)
            return (
              <li
                key={share.user_id}
                className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400"
              >
                <span>{member?.isSelf ? 'Ben' : (member?.name ?? 'Üye')}</span>
                <span className="font-medium tabular-nums">
                  {formatMoney(share.amount)}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {splitMode === 'amount' && (
        <div className="space-y-2">
          {participants.map((userId) => {
            const member = members.find((m) => m.userId === userId)
            return (
              <TextField
                key={userId}
                label={member?.isSelf ? 'Ben' : (member?.name ?? 'Üye')}
                inputMode="decimal"
                placeholder="0,00"
                value={customShares[userId] ?? ''}
                onChange={(e) =>
                  setCustomShares((current) => ({
                    ...current,
                    [userId]: e.target.value,
                  }))
                }
              />
            )
          })}
          <p
            className={`text-xs tabular-nums ${
              Math.round(customTotal * 100) === Math.round(parsedAmount * 100)
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            Toplam {formatMoney(customTotal)} / {formatMoney(parsedAmount)}
          </p>
        </div>
      )}

      <TextField
        label="Tarih"
        type="date"
        required
        value={spentOn}
        onChange={(e) => setSpentOn(e.target.value)}
      />
      <CategoryPicker value={category} onChange={setCategory} />
      <TextField
        label="Not (isteğe bağlı)"
        placeholder="Nerede, ne aldık…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button type="submit" isLoading={isPending} className="w-full">
        Kaydet
      </Button>

      {expense && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          {armed ? 'Emin misin? Tekrar dokun' : 'Harcamayı sil'}
        </button>
      )}
    </form>
  )
}
