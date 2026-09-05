import type { GoalWithWish } from '@/features/wishlist/api'
import { goalPace } from '@/features/wishlist/goal-math'
import { formatMoney } from '@/lib/money'

// The percentage bar answers "how far", never "am I on time" — two goals at
// 40% are not the same goal if one started in January and the other last week.
// This is the one line that says which. Paused and finished goals say nothing:
// a paused plan is not a broken promise, and a reached goal cannot be late.
export function GoalPaceLine({
  goal,
  saved,
  className = '',
}: {
  goal: GoalWithWish
  saved: number
  className?: string
}) {
  if (goal.status !== 'active') return null
  if (saved >= goal.target_amount) return null

  const pace = goalPace({
    targetDate: goal.wishlist_items?.target_date,
    monthlyAmount: goal.monthly_amount,
    targetAmount: goal.target_amount,
    saved,
  })

  // an undated goal has no schedule to be on or off
  if (!pace) return null

  if (pace.monthsBehind > 0) {
    return (
      <p
        className={`text-xs font-medium text-amber-600 dark:text-amber-400 ${className}`}
      >
        {formatMoney(-pace.delta, goal.currency)} geride · {pace.monthsBehind}{' '}
        ay
      </p>
    )
  }

  if (pace.monthsAhead > 0) {
    return (
      <p
        className={`text-xs font-medium text-emerald-600 dark:text-emerald-400 ${className}`}
      >
        {pace.monthsAhead} ay öndesin
      </p>
    )
  }

  return (
    <p className={`text-xs text-zinc-400 ${className}`}>Planında gidiyorsun</p>
  )
}
