import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ExpenseItem, Income, Transaction } from '@/features/budget/api'
import { MonthlyTrend } from '@/features/budget/MonthlyTrend'

const scrollIntoView = vi.fn()
// jsdom has no scrollIntoView, which is why the component optional-chains it
Element.prototype.scrollIntoView = scrollIntoView

const income = {
  id: 'i1',
  user_id: 'u1',
  amount: 60000,
  currency: 'TRY',
  name: 'Maaş',
  salary_day: 1,
  income_date: null,
  is_family_visible: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
} as unknown as Income

function renderStrip(props: {
  incomes?: Income[]
  expenses?: ExpenseItem[]
  transactions?: Transaction[]
  value?: string
}) {
  return render(
    <MonthlyTrend
      incomes={props.incomes ?? []}
      expenses={props.expenses ?? []}
      transactions={props.transactions ?? []}
      currentKey="2026-09"
      value={props.value ?? '2026-09'}
      onChange={() => {}}
    />,
  )
}

describe('MonthlyTrend', () => {
  beforeEach(() => scrollIntoView.mockClear())

  it('renders nothing while there is no data at all', () => {
    const { container } = renderStrip({})
    expect(container).toBeEmptyDOMElement()
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  // The bug: the first render of /budget happens while the queries are still
  // pending, so the strip returns null. A one-shot mount effect scrolled
  // nothing and never ran again, parking a 19-month strip at the far left with
  // the selected month — and, since this is the page's only month picker, the
  // whole control — off-screen.
  it('scrolls the selected month into view once the data arrives', () => {
    const { rerender } = renderStrip({})
    expect(scrollIntoView).not.toHaveBeenCalled()

    rerender(
      <MonthlyTrend
        incomes={[income]}
        expenses={[]}
        transactions={[]}
        currentKey="2026-09"
        value="2026-09"
        onChange={() => {}}
      />,
    )
    expect(scrollIntoView).toHaveBeenCalled()
  })

  it('follows the anchor when another month is selected', () => {
    const { rerender } = renderStrip({ incomes: [income] })
    scrollIntoView.mockClear()

    rerender(
      <MonthlyTrend
        incomes={[income]}
        expenses={[]}
        transactions={[]}
        currentKey="2026-09"
        value="2026-05"
        onChange={() => {}}
      />,
    )
    expect(scrollIntoView).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Mayıs 2026' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
