import type {
  ExpenseSettlement,
  ExpenseWithShares,
} from '@/features/expenses/api'
import {
  computeBalances,
  fromMinor,
  settleUp,
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

// An equal split that always adds back up to the total. The payer absorbs the
// leftover kuruş first, which is the convention people expect.
export function equalShares(
  amount: number,
  participantIds: string[],
  paidBy: string,
): { user_id: string; amount: number }[] {
  const ordered = [
    ...participantIds.filter((id) => id === paidBy),
    ...participantIds.filter((id) => id !== paidBy),
  ]
  const parts = splitEvenly(toMinor(amount), ordered.length)
  return ordered.map((user_id, i) => ({ user_id, amount: fromMinor(parts[i]) }))
}
