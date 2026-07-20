import { useQuery } from '@tanstack/react-query'
import { Clapperboard, Star } from 'lucide-react'
import type { ReactNode } from 'react'

import { Sheet } from '@/components/Sheet'
import { SkeletonRows } from '@/components/SkeletonRows'
import { StarRating } from '@/components/StarRating'
import { monthlyEquivalent, paceReport } from '@/features/budget/money'
import { weekDays } from '@/features/calendar/week-math'
import type { FamilyMembership, ModuleShare } from '@/features/family/api'
import {
  fetchMemberBudgetSummary,
  listMemberCategories,
  listMemberContributions,
  listMemberEntries,
  listMemberExpenses,
  listMemberGoals,
  listMemberIncomes,
  listMemberMovies,
  listMemberTransactions,
  listMemberWishes,
} from '@/features/family/api'
import { tmdbPosterUrl } from '@/features/movies/tmdb'
import { formatDate, toISODate, todayISO } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

interface MemberModuleSheetProps {
  member: FamilyMembership
  share: ModuleShare
  open: boolean
  onClose: () => void
}

const MODULE_TITLES: Record<ModuleShare['module'], string> = {
  budget: 'Bütçe',
  wishlist: 'İstekler',
  movies: 'Filmler',
  calendar: 'Takvim',
}

// Read-only window into a co-member's shared module
export function MemberModuleSheet({
  member,
  share,
  open,
  onClose,
}: MemberModuleSheetProps) {
  const name = member.profiles?.display_name ?? 'Üye'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`${name} · ${MODULE_TITLES[share.module]}`}
    >
      {share.module === 'budget' && (
        <BudgetViewer ownerId={member.user_id} full={share.level === 'full'} />
      )}
      {share.module === 'wishlist' && (
        <WishlistViewer ownerId={member.user_id} />
      )}
      {share.module === 'movies' && <MoviesViewer ownerId={member.user_id} />}
      {share.module === 'calendar' && (
        <CalendarViewer ownerId={member.user_id} />
      )}
    </Sheet>
  )
}

function BudgetViewer({ ownerId, full }: { ownerId: string; full: boolean }) {
  const summary = useQuery({
    queryKey: ['member-budget-summary', ownerId],
    queryFn: () => fetchMemberBudgetSummary(ownerId),
  })
  const incomes = useQuery({
    queryKey: ['member-incomes', ownerId],
    queryFn: () => listMemberIncomes(ownerId),
    enabled: full,
  })
  const expenses = useQuery({
    queryKey: ['member-expenses', ownerId],
    queryFn: () => listMemberExpenses(ownerId),
    enabled: full,
  })
  const transactions = useQuery({
    queryKey: ['member-transactions', ownerId],
    queryFn: () => listMemberTransactions(ownerId),
    enabled: full,
  })

  if (summary.isPending) return <SkeletonRows count={2} />
  if (summary.isError) {
    return <ViewerError text="Bu bütçeye erişim yok ya da yüklenemedi." />
  }

  const report = paceReport({
    monthlyIncome: summary.data.income,
    plannedExpense: summary.data.planned,
    transactions: [{ amount: summary.data.spent, spent_on: todayISO() }],
  })
  const month = todayISO().slice(0, 7)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <StatBox label="Bu ay kalan" value={formatMoney(report.remaining)} />
        <StatBox
          label="Günlük güvenli"
          value={formatMoney(report.dailyAllowance)}
        />
        <StatBox label="Harcanan" value={formatMoney(report.spent)} />
        <StatBox
          label="Durum"
          value={report.onTrack ? 'Yolunda 🎯' : 'Hız yüksek ⚠️'}
        />
      </div>

      {!full && (
        <p className="text-xs text-zinc-400">
          Özet paylaşım: kalem ayrıntıları görünmez.
        </p>
      )}

      {full && (
        <>
          <ViewerGroup title="Gelirler" pending={incomes.isPending}>
            {(incomes.data ?? []).map((income) => (
              <ViewerRow
                key={income.id}
                label={income.name}
                amount={formatMoney(income.amount, income.currency)}
              />
            ))}
          </ViewerGroup>
          <ViewerGroup title="Planlı giderler" pending={expenses.isPending}>
            {(expenses.data ?? [])
              .filter((e) => e.is_active)
              .map((item) => (
                <ViewerRow
                  key={item.id}
                  label={item.name}
                  sub={item.category ?? undefined}
                  amount={
                    item.period === 'once'
                      ? formatMoney(item.amount, item.currency)
                      : `${formatMoney(monthlyEquivalent(item.amount, item.period), item.currency)}/ay`
                  }
                />
              ))}
          </ViewerGroup>
          <ViewerGroup
            title="Harcamalar · bu ay"
            pending={transactions.isPending}
          >
            {(transactions.data ?? [])
              .filter((t) => t.spent_on.startsWith(month))
              .slice(0, 10)
              .map((t) => (
                <ViewerRow
                  key={t.id}
                  label={t.category || t.note || 'Harcama'}
                  sub={formatDate(t.spent_on)}
                  amount={formatMoney(t.amount, t.currency)}
                />
              ))}
          </ViewerGroup>
        </>
      )}
    </div>
  )
}

