import { useQueries } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/useAuth'
import type { ExpenseItem, Income, Transaction } from '@/features/budget/api'
import {
  monthlyExpenseTotal,
  monthlyIncomeTotal,
  paceReport,
  type PaceReport,
} from '@/features/budget/money'
import type { CategoryEntry, LifeCategory } from '@/features/calendar/api'
import { weekDays } from '@/features/calendar/week-math'
import type {
  Family,
  FamilyMembership,
  FamilyModule,
  ModuleShare,
  ShareLevel,
} from '@/features/family/api'
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
import { useMemberships, useShares } from '@/features/family/hooks'
import type { Movie } from '@/features/movies/api'
import type { GoalWithWish, WishlistItem } from '@/features/wishlist/api'
import { toISODate, todayISO } from '@/lib/dates'

export interface ModuleMember {
  userId: string
  name: string
  isSelf: boolean
  level: ShareLevel
}

// The members of a family who opened a module, with their share level
export function moduleMembers(
  members: FamilyMembership[],
  shares: ModuleShare[],
  module: FamilyModule,
  myUserId: string | undefined,
): ModuleMember[] {
  return members.flatMap((member) => {
    const share = shares.find(
      (s) => s.user_id === member.user_id && s.module === module,
    )
    if (!share) return []
    return [
      {
        userId: member.user_id,
        name: member.profiles?.display_name ?? 'Üye',
        isSelf: member.user_id === myUserId,
        level: share.level,
      },
    ]
  })
}

// My own queries return every row (owner policy). Apply my share level so
// the family space shows exactly what the family actually sees; co-member
// rows arrive pre-filtered by RLS.
export function visibleRows<T extends { is_family_visible: boolean }>(
  rows: T[],
  member: ModuleMember,
): T[] {
  if (!member.isSelf || member.level === 'full') return rows
  return rows.filter((row) => row.is_family_visible)
}

// Selected family (same localStorage key the family page writes) plus its
// members and share rows — the read-only context dashboard cards need.
export function useFamilyContext() {
  const { session } = useAuth()
  const memberships = useMemberships()
  const shares = useShares()

  const userId = session?.user.id
  const allRows = memberships.data ?? []
  const myFamilies = allRows
    .filter((m) => m.user_id === userId)
    .map((m) => m.families)
    .filter((f): f is Family => f !== null)
  const storedId = localStorage.getItem('la-family')
  const family =
    myFamilies.find((f) => f.id === storedId) ?? myFamilies[0] ?? null
  const members = family ? allRows.filter((m) => m.family_id === family.id) : []
  const familyShares = (shares.data ?? []).filter(
    (s) => s.family_id === family?.id,
  )

  return {
    isPending: memberships.isPending || shares.isPending,
    userId,
    family,
    members,
    shares: familyShares,
  }
}

export interface OwnedTransaction extends Transaction {
  ownerName: string
  ownerIsSelf: boolean
}

export interface FamilyBudgetData {
  isPending: boolean
  income: number
  planned: number
  report: PaceReport
  transactions: OwnedTransaction[]
  summaryNames: string[]
}

// Live aggregation across every member who opened their budget: row-level
// members contribute real records, summary-level members only three totals
export function useFamilyBudget(members: ModuleMember[]): FamilyBudgetData {
  const rowMembers = members.filter((m) => m.level !== 'summary')
  const summaryMembers = members.filter((m) => m.level === 'summary')

  const incomeQueries = useQueries({
    queries: rowMembers.map((m) => ({
      queryKey: ['member-incomes', m.userId],
      queryFn: () => listMemberIncomes(m.userId),
    })),
  })
  const expenseQueries = useQueries({
    queries: rowMembers.map((m) => ({
      queryKey: ['member-expenses', m.userId],
      queryFn: () => listMemberExpenses(m.userId),
    })),
  })
  const transactionQueries = useQueries({
    queries: rowMembers.map((m) => ({
      queryKey: ['member-transactions', m.userId],
      queryFn: () => listMemberTransactions(m.userId),
    })),
  })
  const summaryQueries = useQueries({
    queries: summaryMembers.map((m) => ({
      queryKey: ['member-budget-summary', m.userId],
      queryFn: () => fetchMemberBudgetSummary(m.userId),
    })),
  })

  const isPending = [
    ...incomeQueries,
    ...expenseQueries,
    ...transactionQueries,
    ...summaryQueries,
  ].some((q) => q.isPending)

  let income = 0
  let planned = 0
  const owned: OwnedTransaction[] = []
  const paceTransactions: Pick<Transaction, 'amount' | 'spent_on'>[] = []

  rowMembers.forEach((member, i) => {
    const incomes: Income[] = visibleRows(incomeQueries[i].data ?? [], member)
    const expenses: ExpenseItem[] = visibleRows(
      expenseQueries[i].data ?? [],
      member,
    )
    income += monthlyIncomeTotal(incomes)
    planned += monthlyExpenseTotal(expenses)
    for (const t of visibleRows(transactionQueries[i].data ?? [], member)) {
      owned.push({ ...t, ownerName: member.name, ownerIsSelf: member.isSelf })
      paceTransactions.push(t)
    }
  })
  summaryQueries.forEach((query) => {
    const summary = query.data
    if (!summary) return
    income += summary.income
    planned += summary.planned
    if (summary.spent > 0) {
      paceTransactions.push({ amount: summary.spent, spent_on: todayISO() })
    }
  })

  const report = paceReport({
    monthlyIncome: income,
    plannedExpense: planned,
    transactions: paceTransactions,
  })
  const month = todayISO().slice(0, 7)
  const monthTransactions = owned
    .filter((t) => t.spent_on.startsWith(month))
    .sort((a, b) => b.spent_on.localeCompare(a.spent_on))

  return {
    isPending,
    income,
    planned,
    report,
    transactions: monthTransactions,
    summaryNames: summaryMembers.map((m) => m.name),
  }
}

