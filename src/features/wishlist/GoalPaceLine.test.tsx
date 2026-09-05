import { render, screen } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { GoalWithWish } from '@/features/wishlist/api'
import { GoalPaceLine } from '@/features/wishlist/GoalPaceLine'

// 12.000₺ at 3.000₺/ay, due 6 Kasım 2026
function makeGoal(overrides: Partial<GoalWithWish> = {}): GoalWithWish {
  return {
    id: 'goal-1',
    user_id: 'user-1',
    wishlist_item_id: 'wish-1',
    target_amount: 12000,
    currency: 'TRY',
    monthly_amount: 3000,
    start_date: '2026-07-06',
    expense_item_id: null,
    status: 'active',
    created_at: '2026-07-06T00:00:00Z',
    updated_at: '2026-07-06T00:00:00Z',
    wishlist_items: {
      name: 'Kapadokya gezisi',
      kind: 'travel',
      target_date: '2026-11-06',
      is_family_visible: false,
    },
    ...overrides,
  }
}

describe('GoalPaceLine', () => {
  // the component reads the clock itself, so pin it: 15 Ağustos 2026 leaves
  // three months on the plan, i.e. 3.000₺ should be in the pot
  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 15))
  })
  afterAll(() => vi.useRealTimers())

  it('says nothing for a paused goal — a paused plan is not a broken promise', () => {
    const { container } = render(
      <GoalPaceLine goal={makeGoal({ status: 'paused' })} saved={0} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('says nothing once the goal is fully saved', () => {
    const { container } = render(
      <GoalPaceLine goal={makeGoal()} saved={12000} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('says nothing for a goal with no target date to be measured against', () => {
    const goal = makeGoal()
    const { container } = render(
      <GoalPaceLine
        goal={{
          ...goal,
          wishlist_items: { ...goal.wishlist_items!, target_date: null },
        }}
        saved={0}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('reads as on plan when the payments kept up', () => {
    render(<GoalPaceLine goal={makeGoal()} saved={12000 - 3000 * 3} />)
    expect(screen.getByText(/Planında/)).toBeInTheDocument()
  })

  it('names the shortfall when the goal is behind', () => {
    // nothing saved with two months left: 6.000 should be in the pot
    render(<GoalPaceLine goal={makeGoal()} saved={0} />)
    expect(screen.getByText(/geride/)).toBeInTheDocument()
  })
})
