// Money math for shared expenses. Everything works in kuruş (integer minor
// units) so a split can never lose or invent a kuruş: amounts come from
// numeric(12,2) columns, are converted once, and are converted back once.

export function toMinor(amount: number): number {
  return Math.round(amount * 100)
}

export function fromMinor(minor: number): number {
  return minor / 100
}

// Splits a total between n participants so the parts always sum back to the
// total: the remainder is handed out one kuruş at a time, largest share first.
export function splitEvenly(totalMinor: number, count: number): number[] {
  if (count <= 0) return []
  const sign = totalMinor < 0 ? -1 : 1
  const abs = Math.abs(totalMinor)
  const base = Math.floor(abs / count)
  const remainder = abs - base * count
  return Array.from(
    { length: count },
    (_, i) => sign * (base + (i < remainder ? 1 : 0)),
  )
}

// Splits by weight (e.g. 2 adults + 1 child as 2,2,1). Falls back to an even
// split when no weight is positive. The largest weights absorb the remainder.
export function splitByWeight(totalMinor: number, weights: number[]): number[] {
  const safe = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0))
  const totalWeight = safe.reduce((sum, w) => sum + w, 0)
  if (totalWeight === 0) return splitEvenly(totalMinor, weights.length)

  const sign = totalMinor < 0 ? -1 : 1
  const abs = Math.abs(totalMinor)
  const exact = safe.map((w) => (abs * w) / totalWeight)
  const floored = exact.map(Math.floor)
  let remainder = abs - floored.reduce((sum, v) => sum + v, 0)

  // hand the remainder to the largest fractional parts first, ties by index
  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index)
  const result = [...floored]
  for (const { index } of order) {
    if (remainder <= 0) break
    result[index] += 1
    remainder -= 1
  }
  return result.map((v) => sign * v)
}

export interface ExpenseShare {
  userId: string
  amountMinor: number
}

export interface BalanceInput {
  expenses: { paidBy: string; shares: ExpenseShare[] }[]
  // a settlement moves money from the debtor to the creditor, closing the gap
  settlements: { fromUser: string; toUser: string; amountMinor: number }[]
  // everyone who should appear, even at zero (members who never paid or owed)
  memberIds: string[]
}

export interface Balance {
  userId: string
  // > 0 -> the group owes this person, < 0 -> this person owes the group
  netMinor: number
}

export function computeBalances({
  expenses,
  settlements,
  memberIds,
}: BalanceInput): Balance[] {
  const net = new Map<string, number>(memberIds.map((id) => [id, 0]))
  const bump = (id: string, delta: number) =>
    net.set(id, (net.get(id) ?? 0) + delta)

  for (const expense of expenses) {
    for (const share of expense.shares) {
      bump(share.userId, -share.amountMinor)
    }
    const paid = expense.shares.reduce((sum, s) => sum + s.amountMinor, 0)
    bump(expense.paidBy, paid)
  }

  for (const settlement of settlements) {
    bump(settlement.fromUser, settlement.amountMinor)
    bump(settlement.toUser, -settlement.amountMinor)
  }

  return [...net.entries()].map(([userId, netMinor]) => ({ userId, netMinor }))
}

export interface Transfer {
  fromUser: string
  toUser: string
  amountMinor: number
}

// Who pays whom to zero everyone out, in as few transfers as we can get
// greedily: the biggest debtor always pays the biggest creditor. Deterministic
// (ties broken by user id) so the same balances always render the same list.
export function settleUp(balances: Balance[]): Transfer[] {
  const debtors = balances
    .filter((b) => b.netMinor < 0)
    .map((b) => ({ userId: b.userId, amount: -b.netMinor }))
    .sort((a, b) => b.amount - a.amount || a.userId.localeCompare(b.userId))
  const creditors = balances
    .filter((b) => b.netMinor > 0)
    .map((b) => ({ userId: b.userId, amount: b.netMinor }))
    .sort((a, b) => b.amount - a.amount || a.userId.localeCompare(b.userId))

  const transfers: Transfer[] = []
  let d = 0
  let c = 0
  while (d < debtors.length && c < creditors.length) {
    const amount = Math.min(debtors[d].amount, creditors[c].amount)
    if (amount > 0) {
      transfers.push({
        fromUser: debtors[d].userId,
        toUser: creditors[c].userId,
        amountMinor: amount,
      })
    }
    debtors[d].amount -= amount
    creditors[c].amount -= amount
    if (debtors[d].amount === 0) d += 1
    if (creditors[c].amount === 0) c += 1
  }
  return transfers
}