function WishlistViewer({ ownerId }: { ownerId: string }) {
  const goals = useQuery({
    queryKey: ['member-goals', ownerId],
    queryFn: () => listMemberGoals(ownerId),
  })
  const contributions = useQuery({
    queryKey: ['member-contributions', ownerId],
    queryFn: () => listMemberContributions(ownerId),
  })
  const wishes = useQuery({
    queryKey: ['member-wishes', ownerId],
    queryFn: () => listMemberWishes(ownerId),
  })

  if (goals.isPending || wishes.isPending) return <SkeletonRows count={2} />
  if (goals.isError || wishes.isError) {
    return <ViewerError text="Bu listeye erişim yok ya da yüklenemedi." />
  }

  const savedByGoal = new Map<string, number>()
  for (const c of contributions.data ?? []) {
    savedByGoal.set(
      c.savings_goal_id,
      (savedByGoal.get(c.savings_goal_id) ?? 0) + c.amount,
    )
  }
  const activeGoals = (goals.data ?? []).filter((g) => g.status === 'active')
  const activeWishes = (wishes.data ?? []).filter((w) => w.status === 'active')

  return (
    <div className="space-y-5">
      <ViewerGroup title="Hedefler" pending={false}>
        {activeGoals.map((goal) => {
          const saved = savedByGoal.get(goal.id) ?? 0
          const progress = Math.min(1, saved / goal.target_amount)
          return (
            <div
              key={goal.id}
              className="rounded-xl bg-zinc-50 px-3.5 py-2.5 dark:bg-zinc-800"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-medium">
                  {goal.wishlist_items?.name ?? 'Hedef'}
                </p>
                <p className="text-xs text-zinc-400 tabular-nums">
                  %{Math.round(progress * 100)}
                </p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </ViewerGroup>
      <ViewerGroup title="İstekler" pending={false}>
        {activeWishes.map((wish) => (
          <ViewerRow
            key={wish.id}
            label={wish.name}
            sub={wish.target_date ? formatDate(wish.target_date) : undefined}
            amount={formatMoney(wish.estimated_amount, wish.currency)}
          />
        ))}
      </ViewerGroup>
    </div>
  )
}

function MoviesViewer({ ownerId }: { ownerId: string }) {
  const movies = useQuery({
    queryKey: ['member-movies', ownerId],
    queryFn: () => listMemberMovies(ownerId),
  })

  if (movies.isPending) return <SkeletonRows count={2} />
  if (movies.isError) {
    return <ViewerError text="Bu listeye erişim yok ya da yüklenemedi." />
  }

  const toWatch = (movies.data ?? []).filter((m) => m.status === 'to_watch')
  const watched = (movies.data ?? []).filter((m) => m.status === 'watched')

  return (
    <div className="space-y-5">
      <ViewerGroup title="İzleme listesi" pending={false}>
        {toWatch.slice(0, 10).map((movie) => (
          <MovieViewerRow key={movie.id} movie={movie} />
        ))}
      </ViewerGroup>
      <ViewerGroup title="İzledikleri" pending={false}>
        {watched.slice(0, 10).map((movie) => (
          <MovieViewerRow key={movie.id} movie={movie} showRating />
        ))}
      </ViewerGroup>
    </div>
  )
}

function MovieViewerRow({
  movie,
  showRating,
}: {
  movie: {
    id: string
    title: string
    poster_path: string | null
    rating: number | null
    external_rating: number | null
    external_source: 'imdb' | 'tmdb' | null
  }
  showRating?: boolean
}) {
  const poster = tmdbPosterUrl(movie.poster_path)
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
      {poster ? (
        <img
          src={poster}
          alt=""
          className="h-10 w-7 shrink-0 rounded object-cover"
        />
      ) : (
        <span className="flex h-10 w-7 shrink-0 items-center justify-center rounded bg-zinc-200 text-zinc-400 dark:bg-zinc-700">
          <Clapperboard size={12} />
        </span>
      )}
      <p className="min-w-0 flex-1 truncate text-sm font-medium">
        {movie.title}
      </p>
      {showRating && movie.rating ? (
        <StarRating value={movie.rating} size={11} />
      ) : movie.external_rating ? (
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-500 tabular-nums dark:text-amber-400">
          <Star size={10} fill="currentColor" strokeWidth={0} />
          {movie.external_rating.toLocaleString('tr-TR', {
            minimumFractionDigits: 1,
          })}
        </span>
      ) : null}
    </div>
  )
}

function CalendarViewer({ ownerId }: { ownerId: string }) {
  const categories = useQuery({
    queryKey: ['member-categories', ownerId],
    queryFn: () => listMemberCategories(ownerId),
  })
  const entries = useQuery({
    queryKey: ['member-entries', ownerId],
    queryFn: () => listMemberEntries(ownerId),
  })

  if (categories.isPending || entries.isPending) {
    return <SkeletonRows count={2} />
  }
  if (categories.isError) {
    return <ViewerError text="Bu takvime erişim yok ya da yüklenemedi." />
  }

  const weekIso = new Set(weekDays(new Date()).map(toISODate))

  return (
    <ViewerGroup title="Bu hafta" pending={false}>
      {(categories.data ?? []).map((category) => {
        const count = (entries.data ?? []).filter(
          (e) => e.category_id === category.id && weekIso.has(e.done_on),
        ).length
        const met =
          category.weekly_target !== null && count >= category.weekly_target
        return (
          <div
            key={category.id}
            className="flex items-center justify-between rounded-xl bg-zinc-50 px-3.5 py-2.5 dark:bg-zinc-800"
          >
            <p className="truncate text-sm font-medium">
              {category.emoji ? `${category.emoji} ` : ''}
              {category.name}
            </p>
            <span
              className={`text-xs font-semibold tabular-nums ${
                met ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'
              }`}
            >
              {count}
              {category.weekly_target ? `/${category.weekly_target}` : ''}
              {met ? ' 🎉' : ''}
            </span>
          </div>
        )
      })}
    </ViewerGroup>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 px-3.5 py-2.5 dark:bg-zinc-800">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function ViewerGroup({
  title,
  pending,
  children,
}: {
  title: string
  pending: boolean
  children: ReactNode
}) {
  const isEmpty =
    !pending &&
    (children === null || (Array.isArray(children) && children.length === 0))
  return (
    <div>
      <p className="mb-2 text-sm font-semibold tracking-tight">{title}</p>
      {pending ? (
        <SkeletonRows count={1} />
      ) : isEmpty ? (
        <p className="text-xs text-zinc-400">Kayıt yok.</p>
      ) : (
        <div className="space-y-1.5">{children}</div>
      )}
    </div>
  )
}

function ViewerRow({
  label,
  sub,
  amount,
}: {
  label: string
  sub?: string
  amount: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3.5 py-2.5 dark:bg-zinc-800">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-zinc-400">{sub}</p>}
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums">{amount}</p>
    </div>
  )
}

function ViewerError({ text }: { text: string }) {
  return <p className="text-sm text-red-600 dark:text-red-400">{text}</p>
}
