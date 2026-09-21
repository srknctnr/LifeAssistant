import { X } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'

import {
  useExpenseItems,
  useIncomes,
  useTransactions,
} from '@/features/budget/hooks'
import {
  buildMonthReport,
  monthReportIsNews,
} from '@/features/dashboard/month-report'
import { useMovies } from '@/features/movies/hooks'
import { useTrips } from '@/features/travel/hooks'
import { useContributions } from '@/features/wishlist/hooks'
import { formatMoney } from '@/lib/money'

const monthName = new Intl.DateTimeFormat('tr-TR', { month: 'long' })
const SEEN_KEY = 'la-month-report-seen'

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

/**
 * How last month went, on the screen you land on, while it is still news.
 *
 * The budget page learned to remember months; this is that memory speaking
 * without being asked. It is deterministic arithmetic over data already in
 * cache — no new query, no migration — and it is built from the same helpers
 * the budget page uses, so the two cannot describe one month differently.
 */
export function MonthReportCard() {
  const incomes = useIncomes()
  const expenses = useExpenseItems()
  const transactions = useTransactions()
  const contributions = useContributions()
  const movies = useMovies()
  const trips = useTrips()
  const [seen, setSeen] = useState(readSeen)

  // A recap assembled from `?? []` while a request is failing would be a
  // confident summary of data we do not have. These four are the money, so a
  // failure among them means no card at all; films and trips only cost their
  // own line, and are dropped below instead of taking the recap with them.
  const ready =
    incomes.isSuccess &&
    expenses.isSuccess &&
    transactions.isSuccess &&
    contributions.isSuccess
  if (!ready) return null

  const report = buildMonthReport({
    incomes: incomes.data,
    expenses: expenses.data,
    transactions: transactions.data,
    contributions: contributions.data,
    movies: movies.data ?? [],
    trips: trips.data ?? [],
  })
  if (!monthReportIsNews(report, seen)) return null

  // bound to a plain string, because a hoisted function declaration does not
  // keep the narrowing the guard above gave to `report`
  const key = report.key
  function dismiss() {
    setSeen(key)
    try {
      localStorage.setItem(SEEN_KEY, key)
    } catch {
      // a private window just gets the card again next time
    }
  }

  const withinBudget = report.left >= 0
  const delta =
    report.spentBefore !== null ? report.spent - report.spentBefore : null
  const extras = [
    report.saved > 0 ? `${formatMoney(report.saved)} biriktirdin` : null,
    movies.isSuccess && report.moviesWatched > 0
      ? `${report.moviesWatched} film`
      : null,
    // silence beats "no trips" to someone who took one
    ...(trips.isSuccess
      ? report.trips.map((t) => `${t.emoji} ${t.title}`)
      : []),
  ].filter((x): x is string => x !== null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-3xl bg-white p-5 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold tracking-tight">
          {monthName.format(report.anchor)} nasıl geçti?
        </p>
        <button
          onClick={dismiss}
          aria-label="Ay raporunu kapat"
          className="-mt-1 -mr-1 shrink-0 rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-500 dark:text-zinc-600 dark:hover:bg-zinc-800"
        >
          <X size={15} />
        </button>
      </div>

      <p
        className={`mt-2 text-2xl font-bold tracking-tight tabular-nums ${
          withinBudget
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400'
        }`}
      >
        {withinBudget
          ? `${formatMoney(report.left)} artırdın`
          : `${formatMoney(-report.left)} aştın`}
      </p>
      <p className="mt-0.5 text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
        {formatMoney(report.spent)} harcadın, planın{' '}
        {formatMoney(report.spendable)}
        {delta !== null && delta !== 0 && (
          <>
            {' · '}
            <span
              className={
                delta < 0 ? 'text-emerald-600 dark:text-emerald-400' : ''
              }
            >
              önceki aya göre {formatMoney(Math.abs(delta))}{' '}
              {delta < 0 ? 'az' : 'çok'}
            </span>
          </>
        )}
      </p>

      {report.topCategories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {report.topCategories.map((c) => (
            <span
              key={c.category}
              className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {c.category} · {formatMoney(c.total)}{' '}
              <span className="text-zinc-400">
                %{Math.round(c.share * 100)}
              </span>
            </span>
          ))}
        </div>
      )}

      {extras.length > 0 && (
        <p className="mt-2.5 text-xs text-zinc-400">{extras.join(' · ')}</p>
      )}
    </motion.div>
  )
}
