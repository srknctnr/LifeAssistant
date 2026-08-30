import { describe, expect, it } from 'vitest'

import type {
  ExpenseSettlement,
  ExpenseWithShares,
} from '@/features/expenses/api'
import {
  buildLedgerView,
  equalShares,
  ledgerMembers,
  ledgerParticipants,
  resolveTripTag,
  weightedShares,
} from '@/features/expenses/ledger'

const members = [
  { userId: 'a', name: 'Serkan', isSelf: true },
  { userId: 'b', name: 'Eş', isSelf: false },
]

function expense(over: Partial<ExpenseWithShares> = {}): ExpenseWithShares {
  return {
    id: 'x1',
    family_id: 'f1',
    title: 'Market',
    amount: 100,
    currency: 'TRY',
    paid_by: 'a',
    spent_on: '2026-08-18',
    category: null,
    note: null,
    split_mode: 'equal',
    trip_id: null,
    created_by: 'a',
    created_at: '',
    updated_at: '',
    expense_shares: [
      {
        id: 's1',
        expense_id: 'x1',
        family_id: 'f1',
        user_id: 'a',
        amount: 50,
        weight: null,
        created_at: '',
      },
      {
        id: 's2',
        expense_id: 'x1',
        family_id: 'f1',
        user_id: 'b',
        amount: 50,
        weight: null,
        created_at: '',
      },
    ],
    ...over,
  }
}

function settlement(over: Partial<ExpenseSettlement> = {}): ExpenseSettlement {
  return {
    id: 't1',
    family_id: 'f1',
    from_user: 'b',
    to_user: 'a',
    amount: 50,
    currency: 'TRY',
    settled_on: '2026-08-18',
    note: null,
    created_by: 'a',
    created_at: '',
    ...over,
  }
}

describe('equalShares', () => {
  it('splits without losing a kuruş and hands the leftover to the payer', () => {
    const shares = equalShares(100, ['a', 'b', 'c'], 'b')
    expect(shares.reduce((sum, s) => sum + s.amount, 0)).toBe(100)
    expect(shares.find((s) => s.user_id === 'b')?.amount).toBe(33.34)
  })

  it('gives a single participant the whole amount', () => {
    expect(equalShares(49.9, ['a'], 'a')).toEqual([
      { user_id: 'a', amount: 49.9 },
    ])
  })
})

describe('ledgerParticipants', () => {
  it('keeps someone who left but still appears in the ledger', () => {
    const ids = ledgerParticipants(
      members,
      [expense({ paid_by: 'gone' })],
      [settlement({ from_user: 'old', to_user: 'a' })],
    )
    expect(ids).toContain('gone')
    expect(ids).toContain('old')
    expect(ids).toContain('a')
  })
})

describe('buildLedgerView', () => {
  it('shows who owes whom after one expense', () => {
    const view = buildLedgerView({
      members,
      expenses: [expense()],
      settlements: [],
      userId: 'a',
    })
    expect(view.myNet).toBe(50)
    expect(view.total).toBe(100)
    expect(view.isSettled).toBe(false)
    expect(view.transfers).toEqual([
      {
        fromUser: 'b',
        fromName: 'Eş',
        toUser: 'a',
        toName: 'Serkan',
        amount: 50,
      },
    ])
  })

  it('is settled once the debt is paid back', () => {
    const view = buildLedgerView({
      members,
      expenses: [expense()],
      settlements: [settlement()],
      userId: 'a',
    })
    expect(view.myNet).toBe(0)
    expect(view.isSettled).toBe(true)
    expect(view.transfers).toEqual([])
  })

  it('sorts creditors first and marks me', () => {
    const view = buildLedgerView({
      members,
      expenses: [expense()],
      settlements: [],
      userId: 'b',
    })
    expect(view.balances[0].name).toBe('Serkan')
    expect(view.balances[0].isSelf).toBe(false)
    expect(view.myNet).toBe(-50)
  })

  it('names a departed member rather than showing a raw id', () => {
    const view = buildLedgerView({
      members,
      expenses: [expense({ paid_by: 'gone' })],
      settlements: [],
      userId: 'a',
    })
    expect(view.balances.some((b) => b.name === 'Eski üye')).toBe(true)
  })

  it('nets out to zero across mixed expenses and settlements', () => {
    const view = buildLedgerView({
      members,
      expenses: [
        expense(),
        expense({
          id: 'x2',
          paid_by: 'b',
          amount: 30,
          expense_shares: [
            {
              id: 's3',
              expense_id: 'x2',
              family_id: 'f1',
              user_id: 'a',
              amount: 30,
              weight: null,
              created_at: '',
            },
          ],
        }),
      ],
      settlements: [settlement({ amount: 10 })],
      userId: 'a',
    })
    const sum = view.balances.reduce((total, b) => total + b.net, 0)
    expect(Math.round(sum * 100)).toBe(0)
    expect(view.total).toBe(130)
  })
})

describe('ledgerMembers', () => {
  it('keeps current members and adds anyone only the history knows', () => {
    const all = ledgerMembers(
      members,
      [expense({ paid_by: 'gone' })],
      [settlement({ from_user: 'old', to_user: 'a' })],
    )
    expect(all.filter((m) => !m.isFormer).map((m) => m.userId)).toEqual([
      'a',
      'b',
    ])
    const former = all.filter((m) => m.isFormer)
    expect(former.map((m) => m.userId).sort()).toEqual(['gone', 'old'])
    expect(former.every((m) => m.name === 'Eski üye')).toBe(true)
  })

  it('adds nobody when everyone is still in the group', () => {
    expect(ledgerMembers(members, [expense()], [settlement()])).toHaveLength(2)
  })
})

describe('weightedShares', () => {
  it('splits 2/2/1 exactly', () => {
    const shares = weightedShares(
      100,
      ['a', 'b', 'c'],
      { a: 2, b: 2, c: 1 },
      'a',
    )
    expect(shares.reduce((sum, s) => sum + s.amount, 0)).toBe(100)
    expect(shares.map((s) => s.amount)).toEqual([40, 40, 20])
  })

  it('treats a missing or non-positive weight as 1', () => {
    const shares = weightedShares(90, ['a', 'b', 'c'], { a: 0 }, 'a')
    expect(shares.map((s) => s.weight)).toEqual([1, 1, 1])
    expect(shares.reduce((sum, s) => sum + s.amount, 0)).toBe(90)
  })

  it('gives the leftover kuruş to the payer', () => {
    const shares = weightedShares(
      10,
      ['a', 'b', 'c'],
      { a: 1, b: 1, c: 1 },
      'b',
    )
    expect(shares[0].user_id).toBe('b')
    expect(shares.reduce((sum, s) => sum + s.amount, 0)).toBe(10)
  })
})

describe('resolveTripTag', () => {
  const trips = [{ id: 'roma' }, { id: 'kas' }]

  it('keeps an id the group still has', () => {
    expect(resolveTripTag('roma', trips)).toBe('roma')
  })

  it('drops an id the group no longer has, so a stale filter cannot hide the list', () => {
    expect(resolveTripTag('roma', [{ id: 'kas' }])).toBeNull()
  })

  it('drops every id once the group has no trips left', () => {
    expect(resolveTripTag('roma', [])).toBeNull()
  })

  it('treats empty, null and undefined alike', () => {
    expect(resolveTripTag('', trips)).toBeNull()
    expect(resolveTripTag(null, trips)).toBeNull()
    expect(resolveTripTag(undefined, trips)).toBeNull()
  })
})
