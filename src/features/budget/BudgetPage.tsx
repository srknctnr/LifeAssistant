import { Trash2 } from 'lucide-react'
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
import {
  monthlyEquivalent,
  PERIOD_LABELS,
  PERIOD_SUFFIX,
} from '@/features/budget/money'
import { formatMoney } from '@/lib/money'

type SheetKind = 'income' | 'expense' | null

export function BudgetPage() {
  const incomes = useIncomes()
  const expenses = useExpenseItems()
  const [openSheet, setOpenSheet] = useState<SheetKind>(null)

  const totalIncome = (incomes.data ?? []).reduce(
    (sum, income) => sum + income.amount,
    0,
  )
  const totalExpense = (expenses.data ?? []).reduce(
    (sum, item) => sum + monthlyEquivalent(item.amount, item.period),
    0,
  )
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
            <p className="text-indigo-200">Gelir</p>
            <p className="font-semibold tabular-nums">
              {formatMoney(totalIncome)}
            </p>
          </div>
          <div>
            <p className="text-indigo-200">Gider (aylık)</p>
            <p className="font-semibold tabular-nums">
              {formatMoney(totalExpense)}
            </p>
          </div>
        </div>
      </div>

      {hasError && (
        <p className="mt-4 text-sm text-red-600">
          Veriler yüklenemedi. Bağlantını kontrol edip sayfayı yenile.
        </p>
      )}

      <Section title="Gelirler" onAdd={() => setOpenSheet('income')}>
        {incomes.isPending ? (
          <SkeletonRows />
        ) : (incomes.data ?? []).length === 0 ? (
          <EmptyState text="Henüz gelir eklemedin. Maaşını ekleyerek başla." />
        ) : (
          <ul className="space-y-2.5">
            <AnimatePresence initial={false}>
              {incomes.data?.map((income) => (
                <IncomeRow key={income.id} income={income} />
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
                <ExpenseRow key={item.id} item={item} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Section>

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
    </PageTransition>
  )
}

function IncomeRow({ income }: { income: Income }) {
  const deleteIncome = useDeleteIncome()

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60"
    >
      <div>
        <p className="font-medium">{income.name}</p>
        <p className="mt-0.5 text-xs text-zinc-400">
          her ayın {income.salary_day}. günü
          {income.auto_renew ? ' · otomatik' : ''}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <p className="font-semibold tabular-nums">
          {formatMoney(income.amount, income.currency)}
        </p>
        <button
          aria-label={`${income.name} gelirini sil`}
          onClick={() => deleteIncome.mutate(income.id)}
          className="rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </motion.li>
  )
}

function ExpenseRow({ item }: { item: ExpenseItem }) {
  const deleteExpenseItem = useDeleteExpenseItem()

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60"
    >
      <div>
        <p className="font-medium">{item.name}</p>
        <p className="mt-0.5 text-xs text-zinc-400">
          {PERIOD_LABELS[item.period]}
          {item.category ? ` · ${item.category}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="text-right">
          <p className="font-semibold tabular-nums">
            {formatMoney(item.amount, item.currency)}
            <span className="text-xs font-normal text-zinc-400">
              {PERIOD_SUFFIX[item.period]}
            </span>
          </p>
          {item.period !== 'monthly' && (
            <p className="text-xs text-zinc-400 tabular-nums">
              ≈ {formatMoney(monthlyEquivalent(item.amount, item.period))}
              /ay
            </p>
          )}
        </div>
        <button
          aria-label={`${item.name} giderini sil`}
          onClick={() => deleteExpenseItem.mutate(item.id)}
          className="rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </motion.li>
  )
}
