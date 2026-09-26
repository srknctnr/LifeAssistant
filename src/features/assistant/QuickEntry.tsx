import { Sparkles } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { parseEntry, type EntryAction } from '@/features/assistant/parse-entry'
import { useAuth } from '@/features/auth/useAuth'
import { CategoryPicker } from '@/features/budget/CategoryPicker'
import {
  useCreateExpenseItem,
  useCreateTransaction,
} from '@/features/budget/hooks'
import { useCreateEvent } from '@/features/calendar/hooks'
import { useMyShareMode } from '@/features/family/hooks'
import { resolveFamilyVisibility } from '@/features/family/share-utils'
import { formatDate, todayISO } from '@/lib/dates'
import { saveErrorMessage } from '@/lib/errors'
import { formatMoney, parseAmountInput } from '@/lib/money'

const ACTION_LABELS: Record<EntryAction, string> = {
  'movie-night': 'Film gecesi olarak takvime',
  event: 'Takvime ekle',
  spend: 'Harcama olarak yaz',
  'plan-expense': 'Bütçeye planlı gider olarak yaz',
}

const NEEDS_TITLE: EntryAction[] = ['movie-night', 'event', 'plan-expense']
const NEEDS_AMOUNT: EntryAction[] = ['spend', 'plan-expense']

const PLACEHOLDER = 'cuma sinemaya gidiyoruz, 600 TL bütçem var'

/**
 * Quick entry: a sentence becomes a draft you confirm.
 *
 * The roadmap calls this the AI assistant shell. It reads Turkish with rules
 * rather than a model — see parse-entry.ts for why that is the honest choice
 * in a static app with no server — and the difference the user actually feels
 * is that it shows its work: every field says which of their words produced
 * it, and nothing is written until they press the button.
 *
 * The sentence fills a form. It does not replace one: every field stays
 * editable, because a parser that cannot be corrected is worse than a form.
 */
