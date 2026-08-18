import { ArrowRight, HandCoins, Receipt, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { AnimatedNumber } from '@/components/AnimatedNumber'
import { EmptyState } from '@/components/EmptyState'
import { Section } from '@/components/Section'
import { Sheet } from '@/components/Sheet'
import { SkeletonRows } from '@/components/SkeletonRows'
import { useAuth } from '@/features/auth/useAuth'
import type { ExpenseWithShares } from '@/features/expenses/api'
import {
  useDeleteSettlement,
  useGroupExpenses,
  useSettlements,
} from '@/features/expenses/hooks'
import {
  buildLedgerView,
  ledgerMembers,
  type LedgerMember,
  type LedgerTransfer,
} from '@/features/expenses/ledger'
import { SettlementForm } from '@/features/expenses/SettlementForm'
import { SharedExpenseForm } from '@/features/expenses/SharedExpenseForm'
import { formatDate } from '@/lib/dates'
import { describeError, saveErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/money'

interface GroupLedgerProps {
  familyId: string
  members: LedgerMember[]
}

// Tricount-style shared ledger for one group: who paid what, who owes whom,
// and the settlements that close it.
export function GroupLedger({ familyId, members }: GroupLedgerProps) {
  const { session } = useAuth()
  const expenses = useGroupExpenses(familyId)
  const settlements = useSettlements(familyId)
  const deleteSettlement = useDeleteSettlement(familyId)

  const [addOpen, setAddOpen] = useState(false)
  const [editExpense, setEditExpense] = useState<ExpenseWithShares | null>(null)
  const [settleWith, setSettleWith] = useState<LedgerTransfer | null>(null)
  const [settleOpen, setSettleOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const isPending = expenses.isPending || settlements.isPending
  // current members plus anyone who only lives in the ledger's history
  const participants = ledgerMembers(
    members,
    expenses.data ?? [],
    settlements.data ?? [],
  )
  const view = buildLedgerView({
    members,
    expenses: expenses.data ?? [],
    settlements: settlements.data ?? [],
    userId: session?.user.id,
  })

  const nameOf = (userId: string) => {
    const member = participants.find((m) => m.userId === userId)
    if (!member) return 'Eski üye'
    return member.isSelf ? 'Sen' : member.name
  }

  if (isPending) {
    return (
      <div className="mt-6 space-y-3">
        <div className="h-32 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-800" />
        <SkeletonRows />
      </div>
    )
  }

  // An empty ledger and an unreachable one look identical otherwise, and the
  // tables only exist once the migration has been run
  if (expenses.isError || settlements.isError) {
    const detail = describeError(expenses.error ?? settlements.error)
    return (
      <div className="mt-6 rounded-3xl border border-dashed border-red-200 p-6 text-center dark:border-red-500/30">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          Ortak kasa yüklenemedi
        </p>
        <p className="mx-auto mt-1.5 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
          {detail ?? 'Bağlantını kontrol edip tekrar dene.'}
        </p>
      </div>
    )
  }

  return (
    <>
      <div
        className={`mt-6 rounded-3xl p-5 text-white shadow-lg ${
          view.myNet >= 0
            ? 'bg-gradient-to-br from-emerald-600 to-teal-600 shadow-emerald-600/20'
            : 'bg-gradient-to-br from-rose-600 to-orange-600 shadow-rose-600/20'
        }`}
      >
        <div className="flex items-center justify-between text-sm text-white/80">
          <span className="flex items-center gap-2">
            <HandCoins size={16} /> Ortak Kasa
          </span>
          <span className="text-xs">toplam {formatMoney(view.total)}</span>
        </div>
        <p className="mt-3 text-sm text-white/80">
          {view.isSettled
            ? 'Herkes ödeşmiş'
            : view.myNet >= 0
              ? 'Senin alacağın'
              : 'Senin borcun'}
        </p>
        <AnimatedNumber
          className="mt-0.5 block text-4xl font-bold tracking-tight tabular-nums"
          value={Math.abs(view.myNet)}
          format={(v) => formatMoney(v)}
        />
        {view.balances.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {view.balances.map((balance) => (
              <span
                key={balance.userId}
                className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium tabular-nums"
              >
                {balance.isSelf ? 'Sen' : balance.name}{' '}
                {balance.net === 0
                  ? '✓'
                  : `${balance.net > 0 ? '+' : '−'}${formatMoney(Math.abs(balance.net))}`}
              </span>
            ))}
          </div>
        )}
      </div>

      <Section title="Kim kime ödesin">
        {view.transfers.length === 0 ? (
          <p className="text-sm text-zinc-400">
            {view.total === 0
              ? 'Henüz ortak harcama yok.'
              : 'Herkes ödeşti, borç kalmadı. 🎉'}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {view.transfers.map((transfer) => (
              <li key={`${transfer.fromUser}-${transfer.toUser}`}>
                <button
                  onClick={() => {
                    setSettleWith(transfer)
                    setSettleOpen(true)
                  }}
                  className="flex w-full items-center gap-3 rounded-xl bg-white px-3.5 py-3 text-left shadow-sm shadow-zinc-200/60 transition-colors hover:bg-indigo-50 dark:bg-zinc-900 dark:shadow-none dark:hover:bg-indigo-500/10"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {nameOf(transfer.fromUser)}
                    <ArrowRight
                      size={13}
                      className="mx-1.5 inline text-zinc-400"
                    />
                    {nameOf(transfer.toUser)}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatMoney(transfer.amount)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Ortak harcamalar" onAdd={() => setAddOpen(true)}>
        {(expenses.data ?? []).length === 0 ? (
          <EmptyState text="Henüz ortak harcama yok. + ile ilkini ekle; kim ödedi, kimler paylaştı seç." />
        ) : (
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {(expenses.data ?? []).map((expense) => (
                <motion.li
                  key={expense.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                >
                  <button
                    onClick={() => setEditExpense(expense)}
                    aria-label={`${expense.title}, düzenle`}
                    className="flex w-full items-center gap-3 rounded-xl bg-white px-3.5 py-2.5 text-left shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
                  >
                    <span className="shrink-0 rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <Receipt size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {expense.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-zinc-400">
                        {nameOf(expense.paid_by)} ödedi ·{' '}
                        {expense.expense_shares.length} kişi ·{' '}
                        {formatDate(expense.spent_on)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatMoney(expense.amount, expense.currency)}
                    </span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Section>

      <Section
        title="Ödeşmeler"
        onAdd={() => {
          setSettleWith(null)
          setSettleOpen(true)
        }}
      >
        {deleteError && (
          <p className="mb-2 text-sm text-red-600 dark:text-red-400">
            {deleteError}
          </p>
        )}
        {(settlements.data ?? []).length === 0 ? (
          <p className="text-sm text-zinc-400">
            Kayıtlı ödeşme yok. Borcunu ödeyince buraya yaz, bakiye kapansın.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {(settlements.data ?? []).map((settlement) => (
              <li
                key={settlement.id}
                className="flex items-center gap-3 rounded-xl bg-white px-3.5 py-2.5 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
              >
                <span className="shrink-0 rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <HandCoins size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {nameOf(settlement.from_user)}
                    <ArrowRight
                      size={13}
                      className="mx-1.5 inline text-zinc-400"
                    />
                    {nameOf(settlement.to_user)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {formatDate(settlement.settled_on)}
                    {settlement.note ? ` · ${settlement.note}` : ''}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatMoney(settlement.amount, settlement.currency)}
                </p>
                <button
                  aria-label="Ödeşmeyi sil"
                  onClick={async () => {
                    setDeleteError(null)
                    try {
                      await deleteSettlement.mutateAsync(settlement.id)
                    } catch (error) {
                      setDeleteError(saveErrorMessage(error))
                    }
                  }}
                  className="rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Ortak harcama ekle"
      >
        <SharedExpenseForm
          familyId={familyId}
          members={participants}
          onDone={() => setAddOpen(false)}
        />
      </Sheet>

      <Sheet
        open={editExpense !== null}
        onClose={() => setEditExpense(null)}
        title="Harcamayı düzenle"
      >
        {editExpense && (
          <SharedExpenseForm
            familyId={familyId}
            members={participants}
            expense={editExpense}
            onDone={() => setEditExpense(null)}
          />
        )}
      </Sheet>

      <Sheet
        open={settleOpen}
        onClose={() => setSettleOpen(false)}
        title="Ödeşme kaydet"
      >
        <SettlementForm
          familyId={familyId}
          members={participants}
          suggestion={settleWith ?? undefined}
          onDone={() => setSettleOpen(false)}
        />
      </Sheet>
    </>
  )
}
