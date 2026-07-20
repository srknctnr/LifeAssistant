import { Clapperboard, Sparkles, Star, Users, Wallet } from 'lucide-react'
import { motion } from 'motion/react'

import { AnimatedNumber } from '@/components/AnimatedNumber'
import { Section } from '@/components/Section'
import { SkeletonRows } from '@/components/SkeletonRows'
import { useAuth } from '@/features/auth/useAuth'
import type {
  Family,
  FamilyMembership,
  ModuleShare,
} from '@/features/family/api'
import {
  moduleMembers,
  useFamilyBudget,
  useFamilyCalendar,
  useFamilyMovies,
  useFamilyWishlist,
  type ModuleMember,
} from '@/features/family/space-data'
import { tmdbPosterUrl } from '@/features/movies/tmdb'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

interface FamilySpaceProps {
  family: Family
  members: FamilyMembership[]
  shares: ModuleShare[]
}

// The shared family dashboard: everything members opened to this family,
// aggregated live (full/ask levels contribute rows, summary only totals)
export function FamilySpace({ family, members, shares }: FamilySpaceProps) {
  const { session } = useAuth()
  const userId = session?.user.id

  const budgetMembers = moduleMembers(members, shares, 'budget', userId)
  const wishlistMembers = moduleMembers(members, shares, 'wishlist', userId)
  const movieMembers = moduleMembers(members, shares, 'movies', userId)
  const calendarMembers = moduleMembers(members, shares, 'calendar', userId)

  const totalShares =
    budgetMembers.length +
    wishlistMembers.length +
    movieMembers.length +
    calendarMembers.length

  if (totalShares === 0) {
    return (
      <div className="mt-6 rounded-3xl border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-800">
        <Users size={22} className="mx-auto text-zinc-300 dark:text-zinc-600" />
        <p className="mt-3 text-sm font-semibold">
          {family.name} alanı henüz boş
        </p>
        <p className="mx-auto mt-1.5 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
          Yönetim sekmesinden modüllerini &quot;Tam&quot; ya da &quot;Sor&quot;
          olarak aç; eklediklerin burada, ailenin ortak alanında birikmeye
          başlasın.
        </p>
      </div>
    )
  }

  return (
    <>
      {budgetMembers.length > 0 && (
        <FamilyBudgetSection members={budgetMembers} />
      )}
      {wishlistMembers.length > 0 && (
        <FamilyWishlistSection members={wishlistMembers} />
      )}
      {movieMembers.length > 0 && (
        <FamilyMoviesSection members={movieMembers} />
      )}
      {calendarMembers.length > 0 && (
        <FamilyCalendarSection members={calendarMembers} />
      )}
    </>
  )
}