export function QuickEntry({ onDone }: { onDone: () => void }) {
  const { session } = useAuth()
  const createEvent = useCreateEvent()
  const createTransaction = useCreateTransaction()
  const createExpenseItem = useCreateExpenseItem()
  const budgetShare = useMyShareMode('budget')
  const calendarShare = useMyShareMode('calendar')

  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [chosen, setChosen] = useState<EntryAction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<EntryAction[]>([])

  const draft = useMemo(() => parseEntry(text), [text])

  // Re-reading the sentence replaces the draft wholesale. Keeping a stale
  // edit alive across a new sentence is how a form ends up saving a field the
  // user can no longer see.
  function reread(next: string) {
    setText(next)
    setError(null)
    setDone([])
    const parsed = parseEntry(next)
    setTitle(parsed?.title ?? '')
    setDate(parsed?.dateISO ?? '')
    setTime(parsed?.time ?? '')
    setAmount(parsed?.amount !== null && parsed ? String(parsed.amount) : '')
    setCategory(parsed?.category ?? '')
    setChosen(parsed?.actions ?? [])
  }

  const pending =
    createEvent.isPending ||
    createTransaction.isPending ||
    createExpenseItem.isPending

  const effectiveDate = date || todayISO()
  const parsedAmount = parseAmountInput(amount)
  const remaining = (draft?.actions ?? []).filter((a) => !done.includes(a))

  function toggle(action: EntryAction) {
    setChosen((current) =>
      current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action],
    )
  }

  function describe(action: EntryAction): string {
    switch (action) {
      case 'movie-night':
      case 'event':
        return `${formatDate(effectiveDate)}${time ? ` · ${time}` : ' · gün boyu'}`
      case 'spend':
        return `${parsedAmount ? formatMoney(parsedAmount) : '—'} · ${formatDate(effectiveDate)}`
      case 'plan-expense':
        return `${parsedAmount ? formatMoney(parsedAmount) : '—'} · tek seferlik, ${formatDate(effectiveDate)}`
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!session) return

    const picked = chosen.filter((a) => !done.includes(a))
    if (!picked.length) return

    if (picked.some((a) => NEEDS_TITLE.includes(a)) && !title.trim()) {
      setError('Bir ad yaz — takvim ve bütçe kaydı adsız olamaz.')
      return
    }
    if (picked.some((a) => NEEDS_AMOUNT.includes(a)) && !parsedAmount) {
      setError('Geçerli bir tutar gir (örn. 350 veya 349,90).')
      return
    }

    const written: EntryAction[] = []
    try {
      for (const action of picked) {
        await write(action)
        written.push(action)
      }
    } catch (saveError) {
      // Part of it may already be saved. Say so, and take the saved ones off
      // the list so a second press cannot write them twice.
      setDone((current) => [...current, ...written])
      setError(
        written.length
          ? `${written.map((a) => ACTION_LABELS[a]).join(', ')} tamam, ama gerisi olmadı. ${saveErrorMessage(saveError)}`
          : saveErrorMessage(saveError),
      )
      return
    }
    onDone()
  }

  async function write(action: EntryAction) {
    if (!session) return
    const userId = session.user.id
    const note = title.trim() || null

    if (action === 'movie-night' || action === 'event') {
      await createEvent.mutateAsync({
        user_id: userId,
        kind: action === 'movie-night' ? 'movie' : 'general',
        title: title.trim(),
        starts_on: effectiveDate,
        // the DB column is a `time`; an empty field means all day
        starts_at: time ? `${time}:00` : null,
        note:
          action === 'movie-night' && parsedAmount
            ? `Bütçe: ${formatMoney(parsedAmount)}`
            : null,
        is_family_visible: resolveFamilyVisibility(calendarShare, false),
      })
      return
    }

    if (action === 'spend') {
      await createTransaction.mutateAsync({
        user_id: userId,
        amount: parsedAmount as number,
        category: category.trim() || null,
        note,
        spent_on: effectiveDate,
        is_family_visible: resolveFamilyVisibility(budgetShare, false),
      })
      return
    }

    await createExpenseItem.mutateAsync({
      user_id: userId,
      name: title.trim(),
      amount: parsedAmount as number,
      period: 'once',
      expense_date: effectiveDate,
      category: category.trim() || null,
      is_family_visible: resolveFamilyVisibility(budgetShare, false),
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label
          htmlFor="quick-entry"
          className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-300"
        >
          <Sparkles size={14} className="text-indigo-500" />
          Bir cümleyle yaz
        </label>
        <textarea
          id="quick-entry"
          rows={2}
          autoFocus
          value={text}
          onChange={(e) => reread(e.target.value)}
          placeholder={PLACEHOLDER}
          className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
        />
      </div>

      {/* what was read, in the user's own words — so a misread is visible
          before it is saved, not after */}
      {draft && draft.matched.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {draft.matched.map((m) => (
            <span
              key={`${m.field}-${m.text}`}
              className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
            >
              {m.text}
            </span>
          ))}
        </div>
      )}

      {text.trim() && !draft && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Bunu çözemedim. Bir tarih, tutar ya da “market”, “sinema” gibi bir
          kelime eklersen anlarım — ya da aşağıdaki formu kullan.
        </p>
      )}

      {draft && (
        <>
          <TextField
            label="Ad"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ne olduğu"
          />

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Tarih"
              type="date"
              value={effectiveDate}
              onChange={(e) => setDate(e.target.value)}
            />
            <TextField
              label="Saat"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <TextField
            label="Tutar (₺)"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="İsteğe bağlı"
          />

          {(chosen.includes('spend') || chosen.includes('plan-expense')) && (
            <CategoryPicker value={category} onChange={setCategory} />
          )}

          <div className="space-y-2">
            {remaining.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => toggle(action)}
                aria-pressed={chosen.includes(action)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors ${
                  chosen.includes(action)
                    ? 'border-indigo-300 bg-indigo-50/60 dark:border-indigo-500/40 dark:bg-indigo-500/10'
                    : 'border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    chosen.includes(action)
                      ? 'border-indigo-600 bg-indigo-600'
                      : 'border-zinc-300 dark:border-zinc-600'
                  }`}
                >
                  {chosen.includes(action) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {ACTION_LABELS[action]}
                  </span>
                  <span className="block text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                    {describe(action)}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {done.length > 0 && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {done.map((a) => ACTION_LABELS[a]).join(', ')} kaydedildi.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <Button
            type="submit"
            isLoading={pending}
            disabled={!chosen.some((a) => !done.includes(a))}
            className="w-full"
          >
            Kaydet
          </Button>
        </>
      )}
    </form>
  )
}
