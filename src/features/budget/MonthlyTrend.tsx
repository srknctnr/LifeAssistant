import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'

import type { ExpenseItem, Income, Transaction } from '@/features/budget/api'
import { monthlyFlowSeries } from '@/features/budget/money'
import { formatMoney } from '@/lib/money'

const shortMonth = new Intl.DateTimeFormat('tr-TR', { month: 'short' })
const fullMonth = new Intl.DateTimeFormat('tr-TR', {
  month: 'long',
  year: 'numeric',
})

const BAR_AREA_HEIGHT = 96

interface MonthlyTrendProps {
  incomes: Income[]
  expenses: ExpenseItem[]
  transactions: Transaction[]
  currentKey: string
  value: string
  onChange: (key: string) => void
}

/**
 * The month strip is the page's month selector, not a second one.
 *
 * It already owned a private selectedKey, which was harmless while the rest of
 * the page could only ever mean "this month". Once the page can be pointed at
 * another month, two selectors would sit on one screen quietly disagreeing —
 * so this one is controlled and the page holds the anchor.
 *
 * The third bar is the point of keeping it here: planned flow next to what was
 * actually spent, month after month.
 */
export function MonthlyTrend({
  incomes,
  expenses,
  transactions,
  currentKey,
  value,
  onChange,
}: MonthlyTrendProps) {
  const selectedRef = useRef<HTMLButtonElement>(null)
  const hasData =
    incomes.length > 0 || expenses.length > 0 || transactions.length > 0

  // Keyed on hasData, not [], because the first render of /budget happens
  // while the queries are still pending: the guard below returns null, no
  // button exists, and a one-shot effect would scroll nothing and never run
  // again — leaving the strip parked at the far left. That was survivable at
  // four months back; at twelve, with this strip now the page's only month
  // picker, the selected month sits off-screen and the picker looks broken.
  useEffect(() => {
    if (!hasData) return
    selectedRef.current?.scrollIntoView?.({
      inline: 'center',
      block: 'nearest',
    })
  }, [hasData, value])

  if (!hasData) return null

  const series = monthlyFlowSeries({ incomes, expenses, transactions })
  const selected =
    series.find((m) => m.key === value) ??
    series.find((m) => m.key === currentKey) ??
    series[0]
  const max = Math.max(
    1,
    ...series.flatMap((m) => [m.income, m.expense, m.spent]),
  )
  const remaining = selected.income - selected.expense - selected.spent

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none">
      <div className="flex items-center justify-between gap-2">
        <h2 className="shrink-0 text-sm font-semibold tracking-tight">
          Aylık akış
        </h2>
        <div className="flex items-center gap-2.5 text-[11px] text-zinc-400">
          <Legend className="bg-indigo-500" label="Gelir" />
          <Legend
            className="bg-zinc-300 dark:bg-zinc-600"
            label="Planlı gider"
          />
          <Legend className="bg-violet-500" label="Harcanan" />
        </div>
      </div>

      <div
        role="group"
        aria-label="Ay seç"
        className="mt-4 flex gap-1 overflow-x-auto pb-1"
      >
        {series.map((month) => {
          const isSelected = month.key === selected.key
          const isCurrent = month.key === currentKey
          return (
            <button
              key={month.key}
              ref={isSelected ? selectedRef : undefined}
              onClick={() => onChange(month.key)}
              aria-pressed={isSelected}
              aria-label={fullMonth.format(month.date)}
              className={`flex shrink-0 flex-col items-center gap-1.5 rounded-xl px-1.5 pt-2 pb-1.5 transition-colors ${
                isSelected ? 'bg-zinc-100 dark:bg-zinc-800' : ''
              }`}
            >
              <span
                className="flex items-end gap-0.5"
                style={{ height: BAR_AREA_HEIGHT }}
              >
                <Bar className="bg-indigo-500" value={month.income} max={max} />
                <Bar
                  className="bg-zinc-300 dark:bg-zinc-600"
                  value={month.expense}
                  max={max}
                />
                <Bar className="bg-violet-500" value={month.spent} max={max} />
              </span>
              <span
                className={`text-[11px] font-medium ${
                  isCurrent
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-400'
                }`}
              >
                {shortMonth.format(month.date)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {fullMonth.format(selected.date)}
          {selected.key === currentKey ? ' · bu ay' : ''}
        </p>
        <div className="mt-2 grid grid-cols-4 gap-2 text-center">
          <Figure label="Gelir" value={selected.income} />
          <Figure label="Planlı" value={selected.expense} />
          <Figure label="Harcanan" value={selected.spent} />
          <Figure
            label="Kalan"
            value={remaining}
            className={
              remaining >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }
          />
        </div>
      </div>
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  )
}

function Bar({
  className,
  value,
  max,
}: {
  className: string
  value: number
  max: number
}) {
  return (
    <motion.span
      className={`w-2 rounded-full ${className}`}
      initial={{ height: 4 }}
      animate={{ height: Math.max(4, (value / max) * BAR_AREA_HEIGHT) }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
    />
  )
}

function Figure({
  label,
  value,
  className = '',
}: {
  label: string
  value: number
  className?: string
}) {
  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${className}`}>
        {formatMoney(value)}
      </p>
    </div>
  )
}
