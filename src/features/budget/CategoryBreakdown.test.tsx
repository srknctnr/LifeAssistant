import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { ExpenseItem, Transaction } from '@/features/budget/api'
import { CategoryBreakdown } from '@/features/budget/CategoryBreakdown'

function tx(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    user_id: 'user-1',
    amount: 100,
    currency: 'TRY',
    category: null,
    note: null,
    spent_on: '2026-07-10',
    shared_expense_id: null,
    is_family_visible: false,
    created_at: '2026-07-10T00:00:00Z',
    updated_at: '2026-07-10T00:00:00Z',
    ...overrides,
  }
}

function item(overrides: Partial<ExpenseItem> & { id: string }): ExpenseItem {
  return {
    user_id: 'user-1',
    name: 'Kira',
    amount: 20000,
    currency: 'TRY',
    period: 'monthly',
    category: 'Konut',
    expense_date: null,
    is_active: true,
    is_family_visible: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as ExpenseItem
}

const transactions = [
  tx({ id: 't1', amount: 900, category: 'Market' }),
  tx({ id: 't2', amount: 300, category: 'Ulaşım' }),
  tx({ id: 't3', amount: 9999, category: 'Market', spent_on: '2026-06-01' }),
]
const expenses = [item({ id: 'e1' })]

describe('CategoryBreakdown', () => {
  // the month is passed explicitly rather than faked on the clock: the
  // component takes it, and a test that stubs time cannot also drive clicks
  const july = new Date(2026, 6, 15)

  it('leads with what was actually spent, not with the plan', () => {
    render(
      <CategoryBreakdown
        transactions={transactions}
        expenses={expenses}
        month={july}
      />,
    )
    expect(screen.getByText('Market')).toBeInTheDocument()
    expect(screen.getByText('Ulaşım')).toBeInTheDocument()
    // the planned category is behind the toggle, not on screen
    expect(screen.queryByText('Konut')).not.toBeInTheDocument()
  })

  it('counts only the month on screen', () => {
    render(
      <CategoryBreakdown
        transactions={transactions}
        expenses={expenses}
        month={july}
      />,
    )
    // Haziran'daki 9.999₺ sayılsaydı Market'in payı %97 olurdu
    expect(screen.getByText('%75')).toBeInTheDocument()
  })

  it('still shows the plan, one tap away', async () => {
    const user = userEvent.setup()
    render(
      <CategoryBreakdown
        transactions={transactions}
        expenses={expenses}
        month={july}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Planlı' }))
    expect(screen.getByText('Konut')).toBeInTheDocument()
    expect(screen.queryByText('Market')).not.toBeInTheDocument()
  })

  it('says so when the month has no spending yet, instead of hiding the section', async () => {
    const user = userEvent.setup()
    render(
      <CategoryBreakdown transactions={[]} expenses={expenses} month={july} />,
    )
    expect(screen.getByText(/henüz harcama girmedin/)).toBeInTheDocument()
    // and the plan is still reachable
    await user.click(screen.getByRole('button', { name: 'Planlı' }))
    expect(screen.getByText('Konut')).toBeInTheDocument()
  })

  it('renders nothing at all when there is neither spending nor a plan', () => {
    const { container } = render(
      <CategoryBreakdown transactions={[]} expenses={[]} month={july} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
