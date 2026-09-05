import { CalendarClock, Gauge } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { addMonths } from '@/features/calendar/month-math'
import type { GoalWithWish } from '@/features/wishlist/api'
import {
  goalPace,
  monthsUntil,
  suggestedMonthlyAmount,
} from '@/features/wishlist/goal-math'
import { useUpdateGoalPlan } from '@/features/wishlist/hooks'
import { toISODate, todayISO } from '@/lib/dates'
import { saveErrorMessage } from '@/lib/errors'
import { formatMoney, parseAmountInput } from '@/lib/money'

interface GoalPlanFormProps {
  goal: GoalWithWish
  saved: number
  onDone: () => void
}

// A plan is three numbers that have to agree: what it costs, when you want it,
// and what you put aside each month. Change one and the other two are stale —
// so each preset moves exactly one of them and leaves the rest alone.
export function GoalPlanForm({ goal, saved, onDone }: GoalPlanFormProps) {
  const update = useUpdateGoalPlan()
  const [target, setTarget] = useState(String(goal.target_amount))
  const [monthly, setMonthly] = useState(String(goal.monthly_amount))
  const [targetDate, setTargetDate] = useState(
    goal.wishlist_items?.target_date ?? '',
  )
  const [error, setError] = useState<string | null>(null)

  const parsedTarget = parseAmountInput(target)
  const parsedMonthly = parseAmountInput(monthly)
  const remaining = Math.max(0, (parsedTarget ?? 0) - saved)
  const months = targetDate ? monthsUntil(new Date(targetDate)) : null
  // an overdue goal is exactly the one this form is for, so its past date must
  // not be treated as a usable one
  const dateIsFuture = Boolean(targetDate) && targetDate > todayISO()

  // a paused plan is not a broken promise — the same rule GoalPaceLine applies
  const pace =
    goal.status === 'active'
      ? goalPace({
          targetDate: goal.wishlist_items?.target_date,
          monthlyAmount: goal.monthly_amount,
          targetAmount: goal.target_amount,
          saved,
        })
      : null

  // catch up by paying more each month, keeping the date you promised yourself
  function catchUp() {
    // monthsUntil floors at 1, so on a date already gone this would drop the
    // entire remaining balance into the monthly field
    if (!dateIsFuture || remaining <= 0) return
    setMonthly(
      String(
        suggestedMonthlyAmount(remaining, monthsUntil(new Date(targetDate))),
      ),
    )
  }

  // or keep the monthly amount you can actually afford and move the date
  function pushDate() {
    if (!parsedMonthly || remaining <= 0) return
    const needed = Math.ceil(remaining / parsedMonthly)
    setTargetDate(toISODate(addMonths(new Date(), needed)))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!parsedTarget) {
      setError('Geçerli bir hedef tutar gir.')
      return
    }
    if (!parsedMonthly) {
      setError('Geçerli bir aylık tutar gir.')
      return
    }
    if (!targetDate) {
      setError('Hedefe ulaşmak istediğin tarihi seç.')
      return
    }
    if (!dateIsFuture) {
      setError(
        'Hedef tarih geçmişte kalmış. İleri bir tarih seç ya da “Tarihi ertele”ye dokun.',
      )
      return
    }

    try {
      await update.mutateAsync({
        goal,
        targetAmount: parsedTarget,
        monthlyAmount: parsedMonthly,
        targetDate,
      })
      onDone()
    } catch (updateError) {
      // stay open on failure: the three writes are absolute, so submitting the
      // same form again repairs a half-applied update
      setError(saveErrorMessage(updateError))
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {pace !== null && pace.monthsBehind > 0 && (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm dark:bg-amber-500/10">
          <p className="font-medium text-amber-700 dark:text-amber-400">
            {pace.monthsBehind} ay geridesin
          </p>
          <p className="mt-0.5 text-amber-700/80 dark:text-amber-400/80">
            Planına göre bugüne kadar{' '}
            {formatMoney(pace.expectedSaved, goal.currency)} birikmiş olmalıydı;{' '}
            {formatMoney(saved, goal.currency)} var. Planı buradan gerçeğe
            uydurabilirsin — katkı geçmişin olduğu gibi kalır.
          </p>
        </div>
      )}

      <TextField
        label="Hedef tutar (₺)"
        required
        inputMode="decimal"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      />

      {/* deliberately no min: the field is seeded with the goal's existing
          date, and on an overdue goal a native min silently blocks submit —
          no Turkish message, no pending state, nothing. handleSubmit says so
          in words instead. */}
      <TextField
        label="Hedef tarih"
        type="date"
        required
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
      />

      <TextField
        label="Aylık biriktirilecek tutar (₺)"
        required
        inputMode="decimal"
        value={monthly}
        onChange={(e) => setMonthly(e.target.value)}
      />

      {remaining > 0 && (
        <div className="flex gap-2">
          <PresetButton
            icon={<Gauge size={14} />}
            label="Aynı tarihe yetiş"
            disabled={!dateIsFuture}
            onClick={catchUp}
          />
          <PresetButton
            icon={<CalendarClock size={14} />}
            label="Tarihi ertele"
            disabled={!parsedMonthly}
            onClick={pushDate}
          />
        </div>
      )}

      {months !== null && parsedMonthly && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Kalan {formatMoney(remaining, goal.currency)} · {months} ay ×{' '}
          {formatMoney(parsedMonthly)} ={' '}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {formatMoney(months * parsedMonthly)}
          </span>
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button type="submit" isLoading={update.isPending} className="w-full">
        Planı güncelle
      </Button>
      <p className="text-center text-xs text-zinc-400">
        Bütçendeki aylık tasarruf kalemi de yeni tutara güncellenir. Biriken
        para ve katkı geçmişi değişmez.
      </p>
    </form>
  )
}

function PresetButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 disabled:opacity-50 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
    >
      {icon}
      {label}
    </button>
  )
}
