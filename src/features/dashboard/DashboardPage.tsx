import {
  ArrowRight,
  CalendarDays,
  Clapperboard,
  Plane,
  Sparkles,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

import { AnimatedNumber } from '@/components/AnimatedNumber'
import { PageTransition } from '@/components/PageTransition'
import { useAuth } from '@/features/auth/useAuth'
import {
  useExpenseItems,
  useIncomes,
  useTransactions,
} from '@/features/budget/hooks'
import {
  monthlyExpenseTotal,
  monthlyIncomeTotal,
  paceReport,
} from '@/features/budget/money'
import {
  useCategoryEntries,
  useLifeCategories,
} from '@/features/calendar/hooks'
import { weekDays } from '@/features/calendar/week-math'
import { useMovies } from '@/features/movies/hooks'
import { useReminderSync } from '@/features/reminders/hooks'
import { RemindersSection } from '@/features/reminders/RemindersSection'
import { useContributions, useGoals } from '@/features/wishlist/hooks'
import { formatDate, toISODate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

export function DashboardPage() {
  const { session } = useAuth()
  useReminderSync()

  const firstName = session?.user.email?.split('@')[0] ?? ''

  return (
    <PageTransition>
      <h1 className="text-2xl font-semibold tracking-tight">Özet</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Merhaba{firstName ? ` ${firstName}` : ''} 👋 · {formatDate(new Date())}
      </p>

      <RemindersSection />

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <BudgetModule />
        <GoalsModule />
        <MoviesModule />
        <CalendarModule />
        <ComingSoonModule
          icon={Plane}
          title="Seyahat"
          text="Gezi planları ve ortak masraf paylaşımı"
        />
      </div>
    </PageTransition>
  )
}

function BudgetModule() {
  const incomes = useIncomes()
  const expenses = useExpenseItems()
  const transactions = useTransactions()

  const isLoading =
    incomes.isPending || expenses.isPending || transactions.isPending
  const hasBudget =
    (incomes.data ?? []).length > 0 || (expenses.data ?? []).length > 0

  if (isLoading) {
    return (
      <div className="h-40 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-800" />
    )
  }

  if (!hasBudget) {
    return (
      <CtaModule
        to="/budget"
        icon={Wallet}
        title="Bütçeni kur"
        text="Maaşını ve düzenli giderlerini ekle; ay sonunda ne kalacağını görelim."
      />
    )
  }

  const totalIncome = monthlyIncomeTotal(incomes.data ?? [])
  const totalExpense = monthlyExpenseTotal(expenses.data ?? [])
  const report = paceReport({
    monthlyIncome: totalIncome,
    plannedExpense: totalExpense,
    transactions: transactions.data ?? [],
  })

  return (
    <Link
      to="/budget"
      className="group block rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-600/20 transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between text-sm text-indigo-100">
        <span className="flex items-center gap-2">
          <Wallet size={16} /> Bütçe
        </span>
        <ArrowRight
          size={16}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </div>
      <p className="mt-3 text-sm text-indigo-100">Bu ay kalan</p>
      <AnimatedNumber
        className="mt-0.5 block text-3xl font-bold tracking-tight tabular-nums"
        value={report.remaining}
        format={(v) => formatMoney(v)}
      />
      <div className="mt-4 flex gap-6 text-sm">
        <div>
          <p className="text-indigo-200">Günlük güvenli</p>
          <p className="font-semibold tabular-nums">
            {formatMoney(report.dailyAllowance)}
          </p>
        </div>
        <div>
          <p className="text-indigo-200">Harcanan</p>
          <p className="font-semibold tabular-nums">
            {formatMoney(report.spent)}
          </p>
        </div>
      </div>
      {!report.onTrack && (
        <p className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-xs font-medium">
          ⚠️ Bu hızla ay sonunu getirmek zor — Bütçe&apos;deki asistana göz at.
        </p>
      )}
    </Link>
  )
}

function GoalsModule() {
  const goals = useGoals()
  const contributions = useContributions()

  if (goals.isPending) {
    return (
      <div className="h-40 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-800" />
    )
  }

  const activeGoals = (goals.data ?? []).filter((g) => g.status === 'active')

  if (activeGoals.length === 0) {
    return (
      <CtaModule
        to="/wishlist"
        icon={Sparkles}
        title="İlk hedefini oluştur"
        text="Bir istek ekle; hedef tarihe göre aylık biriktirme tutarını hesaplayıp bütçene ekleyelim."
      />
    )
  }

  const savedByGoal = new Map<string, number>()
  for (const c of contributions.data ?? []) {
    savedByGoal.set(
      c.savings_goal_id,
      (savedByGoal.get(c.savings_goal_id) ?? 0) + c.amount,
    )
  }

  return (
    <Link
      to="/wishlist"
      className="group block rounded-3xl bg-white p-5 shadow-sm shadow-zinc-200/60 transition-transform hover:-translate-y-0.5 dark:bg-zinc-900 dark:shadow-none"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <Sparkles size={16} className="text-indigo-500" /> Hedeflerim
        </span>
        <ArrowRight
          size={16}
          className="text-zinc-300 transition-transform group-hover:translate-x-0.5 dark:text-zinc-600"
        />
      </div>
      <ul className="mt-4 space-y-3.5">
        {activeGoals.slice(0, 3).map((goal) => {
          const saved = savedByGoal.get(goal.id) ?? 0
          const progress = Math.min(1, saved / goal.target_amount)
          return (
            <li key={goal.id}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-medium">
                  {goal.wishlist_items?.name ?? 'Hedef'}
                </p>
                <p className="text-xs font-medium text-zinc-400 tabular-nums">
                  %{Math.round(progress * 100)}
                </p>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
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
      </ul>
      {activeGoals.length > 3 && (
        <p className="mt-3 text-xs text-zinc-400">
          +{activeGoals.length - 3} hedef daha
        </p>
      )}
    </Link>
  )
}

function MoviesModule() {
  const movies = useMovies()

  if (movies.isPending) {
    return (
      <div className="h-40 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-800" />
    )
  }

  const list = movies.data ?? []
  const toWatch = list.filter((m) => m.status === 'to_watch')

  if (list.length === 0) {
    return (
      <CtaModule
        to="/movies"
        icon={Clapperboard}
        title="Film listeni başlat"
        text="İzlemek istediğin filmleri ekle; film gününü hatırlatalım."
      />
    )
  }

  const nextPlanned = toWatch
    .filter((m) => m.planned_for)
    .sort((a, b) => a.planned_for!.localeCompare(b.planned_for!))[0]

  return (
    <Link
      to="/movies"
      className="group block rounded-3xl bg-white p-5 shadow-sm shadow-zinc-200/60 transition-transform hover:-translate-y-0.5 dark:bg-zinc-900 dark:shadow-none"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <Clapperboard size={16} className="text-indigo-500" /> Film Listesi
        </span>
        <ArrowRight
          size={16}
          className="text-zinc-300 transition-transform group-hover:translate-x-0.5 dark:text-zinc-600"
        />
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">
        {toWatch.length}
      </p>
      <p className="text-sm text-zinc-400">izlenecek film</p>
      {nextPlanned && (
        <p className="mt-3 text-xs text-zinc-400">
          Sıradaki:{' '}
          <span className="font-medium text-zinc-600 dark:text-zinc-300">
            {nextPlanned.title}
          </span>{' '}
          · {formatDate(nextPlanned.planned_for!)}
        </p>
      )}
    </Link>
  )
}

function CalendarModule() {
  const categories = useLifeCategories()
  const entries = useCategoryEntries()

  if (categories.isPending || entries.isPending) {
    return (
      <div className="h-40 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-800" />
    )
  }

  const list = categories.data ?? []
  if (list.length === 0) {
    return (
      <CtaModule
        to="/calendar"
        icon={CalendarDays}
        title="Kategorilerini oluştur"
        text="Spor, kitap, sosyalleşme… haftalık hedefler koy, günleri işaretle."
      />
    )
  }

  const weekIsoDays = new Set(weekDays(new Date()).map(toISODate))
  const countFor = (categoryId: string) =>
    (entries.data ?? []).filter(
      (e) => e.category_id === categoryId && weekIsoDays.has(e.done_on),
    ).length

  return (
    <Link
      to="/calendar"
      className="group block rounded-3xl bg-white p-5 shadow-sm shadow-zinc-200/60 transition-transform hover:-translate-y-0.5 dark:bg-zinc-900 dark:shadow-none"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <CalendarDays size={16} className="text-indigo-500" /> Bu Hafta
        </span>
        <ArrowRight
          size={16}
          className="text-zinc-300 transition-transform group-hover:translate-x-0.5 dark:text-zinc-600"
        />
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {list.slice(0, 6).map((category) => {
          const count = countFor(category.id)
          const met =
            category.weekly_target !== null && count >= category.weekly_target
          return (
            <li
              key={category.id}
              className={`rounded-full px-3 py-1.5 text-xs font-medium tabular-nums ${
                met
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              {category.emoji ? `${category.emoji} ` : ''}
              {category.name} {count}
              {category.weekly_target ? `/${category.weekly_target}` : ''}
            </li>
          )
        })}
      </ul>
    </Link>
  )
}

function CtaModule({
  to,
  icon: Icon,
  title,
  text,
}: {
  to: string
  icon: LucideIcon
  title: string
  text: string
}) {
  return (
    <Link
      to={to}
      className="block rounded-3xl border border-dashed border-zinc-200 bg-white/60 p-5 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-indigo-700 dark:hover:bg-indigo-500/10"
    >
      <p className="flex items-center gap-2 font-semibold text-indigo-600 dark:text-indigo-400">
        <Icon size={17} /> {title} <ArrowRight size={16} />
      </p>
      <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{text}</p>
    </Link>
  )
}

function ComingSoonModule({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon
  title: string
  text: ReactNode
}) {
  return (
    <div className="rounded-3xl border border-dashed border-zinc-200 p-5 dark:border-zinc-800/80">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-semibold text-zinc-400 dark:text-zinc-500">
          <Icon size={17} /> {title}
        </p>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase dark:bg-zinc-800 dark:text-zinc-500">
          Yakında
        </span>
      </div>
      <p className="mt-1.5 text-sm text-zinc-400 dark:text-zinc-600">{text}</p>
    </div>
  )
}
