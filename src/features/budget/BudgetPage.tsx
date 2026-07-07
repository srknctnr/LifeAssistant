import { Sparkles, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { AnimatedNumber } from '@/components/AnimatedNumber'
import { EmptyState } from '@/components/EmptyState'
import { PageTransition } from '@/components/PageTransition'
import { Section } from '@/components/Section'
import { Sheet } from '@/components/Sheet'
import { SkeletonRows } from '@/components/SkeletonRows'
import type { ExpenseItem, Income } from '@/features/budget/api'
import { ExpenseForm } from '@/features/budget/ExpenseForm'
import {
  useDeleteExpenseItem,
  useDeleteIncome,
  useExpenseItems,
  useIncomes,
} from '@/features/budget/hooks'
import { IncomeForm } from '@/features/budget/IncomeForm'
import { MonthlyTrend } from '@/features/budget/MonthlyTrend'
import {
  expenseTotalsByCategory,
  monthlyEquivalent,
  monthlyExpenseTotal,
  monthlyIncomeTotal,
  PERIOD_LABELS,
  PERIOD_SUFFIX,
} from '@/features/budget/money'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

type SheetKind = 'income' | 'expense' | null

export function BudgetPage() {
  const incomes = useIncomes()
  const expenses = useExpenseItems()
  const [openSheet, setOpenSheet] = useState<SheetKind>(null)
  const [editIncome, setEditIncome] = useState<Income | null>(null)
  const [editExpense, setEditExpense] = useState<ExpenseItem | null>(null)

  const totalIncome = monthlyIncomeTotal(incomes.data ?? [])
  const totalExpense = monthlyExpenseTotal(expenses.data ?? [])
  const byCategory = expenseTotalsByCategory(expenses.data ?? [])
  const remaining = totalIncome - totalExpense
  const isLoading = incomes.isPending || expenses.isPending
  const hasError = incomes.isError || expenses.isError

  return (
    <PageTransition>
      <h1 className="text-2xl font-semibold tracking-tight">Bütçe</h1>

      <div className="mt-4 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-600/20">
        <p className="text-sm text-indigo-100">Aylık kalan</p>
        {isLoading ? (
          <div className="mt-2 h-10 w-40 animate-pulse rounded-lg bg-white/20" />
        ) : (
          <AnimatedNumber
            className="mt-1 block text-4xl font-bold tracking-tight tabular-nums"
            value={remaining}
            format={(v) => formatMoney(v)}
          />
        )}
        <div className="mt-5 flex gap-8 text-sm">
          <div>
            <p className="text-indigo-200">Gelir (bu ay)</p>
            <p className="font-semibold tabular-nums">
              {formatMoney(totalIncome)}
            </p>
          </div>
          <div>
            <p className="text-indigo-200">Gider (bu ay)</p>
            <p className="font-semibold tabular-nums">
              {formatMoney(totalExpense)}
            </p>
          </div>
        </div>
      </div>

      {hasError && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          Veriler yüklenemedi. Bağlantını kontrol edip sayfayı yenile.
        </p>
      )}

      <MonthlyTrend
        incomes={incomes.data ?? []}
        expenses={expenses.data ?? []}
      />

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6">
        <Section title="Gelirler" onAdd={() => setOpenSheet('income')}>
          {incomes.isPending ? (
            <SkeletonRows />
          ) : (incomes.data ?? []).length === 0 ? (
            <EmptyState text="Henüz gelir eklemedin. Maaşını ekleyerek başla." />
          ) : (
            <ul className="space-y-2.5">
              <AnimatePresence initial={false}>
                {incomes.data?.map((income) => (
                  <IncomeRow
                    key={income.id}
                    income={income}
                    onEdit={() => setEditIncome(income)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Section>

        <Section title="Giderler" onAdd={() => setOpenSheet('expense')}>
          {expenses.isPending ? (
            <SkeletonRows />
          ) : (expenses.data ?? []).length === 0 ? (
            <EmptyState text="Henüz gider eklemedin. Kira, faturalar, abonelikler…" />
          ) : (
            <ul className="space-y-2.5">
              <AnimatePresence initial={false}>
                {expenses.data?.map((item) => (
                  <ExpenseRow
                    key={item.id}
                    item={item}
                    onEdit={() => setEditExpense(item)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Section>
      </div>

      {byCategory.length > 0 && (
        <Section title="Kategori dökümü">
          <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none">
            {byCategory.map(({ category, total }) => (
              <div key={category}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{category}</span>
                  <span className="text-zinc-400 tabular-nums">
                    {formatMoney(total)}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(total / byCategory[0].total) * 100}%`,
                    }}
                    transition={{ type: 'spring', stiffness: 90, damping: 22 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Sheet
        open={openSheet === 'income'}
        onClose={() => setOpenSheet(null)}
        title="Gelir ekle"
      >
        <IncomeForm onDone={() => setOpenSheet(null)} />
      </Sheet>
      <Sheet
        open={openSheet === 'expense'}
        onClose={() => setOpenSheet(null)}
        title="Gider ekle"
      >
        <ExpenseForm onDone={() => setOpenSheet(null)} />
      </Sheet>
      <Sheet
        open={editIncome !== null}
        onClose={() => setEditIncome(null)}
        title="Geliri düzenle"
      >
        {editIncome && (
          <IncomeForm income={editIncome} onDone={() => setEditIncome(null)} />
        )}
      </Sheet>
      <Sheet
        open={editExpense !== null}
        onClose={() => setEditExpense(null)}
        title="Gideri düzenle"
      >
        {editExpense && (
          <ExpenseForm item={editExpense} onDone={() => setEditExpense(null)} />
        )}
      </Sheet>
    </PageTransition>
  )
}

function IncomeRow({ income, onEdit }: { income: Income; onEdit: () => void }) {
  const deleteIncome = useDeleteIncome()

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="flex items-center justify-between gap-2 rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
    >
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className="truncate font-medium">{income.name}</p>
        <p className="mt-0.5 text-xs text-zinc-400">
          {income.income_date
            ? `Tek seferlik · ${formatDate(income.income_date)}`
            : `her ayın ${income.salary_day}. günü${
                income.auto_renew ? ' · otomatik' : ''
              }`}
        </p>
      </button>
      <div className="flex items-center gap-1.5">
        <p className="font-semibold tabular-nums">
          {formatMoney(income.amount, income.currency)}
        </p>
        <button
          aria-label={`${income.name} gelirini sil`}
          onClick={() => deleteIncome.mutate(income.id)}
          className="rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </motion.li>
  )
}

function ExpenseRow({
  item,
  onEdit,
}: {
  item: ExpenseItem
  onEdit: () => void
}) {
  const deleteExpenseItem = useDeleteExpenseItem()
  const isGoalLinked = item.source === 'savings_goal'

  const meta = (
    <p className="mt-0.5 text-xs text-zinc-400">
      {item.period === 'once' && item.expense_date
        ? `${PERIOD_LABELS.once} · ${formatDate(item.expense_date)}`
        : PERIOD_LABELS[item.period]}
      {item.category ? ` · ${item.category}` : ''}
      {!item.is_active ? ' · duraklatıldı' : ''}
    </p>
  )

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className={`flex items-center justify-between gap-2 rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none ${
        item.is_active ? '' : 'opacity-60'
      }`}
    >
      {isGoalLinked ? (
        // managed by the savings goal on the wishlist page; not editable here
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate font-medium">
            {item.name}
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Sparkles size={10} />
              Hedef
            </span>
          </p>
          {meta}
        </div>
      ) : (
        <button onClick={onEdit} className="min-w-0 flex-1 text-left">
          <p className="truncate font-medium">{item.name}</p>
          {meta}
        </button>
      )}
      <div className="flex items-center gap-1.5">
        <div className="text-right">
          <p className="font-semibold tabular-nums">
            {formatMoney(item.amount, item.currency)}
            <span className="text-xs font-normal text-zinc-400">
              {PERIOD_SUFFIX[item.period]}
            </span>
          </p>
          {item.period !== 'monthly' && item.period !== 'once' && (
            <p className="text-xs text-zinc-400 tabular-nums">
              ≈ {formatMoney(monthlyEquivalent(item.amount, item.period))}
              /ay
            </p>
          )}
        </div>
        {!isGoalLinked && (
          <button
            aria-label={`${item.name} giderini sil`}
            onClick={() => deleteExpenseItem.mutate(item.id)}
            className="rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </motion.li>
  )
}
