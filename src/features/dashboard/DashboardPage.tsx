import { ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

import { AnimatedNumber } from '@/components/AnimatedNumber'
import { PageTransition } from '@/components/PageTransition'
import { useAuth } from '@/features/auth/useAuth'
import { useExpenseItems, useIncomes } from '@/features/budget/hooks'
import { monthlyExpenseTotal } from '@/features/budget/money'
import { useContributionReminderSync } from '@/features/reminders/hooks'
import { RemindersSection } from '@/features/reminders/RemindersSection'
import { useContributions, useGoals } from '@/features/wishlist/hooks'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

export function DashboardPage() {
  const { session } = useAuth()
  const incomes = useIncomes()
  const expenses = useExpenseItems()
  const goals = useGoals()
  const contributions = useContributions()
  useContributionReminderSync()

  const firstName = session?.user.email?.split('@')[0] ?? ''

  const totalIncome = (incomes.data ?? []).reduce((s, i) => s + i.amount, 0)
  const totalExpense = monthlyExpenseTotal(expenses.data ?? [])
  const remaining = totalIncome - totalExpense
  const hasBudget =
    (incomes.data ?? []).length > 0 || (expenses.data ?? []).length > 0
  const budgetLoading = incomes.isPending || expenses.isPending

  const activeGoals = (goals.data ?? []).filter((g) => g.status === 'active')
  const savedByGoal = new Map<string, number>()
  for (const c of contributions.data ?? []) {
    savedByGoal.set(
      c.savings_goal_id,
      (savedByGoal.get(c.savings_goal_id) ?? 0) + c.amount,
    )
  }

  return (
    <PageTransition>
      <h1 className="text-2xl font-semibold tracking-tight">Özet</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Merhaba{firstName ? ` ${firstName}` : ''} 👋 · {formatDate(new Date())}
      </p>

      {budgetLoading ? (
        <div className="mt-5 h-32 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-800" />
      ) : hasBudget ? (
        <div className="mt-5 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-600/20">
          <p className="text-sm text-indigo-100">Bu ay kalan</p>
          <AnimatedNumber
            className="mt-1 block text-3xl font-bold tracking-tight tabular-nums"
            value={remaining}
            format={(v) => formatMoney(v)}
          />
          <Link
            to="/budget"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-100 transition-colors hover:text-white"
          >
            Bütçeye git <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <CtaCard
          to="/budget"
          title="Bütçeni kur"
          text="Maaşını ve düzenli giderlerini ekle; ay sonunda ne kalacağını görelim."
        />
      )}

      <RemindersSection />

      <h2 className="mt-8 mb-3 text-base font-semibold tracking-tight">
        Hedeflerim
      </h2>
      {goals.isPending ? (
        <div className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      ) : activeGoals.length === 0 ? (
        <CtaCard
          to="/wishlist"
          title="İlk hedefini oluştur"
          text="Bir istek ekle; hedef tarihe göre aylık biriktirme tutarını hesaplayıp bütçene ekleyelim."
        />
      ) : (
        <ul className="space-y-2.5">
          {activeGoals.slice(0, 3).map((goal) => {
            const saved = savedByGoal.get(goal.id) ?? 0
            const progress = Math.min(1, saved / goal.target_amount)
            return (
              <li
                key={goal.id}
                className="rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate font-medium">
                    {goal.wishlist_items?.name ?? 'Hedef'}
                  </p>
                  <p className="text-xs font-medium text-zinc-400 tabular-nums">
                    %{Math.round(progress * 100)}
                  </p>
                </div>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ type: 'spring', stiffness: 90, damping: 22 }}
                  />
                </div>
              </li>
            )
          })}
          <li>
            <Link
              to="/wishlist"
              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Tümünü gör <ArrowRight size={15} />
            </Link>
          </li>
        </ul>
      )}
    </PageTransition>
  )
}

function CtaCard({
  to,
  title,
  text,
}: {
  to: string
  title: string
  text: string
}) {
  return (
    <Link
      to={to}
      className="mt-5 block rounded-3xl border border-dashed border-zinc-200 bg-white/60 p-5 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-indigo-700 dark:hover:bg-indigo-500/10"
    >
      <p className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400">
        {title} <ArrowRight size={16} />
      </p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{text}</p>
    </Link>
  )
}
