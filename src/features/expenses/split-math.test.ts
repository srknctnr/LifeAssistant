import { describe, expect, it } from 'vitest'

import {
  computeBalances,
  fromMinor,
  settleUp,
  splitByWeight,
  splitEvenly,
  toMinor,
} from '@/features/expenses/split-math'

describe('toMinor / fromMinor', () => {
  it('round-trips amounts that float arithmetic would spoil', () => {
    expect(toMinor(349.9)).toBe(34990)
    expect(toMinor(0.1 + 0.2)).toBe(30)
    expect(fromMinor(34990)).toBe(349.9)
  })
})

describe('splitEvenly', () => {
  it('splits without losing a kuruş', () => {
    const parts = splitEvenly(10000, 3)
    expect(parts).toEqual([3334, 3333, 3333])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10000)
  })

  it('splits evenly when it divides exactly', () => {
    expect(splitEvenly(9000, 3)).toEqual([3000, 3000, 3000])
  })

  it('handles a single participant and an empty group', () => {
    expect(splitEvenly(1234, 1)).toEqual([1234])
    expect(splitEvenly(1234, 0)).toEqual([])
  })

  it('keeps the sum exact for a refund (negative total)', () => {
    const parts = splitEvenly(-10000, 3)
    expect(parts.reduce((a, b) => a + b, 0)).toBe(-10000)
  })
})

describe('splitByWeight', () => {
  it('splits proportionally and exactly', () => {
    const parts = splitByWeight(10000, [2, 2, 1])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10000)
    expect(parts).toEqual([4000, 4000, 2000])
  })

  it('gives the remainder to the largest fractional shares', () => {
    const parts = splitByWeight(10000, [1, 1, 1])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10000)
    expect(parts).toEqual([3334, 3333, 3333])
  })

  it('falls back to an even split when no weight is positive', () => {
    expect(splitByWeight(900, [0, 0, 0])).toEqual([300, 300, 300])
  })
})

describe('computeBalances', () => {
  const members = ['a', 'b', 'c']

  it('credits the payer and debits every participant', () => {
    const balances = computeBalances({
      memberIds: members,
      settlements: [],
      expenses: [
        {
          paidBy: 'a',
          shares: [
            { userId: 'a', amountMinor: 3334 },
            { userId: 'b', amountMinor: 3333 },
            { userId: 'c', amountMinor: 3333 },
          ],
        },
      ],
    })
    expect(balances).toEqual([
      { userId: 'a', netMinor: 6666 },
      { userId: 'b', netMinor: -3333 },
      { userId: 'c', netMinor: -3333 },
    ])
    expect(balances.reduce((sum, b) => sum + b.netMinor, 0)).toBe(0)
  })

  it('always nets out to zero across several expenses', () => {
    const balances = computeBalances({
      memberIds: members,
      settlements: [],
      expenses: [
        {
          paidBy: 'a',
          shares: [
            { userId: 'a', amountMinor: 2500 },
            { userId: 'b', amountMinor: 2500 },
          ],
        },
        {
          paidBy: 'c',
          shares: [
            { userId: 'a', amountMinor: 1000 },
            { userId: 'c', amountMinor: 1000 },
          ],
        },
      ],
    })
    expect(balances.reduce((sum, b) => sum + b.netMinor, 0)).toBe(0)
    expect(balances.find((b) => b.userId === 'a')?.netMinor).toBe(1500)
  })

  it('closes the gap when a settlement is recorded', () => {
    const balances = computeBalances({
      memberIds: ['a', 'b'],
      expenses: [
        {
          paidBy: 'a',
          shares: [
            { userId: 'a', amountMinor: 5000 },
            { userId: 'b', amountMinor: 5000 },
          ],
        },
      ],
      settlements: [{ fromUser: 'b', toUser: 'a', amountMinor: 5000 }],
    })
    expect(balances).toEqual([
      { userId: 'a', netMinor: 0 },
      { userId: 'b', netMinor: 0 },
    ])
  })

  it('lists members who never paid or owed at zero', () => {
    const balances = computeBalances({
      memberIds: members,
      expenses: [],
      settlements: [],
    })
    expect(balances.every((b) => b.netMinor === 0)).toBe(true)
    expect(balances).toHaveLength(3)
  })
})

describe('settleUp', () => {
  it('pairs the biggest debtor with the biggest creditor', () => {
    const transfers = settleUp([
      { userId: 'a', netMinor: 6666 },
      { userId: 'b', netMinor: -3333 },
      { userId: 'c', netMinor: -3333 },
    ])
    expect(transfers).toEqual([
      { fromUser: 'b', toUser: 'a', amountMinor: 3333 },
      { fromUser: 'c', toUser: 'a', amountMinor: 3333 },
    ])
  })

  it('splits one debtor across two creditors', () => {
    const transfers = settleUp([
      { userId: 'a', netMinor: 3000 },
      { userId: 'b', netMinor: 2000 },
      { userId: 'c', netMinor: -5000 },
    ])
    expect(transfers).toEqual([
      { fromUser: 'c', toUser: 'a', amountMinor: 3000 },
      { fromUser: 'c', toUser: 'b', amountMinor: 2000 },
    ])
  })

  it('returns nothing when everyone is square', () => {
    expect(
      settleUp([
        { userId: 'a', netMinor: 0 },
        { userId: 'b', netMinor: 0 },
      ]),
    ).toEqual([])
  })

  it('moves exactly the amount owed, never more', () => {
    const balances = [
      { userId: 'a', netMinor: 1234 },
      { userId: 'b', netMinor: 5678 },
      { userId: 'c', netMinor: -6912 },
    ]
    const transfers = settleUp(balances)
    const moved = transfers.reduce((sum, t) => sum + t.amountMinor, 0)
    expect(moved).toBe(6912)
    expect(transfers.every((t) => t.amountMinor > 0)).toBe(true)
  })
})