function FamilyBudgetSection({ members }: { members: ModuleMember[] }) {
  const budget = useFamilyBudget(members)

  if (budget.isPending) {
    return (
      <div className="mt-6 h-44 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-800" />
    )
  }

  const { report } = budget

  return (
    <>
      <div className="mt-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-600/20">
        <div className="flex items-center justify-between text-sm text-indigo-100">
          <span className="flex items-center gap-2">
            <Wallet size={16} /> Aile Bütçesi
          </span>
          <span className="text-xs">{members.length} üye katılıyor</span>
        </div>
        <p className="mt-3 text-sm text-indigo-100">
          Günlük güvenli harcama (aile)
        </p>
        <AnimatedNumber
          className="mt-0.5 block text-4xl font-bold tracking-tight tabular-nums"
          value={report.dailyAllowance}
          format={(v) => formatMoney(v)}
        />
        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <p className="text-indigo-200">Bu ay kalan</p>
            <p className="font-semibold tabular-nums">
              {formatMoney(report.remaining)}
            </p>
          </div>
          <div>
            <p className="text-indigo-200">Harcanan</p>
            <p className="font-semibold tabular-nums">
              {formatMoney(report.spent)}
            </p>
          </div>
          <div>
            <p className="text-indigo-200">Gelir</p>
            <p className="font-semibold tabular-nums">
              {formatMoney(budget.income)}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {members.map((member) => (
            <span
              key={member.userId}
              className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium"
            >
              {member.isSelf ? 'Sen' : member.name}
              {member.level === 'summary' ? ' · özet' : ''}
            </span>
          ))}
        </div>
        {!report.onTrack && (
          <p className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-xs font-medium">
            ⚠️ Aile bu hızla ay sonunu getirmekte zorlanır.
          </p>
        )}
      </div>

      <Section title="Aile harcamaları · bu ay">
        {budget.transactions.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Bu ay ortak alana düşen harcama yok.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {budget.transactions.slice(0, 8).map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-xl bg-white px-3.5 py-2.5 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {t.category || t.note || 'Harcama'}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
                    {formatDate(t.spent_on)}
                    <OwnerChip name={t.ownerName} isSelf={t.ownerIsSelf} />
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatMoney(t.amount, t.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}

function FamilyWishlistSection({ members }: { members: ModuleMember[] }) {
  const wishlist = useFamilyWishlist(members)

  const activeGoals = wishlist.goals.filter((g) => g.status === 'active')
  const activeWishes = wishlist.wishes.filter((w) => w.status === 'active')

  return (
    <Section title="Ortak hedefler">
      {wishlist.isPending ? (
        <SkeletonRows count={2} />
      ) : activeGoals.length === 0 && activeWishes.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Ortak alanda hedef ya da istek yok.
        </p>
      ) : (
        <div className="space-y-3">
          {activeGoals.map((goal) => {
            const progress = Math.min(1, goal.saved / goal.target_amount)
            return (
              <div
                key={goal.id}
                className="rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium">
                    <Sparkles size={13} className="shrink-0 text-indigo-500" />
                    {goal.wishlist_items?.name ?? 'Hedef'}
                  </p>
                  <p className="shrink-0 text-xs font-medium text-zinc-400 tabular-nums">
                    {formatMoney(goal.saved)} /{' '}
                    {formatMoney(goal.target_amount)}
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ type: 'spring', stiffness: 90, damping: 22 }}
                  />
                </div>
                <div className="mt-2">
                  <OwnerChip name={goal.ownerName} isSelf={goal.ownerIsSelf} />
                </div>
              </div>
            )
          })}
          {activeWishes.map((wish) => (
            <div
              key={wish.id}
              className="flex items-center gap-3 rounded-xl bg-white px-3.5 py-2.5 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{wish.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
                  {wish.target_date ? formatDate(wish.target_date) : 'İstek'}
                  <OwnerChip name={wish.ownerName} isSelf={wish.ownerIsSelf} />
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {formatMoney(wish.estimated_amount, wish.currency)}
              </p>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

function FamilyMoviesSection({ members }: { members: ModuleMember[] }) {
  const { isPending, movies } = useFamilyMovies(members)

  const toWatch = movies.filter((m) => m.status === 'to_watch')
  const watched = movies.filter((m) => m.status === 'watched')

  return (
    <Section title="Aile film listesi">
      {isPending ? (
        <SkeletonRows count={2} />
      ) : movies.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Ortak listede film yok — Filmler&apos;den eklediklerin buraya düşer.
        </p>
      ) : (
        <div className="space-y-4">
          <MovieGroup title={`İzlenecekler · ${toWatch.length}`}>
            {toWatch.slice(0, 8).map((movie) => (
              <FamilyMovieRow key={movie.id} movie={movie} />
            ))}
          </MovieGroup>
          {watched.length > 0 && (
            <MovieGroup title={`İzlenenler · ${watched.length}`}>
              {watched.slice(0, 5).map((movie) => (
                <FamilyMovieRow key={movie.id} movie={movie} />
              ))}
            </MovieGroup>
          )}
        </div>
      )}
    </Section>
  )
}

function MovieGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
        {title}
      </p>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  )
}

function FamilyMovieRow({
  movie,
}: {
  movie: {
    id: string
    title: string
    poster_path: string | null
    planned_for: string | null
    external_rating: number | null
    ownerName: string
    ownerIsSelf: boolean
  }
}) {
  const poster = tmdbPosterUrl(movie.poster_path)
  return (
    <li className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none">
      {poster ? (
        <img
          src={poster}
          alt=""
          className="h-12 w-8 shrink-0 rounded-md object-cover"
        />
      ) : (
        <span className="flex h-12 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
          <Clapperboard size={13} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{movie.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
          <OwnerChip name={movie.ownerName} isSelf={movie.ownerIsSelf} />
          {movie.planned_for && <span>{formatDate(movie.planned_for)}</span>}
        </p>
      </div>
      {movie.external_rating && (
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-500 tabular-nums dark:text-amber-400">
          <Star size={10} fill="currentColor" strokeWidth={0} />
          {movie.external_rating.toLocaleString('tr-TR', {
            minimumFractionDigits: 1,
          })}
        </span>
      )}
    </li>
  )
}

function FamilyCalendarSection({ members }: { members: ModuleMember[] }) {
  const { isPending, categories } = useFamilyCalendar(members)

  return (
    <Section title="Bu hafta ailede">
      {isPending ? (
        <SkeletonRows count={1} />
      ) : categories.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Ortak alanda takvim kategorisi yok.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {categories.map((category) => {
            const met =
              category.weekly_target !== null &&
              category.weekCount >= category.weekly_target
            return (
              <li
                key={category.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-2.5 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {category.emoji ? `${category.emoji} ` : ''}
                    {category.name}
                  </p>
                  <OwnerChip
                    name={category.ownerName}
                    isSelf={category.ownerIsSelf}
                  />
                </div>
                <span
                  className={`shrink-0 text-xs font-semibold tabular-nums ${
                    met
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {category.weekCount}
                  {category.weekly_target ? `/${category.weekly_target}` : ''}
                  {met ? ' 🎉' : ''}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}

function OwnerChip({ name, isSelf }: { name: string; isSelf: boolean }) {
  return (
    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
      {isSelf ? 'Sen' : name}
    </span>
  )
}
