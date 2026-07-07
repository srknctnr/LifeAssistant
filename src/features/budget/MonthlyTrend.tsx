import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import type { ExpenseItem, Income } from '@/features/budget/api'
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
}

export function MonthlyTrend({ incomes, expenses }: MonthlyTrendProps) {
  const now = new Date()
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [selectedKey, setSelectedKey] = useState(currentKey)
  const currentRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    currentRef.current?.scrollIntoView?.({
      inline: 'center',
      block: 'nearest',
    })
  }, [])

  if (incomes.length === 0 && expenses.length === 0) return null

  const series = monthlyFlowSeries({ incomes, expenses })
  const selected =
    series.find((m) => m.key === selectedKey) ??
    series.find((m) => m.key === currentKey) ??
    series[0]
  const max = Math.max(1, ...series.flatMap((m) => [m.income, m.expense]))
  const remaining = selected.income - selected.expense

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Aylık akış</h2>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            Gelir
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            Gider
          </span>
        </div>
      </div>

      <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
        {series.map((month) => {
          const isSelected = month.key === selected.key
          const isCurrent = month.key === currentKey
          return (
            <button
              key={month.key}
              ref={isCurrent ? currentRef : undefined}
              onClick={() => setSelectedKey(month.key)}
              className={`flex shrink-0 flex-col items-center gap-1.5 rounded-xl px-2 pt-2 pb-1.5 transition-colors ${
                isSelected ? 'bg-zinc-100 dark:bg-zinc-800' : ''
              }`}
            >
              <span
                className="flex items-end gap-1"
                style={{ height: BAR_AREA_HEIGHT }}
              >
                <motion.span
                  className="w-2.5 rounded-full bg-indigo-500"
                  initial={{ height: 4 }}
                  animate={{
                    height: Math.max(4, (month.income / max) * BAR_AREA_HEIGHT),
                  }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
                <motion.span
                  className="w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600"
                  initial={{ height: 4 }}
                  animate={{
                    height: Math.max(
                      4,
                      (month.expense / max) * BAR_AREA_HEIGHT,
                    ),
                  }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
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
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-zinc-400">Gelir</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatMoney(selected.income)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Gider</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatMoney(selected.expense)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Kalan</p>
            <p
              className={`text-sm font-semibold tabular-nums ${
                remaining >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatMoney(remaining)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
