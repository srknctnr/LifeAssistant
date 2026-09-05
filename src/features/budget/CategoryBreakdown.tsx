import { motion } from 'motion/react'
import { useState } from 'react'

import { Section } from '@/components/Section'
import { Segmented } from '@/components/Segmented'
import type { ExpenseItem, Transaction } from '@/features/budget/api'
import {
  expenseTotalsByCategory,
  transactionTotalsByCategory,
} from '@/features/budget/money'
import { formatMoney } from '@/lib/money'

type Mode = 'actual' | 'planned'

interface CategoryBreakdownProps {
  transactions: Transaction[]
  expenses: ExpenseItem[]
  month?: Date
}

/**
 * Where the money went, and where it was meant to go.
 *
 * This section used to report only the PLANNED budget's categories, which is
 * the answer to "what did I commit to" wearing the label of "where does my
 * money go". Meanwhile the spend form asks for a category on every single
 * entry and nothing ever read it back — a tax with no refund. Actual spending
 * leads now; the plan is still one tap away, because the two answer different
 * questions and neither replaces the other.
 */
export function CategoryBreakdown({
  transactions,
  expenses,
  month,
}: CategoryBreakdownProps) {
  const [mode, setMode] = useState<Mode>('actual')

  const actual = transactionTotalsByCategory(transactions, month)
  const planned = expenseTotalsByCategory(expenses, month)
  if (actual.length === 0 && planned.length === 0) return null

  // an empty side would otherwise look like a broken toggle
  const rows = mode === 'actual' ? actual : planned
  const total = rows.reduce((sum, r) => sum + r.total, 0)

  return (
    <Section title="Kategori dökümü">
      <div className="mb-2.5">
        <Segmented<Mode>
          options={[
            { value: 'actual', label: 'Harcanan' },
            { value: 'planned', label: 'Planlı' },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">
          {mode === 'actual'
            ? 'Bu ay henüz harcama girmedin.'
            : 'Kategorili planlı gider yok.'}
        </p>
      ) : (
        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none">
          {rows.map(({ category, total: amount }) => (
            <div key={category}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium">{category}</span>
                <span className="shrink-0 text-zinc-400 tabular-nums">
                  {formatMoney(amount)}
                  {total > 0 && (
                    <span className="ml-1.5 text-xs">
                      %{Math.round((amount / total) * 100)}
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${
                    mode === 'actual'
                      ? 'from-indigo-500 to-violet-500'
                      : 'from-zinc-400 to-zinc-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(amount / rows[0].total) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 90, damping: 22 }}
                />
              </div>
            </div>
          ))}
          <p className="pt-1 text-xs text-zinc-400 tabular-nums">
            {mode === 'actual' ? 'Bu ay harcanan' : 'Planlı gider'}{' '}
            {formatMoney(total)}
          </p>
        </div>
      )}
    </Section>
  )
}