export interface OwnedMovie extends Movie {
  ownerName: string
  ownerIsSelf: boolean
}

export function useFamilyMovies(members: ModuleMember[]) {
  const queries = useQueries({
    queries: members.map((m) => ({
      queryKey: ['member-movies', m.userId],
      queryFn: () => listMemberMovies(m.userId),
    })),
  })

  const movies: OwnedMovie[] = []
  members.forEach((member, i) => {
    for (const movie of visibleRows(queries[i].data ?? [], member)) {
      movies.push({
        ...movie,
        ownerName: member.name,
        ownerIsSelf: member.isSelf,
      })
    }
  })

  return { isPending: queries.some((q) => q.isPending), movies }
}

export interface OwnedGoal extends GoalWithWish {
  ownerName: string
  ownerIsSelf: boolean
  saved: number
}

export interface OwnedWish extends WishlistItem {
  ownerName: string
  ownerIsSelf: boolean
}

export function useFamilyWishlist(members: ModuleMember[]) {
  const goalQueries = useQueries({
    queries: members.map((m) => ({
      queryKey: ['member-goals', m.userId],
      queryFn: () => listMemberGoals(m.userId),
    })),
  })
  const contributionQueries = useQueries({
    queries: members.map((m) => ({
      queryKey: ['member-contributions', m.userId],
      queryFn: () => listMemberContributions(m.userId),
    })),
  })
  const wishQueries = useQueries({
    queries: members.map((m) => ({
      queryKey: ['member-wishes', m.userId],
      queryFn: () => listMemberWishes(m.userId),
    })),
  })

  const isPending = [...goalQueries, ...wishQueries].some((q) => q.isPending)
  const goals: OwnedGoal[] = []
  const wishes: OwnedWish[] = []

  members.forEach((member, i) => {
    // goals follow the parent wish's visibility flag
    const memberGoals = (goalQueries[i].data ?? []).filter(
      (goal) =>
        !member.isSelf ||
        member.level === 'full' ||
        goal.wishlist_items?.is_family_visible,
    )
    const savedByGoal = new Map<string, number>()
    for (const c of contributionQueries[i].data ?? []) {
      savedByGoal.set(
        c.savings_goal_id,
        (savedByGoal.get(c.savings_goal_id) ?? 0) + c.amount,
      )
    }
    for (const goal of memberGoals) {
      goals.push({
        ...goal,
        ownerName: member.name,
        ownerIsSelf: member.isSelf,
        saved: savedByGoal.get(goal.id) ?? 0,
      })
    }
    for (const wish of visibleRows(wishQueries[i].data ?? [], member)) {
      wishes.push({
        ...wish,
        ownerName: member.name,
        ownerIsSelf: member.isSelf,
      })
    }
  })

  return { isPending, goals, wishes }
}

export interface OwnedCategory extends LifeCategory {
  ownerName: string
  ownerIsSelf: boolean
  weekCount: number
}

export function useFamilyCalendar(members: ModuleMember[]) {
  const categoryQueries = useQueries({
    queries: members.map((m) => ({
      queryKey: ['member-categories', m.userId],
      queryFn: () => listMemberCategories(m.userId),
    })),
  })
  const entryQueries = useQueries({
    queries: members.map((m) => ({
      queryKey: ['member-entries', m.userId],
      queryFn: () => listMemberEntries(m.userId),
    })),
  })

  const weekIso = new Set(weekDays(new Date()).map(toISODate))
  const categories: OwnedCategory[] = []

  members.forEach((member, i) => {
    const visible = visibleRows(categoryQueries[i].data ?? [], member)
    const entries: CategoryEntry[] = entryQueries[i].data ?? []
    for (const category of visible) {
      categories.push({
        ...category,
        ownerName: member.name,
        ownerIsSelf: member.isSelf,
        weekCount: entries.filter(
          (e) => e.category_id === category.id && weekIso.has(e.done_on),
        ).length,
      })
    }
  })

  return {
    isPending: categoryQueries.some((q) => q.isPending),
    categories,
  }
}
