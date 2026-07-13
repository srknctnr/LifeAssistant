import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Sheet } from '@/components/Sheet'
import {
  useExpenseItems,
  useIncomes,
  useTransactions,
} from '@/features/budget/hooks'
import { monthlyEquivalent } from '@/features/budget/money'
import { useContributions, useGoals } from '@/features/wishlist/hooks'
import { formatDate, todayISO } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

interface BudgetDetailSheetProps {
  open: boolean
  onClose: () => void
}

// This month's money movements at a glance: incomes, planned payments,
// actual spending and savings contributions
export function BudgetDetailSheet({ open, onClose }: BudgetDetailSheetProps) {
  const incomes = useIncomes()
  const expenses = useExpenseItems()
  const transactions = useTransactions()
  const goals = useGoals()
  const contributions = useContributions()

  const month = todayISO().slice(0, 7)

  const monthIncomes = (incomes.data ?? []).filter(
    (i) => !i.income_date || i.income_date.startsWith(month),
  )
  const plannedItems = (expenses.data ?? []).filter(
    (e) =>
      e.is_active &&
      (e.period !== 'once' || (e.expense_date?.startsWith(month) ?? false)),
  )
  const monthTransactions = (transactions.data ?? []).filter((t) =>
    t.spent_on.startsWith(month),
  )
  const monthContributions = (contributions.data ?? []).filter((c) =>
    c.contributed_on.startsWith(month),
  )
  const goalNames = new Map(
    (goals.data ?? []).map((g) => [g.id, g.wishlist_items?.name ?? 'Hedef']),
  )

  return (
    <Sheet open={open} onClose={onClose} title="Bu ayın dökümü">
      <div className="space-y-5">
        <DetailGroup title="Gelirler">
          {monthIncomes.length === 0 ? (
            <EmptyLine text="Gelir kaydı yok." />
          ) : (
            monthIncomes.map((income) => (
              <DetailRow
                key={income.id}
                label={income.name}
                sub={
                  income.income_date
                    ? formatDate(income.income_date)
                    : `her ayın ${income.salary_day}. günü`
                }
                amount={`+${formatMoney(income.amount, income.currency)}`}
                tone="positive"
              />
            ))
          )}
        </DetailGroup>

        <DetailGroup title="Planlı ödemeler">
          {plannedItems.length === 0 ? (
            <EmptyLine text="Planlı gider yok." />
          ) : (
            plannedItems.map((item) => (
              <DetailRow
                key={item.id}
                label={item.name}
                sub={item.category ?? undefined}
                amount={
                  item.period === 'once'
                    ? formatMoney(item.amount, item.currency)
                    : `${formatMoney(monthlyEquivalent(item.amount, item.period), item.currency)}/ay`
                }
              />
            ))
          )}
        </DetailGroup>

        <DetailGroup title="Harcamalar">
          {monthTransactions.length === 0 ? (
            <EmptyLine text="Bu ay harcama girilmedi." />
          ) : (
            monthTransactions.map((transaction) => (
              <DetailRow
                key={transaction.id}
                label={transaction.category || transaction.note || 'Harcama'}
                sub={formatDate(transaction.spent_on)}
                amount={formatMoney(transaction.amount, transaction.currency)}
              />
            ))
          )}
        </DetailGroup>

        <DetailGroup title="Tasarruf katkıları">
          {monthContributions.length === 0 ? (
            <EmptyLine text="Bu ay katkı eklenmedi." />
          ) : (
            monthContributions.map((contribution) => (
              <DetailRow
                key={contribution.id}
                label={goalNames.get(contribution.savings_goal_id) ?? 'Hedef'}
                sub={formatDate(contribution.contributed_on)}
                amount={formatMoney(contribution.amount)}
              />
            ))
          )}
        </DetailGroup>

        <Link
          to="/budget"
          onClick={onClose}
          className="block w-full rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-500"
        >
          Bütçe sayfasına git
        </Link>
      </div>
    </Sheet>
  )
}

function DetailGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold tracking-tight">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function DetailRow({
  label,
  sub,
  amount,
  tone,
}: {
  label: string
  sub?: string
  amount: string
  tone?: 'positive'
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3.5 py-2.5 dark:bg-zinc-800">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-zinc-400">{sub}</p>}
      </div>
      <p
        className={`shrink-0 text-sm font-semibold tabular-nums ${
          tone === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : ''
        }`}
      >
        {amount}
      </p>
    </div>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-xs text-zinc-400">{text}</p>
}
