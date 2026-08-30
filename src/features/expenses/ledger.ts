import type {
  ExpenseSettlement,
  ExpenseWithShares,
} from '@/features/expenses/api'
import {
  computeBalances,
  fromMinor,
  settleUp,
  splitByWeight,
  splitEvenly,
  toMinor,
  type Balance,
  type Transfer,
} from '@/features/expenses/split-math'

export interface LedgerMember {
  userId: string
  name: string
  isSelf: boolean
  // true for someone who took part but has since left the group
  isFormer?: boolean
}

export interface LedgerBalance {
  userId: string
  name: string
  isSelf: boolean
  net: number // > 0 alacaklı, < 0 borçlu
}

export interface LedgerTransfer {
  fromUser: string
  fromName: string
  toUser: string
  toName: string
  amount: number
}

export interface LedgerView {
  balances: LedgerBalance[]
  transfers: LedgerTransfer[]
  myNet: number
  total: number // everything the group has spent
  isSettled: boolean
}

// Everyone the ledger has to account for: current members plus anyone who
// took part before leaving, so a debt never disappears with a membership
export function ledgerParticipants(
  members: LedgerMember[],
  expenses: ExpenseWithShares[],
  settlements: ExpenseSettlement[],
): string[] {
  const ids = new Set(members.map((m) => m.userId))
  for (const expense of expenses) {
    ids.add(expense.paid_by)
    for (const share of expense.expense_shares) ids.add(share.user_id)
  }
  for (const settlement of settlements) {
    ids.add(settlement.from_user)
    ids.add(settlement.to_user)
  }
  return [...ids]
}

// Everyone the forms have to be able to name: current members first, then
// anyone who only exists in the ledger's history. Without the second group a
// departed member's expense could never be edited and their debt never
// settled — the DB accepts them (is_group_participant), so the UI must too.
export function ledgerMembers(
  members: LedgerMember[],
  expenses: ExpenseWithShares[],
  settlements: ExpenseSettlement[],
): LedgerMember[] {
  const known = new Set(members.map((m) => m.userId))
  const former = ledgerParticipants(members, expenses, settlements)
    .filter((id) => !known.has(id))
    .map((userId) => ({
      userId,
      name: 'Eski üye',
      isSelf: false,
      isFormer: true,
    }))
  return [...members, ...former]
}

export function buildLedgerView(params: {
  members: LedgerMember[]
  expenses: ExpenseWithShares[]
  settlements: ExpenseSettlement[]
  userId: string | undefined
}): LedgerView {
  const { members, expenses, settlements, userId } = params
  const memberIds = ledgerParticipants(members, expenses, settlements)
  const nameOf = (id: string) =>
    members.find((m) => m.userId === id)?.name ?? 'Eski üye'

  const raw: Balance[] = computeBalances({
    memberIds,
    expenses: expenses.map((e) => ({
      paidBy: e.paid_by,
      shares: e.expense_shares.map((s) => ({
        userId: s.user_id,
        amountMinor: toMinor(s.amount),
      })),
    })),
    settlements: settlements.map((s) => ({
      fromUser: s.from_user,
      toUser: s.to_user,
      amountMinor: toMinor(s.amount),
    })),
  })

  const transfers: Transfer[] = settleUp(raw)
  const balances = raw
    .map((b) => ({
      userId: b.userId,
      name: nameOf(b.userId),
      isSelf: b.userId === userId,
      net: fromMinor(b.netMinor),
    }))
    .sort((a, b) => b.net - a.net || a.name.localeCompare(b.name, 'tr'))

  return {
    balances,
    transfers: transfers.map((t) => ({
      fromUser: t.fromUser,
      fromName: nameOf(t.fromUser),
      toUser: t.toUser,
      toName: nameOf(t.toUser),
      amount: fromMinor(t.amountMinor),
    })),
    myNet: balances.find((b) => b.isSelf)?.net ?? 0,
    total: expenses.reduce((sum, e) => sum + e.amount, 0),
    isSettled: raw.every((b) => b.netMinor === 0),
  }
}

// Payer first, so the leftover kuruş lands on them — the convention people
// expect when a total does not divide cleanly.
function payerFirst(participantIds: string[], paidBy: string): string[] {
  return [
    ...participantIds.filter((id) => id === paidBy),
    ...participantIds.filter((id) => id !== paidBy),
  ]
}

// An equal split that always adds back up to the total.
export function equalShares(
  amount: number,
  participantIds: string[],
  paidBy: string,
): { user_id: string; amount: number }[] {
  const ordered = payerFirst(participantIds, paidBy)
  const parts = splitEvenly(toMinor(amount), ordered.length)
  return ordered.map((user_id, i) => ({ user_id, amount: fromMinor(parts[i]) }))
}

// "2 yetişkin + 1 çocuk" is 2/2/1. Weights are relative, so they need no unit
// and no total; the amounts still add back up to the expense exactly.
export function weightedShares(
  amount: number,
  participantIds: string[],
  weights: Record<string, number>,
  paidBy: string,
): { user_id: string; amount: number; weight: number }[] {
  const ordered = payerFirst(participantIds, paidBy)
  const used = ordered.map((id) => {
    const w = weights[id]
    return Number.isFinite(w) && w > 0 ? w : 1
  })
  const parts = splitByWeight(toMinor(amount), used)
  return ordered.map((user_id, i) => ({
    user_id,
    amount: fromMinor(parts[i]),
    weight: used[i],
  }))
}

/**
 * A trip id only means something while the trip is still one of the group's.
 *
 * Both places that hold one — the ledger's filter chips and the expense form's
 * picker — keep it in state that outlives the trip: the group can be switched
 * under a mounted ledger, and a trip can be deleted or moved to another group.
 * A raw id would then filter the list by a trip no chip can clear, or send the
 * server a tag it refuses on every later write. Resolve it against what the
 * group actually has instead; an id it no longer knows is simply no tag.
 */
export function resolveTripTag(
  tripId: string | null | undefined,
  groupTrips: readonly { id: string }[],
): string | null {
  if (!tripId) return null
  return groupTrips.some((trip) => trip.id === tripId) ? tripId : null
}
