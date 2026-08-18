import { describe, expect, it } from 'vitest'

import type {
  ExpenseSettlement,
  ExpenseWithShares,
} from '@/features/expenses/api'
import {
  buildLedgerView,
  equalShares,
  ledgerParticipants,
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
        created_at: '',
      },
      {
        id: 's2',
        expense_id: 'x1',
        family_id: 'f1',
        user_id: 'b',
        amount: 50,
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
