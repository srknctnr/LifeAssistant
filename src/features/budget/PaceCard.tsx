import { motion } from 'motion/react'

import { AnimatedNumber } from '@/components/AnimatedNumber'
import type { Transaction } from '@/features/budget/api'
import { paceReport } from '@/features/budget/money'
import { formatMoney } from '@/lib/money'

interface PaceCardProps {
  monthlyIncome: number
  plannedExpense: number
  transactions: Transaction[]
}

// The proactive limit assistant: safe daily allowance + a burn-rate check
export function PaceCard({
  monthlyIncome,
  plannedExpense,
  transactions,
}: PaceCardProps) {
  const report = paceReport({ monthlyIncome, plannedExpense, transactions })
  if (report.spendable <= 0) return null

  const progress = Math.min(1, Math.max(0, report.spent / report.spendable))
  const overshoot = report.projectedTotal - report.spendable

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Limit Asistanı</h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            report.onTrack
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
          }`}
        >
          {report.onTrack ? 'Yolunda' : 'Hız yüksek'}
        </span>
      </div>

      <p className="mt-3 text-xs text-zinc-400">Günlük güvenli harcama</p>
      <AnimatedNumber
        className="mt-0.5 block text-3xl font-bold tracking-tight tabular-nums"
        value={report.dailyAllowance}
        format={(v) => formatMoney(v)}
      />

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <motion.div
          className={`h-full rounded-full ${
            report.onTrack
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
              : 'bg-gradient-to-r from-red-500 to-rose-500'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 22 }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-zinc-400 tabular-nums">
        <span>Harcanan {formatMoney(report.spent)}</span>
        <span>Bütçe {formatMoney(report.spendable)}</span>
      </div>

      <p
        className={`mt-3 text-sm ${
          report.onTrack
            ? 'text-zinc-500 dark:text-zinc-400'
            : 'font-medium text-red-600 dark:text-red-400'
        }`}
      >
        {report.onTrack
          ? `Bu hızla ay sonunu rahat getirirsin — ${report.daysLeft} gün için ${formatMoney(Math.max(0, report.remaining))} kaldı. 🎯`
          : `Bu hızla ay sonunda bütçeni yaklaşık ${formatMoney(overshoot)} aşarsın. Günlük ${formatMoney(report.dailyAllowance)} altında kalmayı dene.`}
      </p>
    </div>
  )
}
