import { fromMinor, toMinor } from '@/features/expenses/split-math'

// Calendar months from `from` until `target`; a day-of-month that hasn't
// been reached yet doesn't count as a full month. Minimum 1 so a goal always
// gets at least one saving month.
export function monthsUntil(target: Date, from: Date = new Date()): number {
  const months =
    (target.getFullYear() - from.getFullYear()) * 12 +
    (target.getMonth() - from.getMonth())
  const adjusted = target.getDate() >= from.getDate() ? months : months - 1
  return Math.max(1, adjusted)
}

// Rounds up to a whole lira so the goal is reached on or before the target date
export function suggestedMonthlyAmount(
  targetAmount: number,
  months: number,
): number {
  return Math.ceil(targetAmount / Math.max(1, months))
}

export interface GoalPace {
  // what the plan says should be in the pot by now, never above the target
  expectedSaved: number
  // saved minus expected: negative means behind, positive means ahead
  delta: number
  // whole months of shortfall, 0 when on plan or ahead
  monthsBehind: number
  // whole months of surplus, 0 when on plan or behind
  monthsAhead: number
}

// Whole calendar months of saving still ahead of you. Counted in months, not
// days, because that is the unit a plan is actually paid in — the reminder
// falls due at the END of each month, so the month you are standing in is
// still a month you can pay into, and only a month that has fully passed is
// gone. Never negative: once the target month arrives, nothing is left.
function monthsLeft(target: Date, today: Date): number {
  return Math.max(
    0,
    (target.getFullYear() - today.getFullYear()) * 12 +
      (target.getMonth() - today.getMonth()),
  )
}

/**
 * Is this goal still on its own plan?
 *
 * The progress bar answers "how far", never "am I on time" — two goals at 40%
 * are not the same goal if one is due next month and the other next year.
 *
 * Read it backwards from the finish line rather than forwards from the start:
 * by now you should hold everything the months still ahead of you cannot
 * cover. That is what makes it stay true when a plan CHANGES. Counting
 * forwards from a start date bakes an old rate into months already paid, so
 * re-planning would charge the new monthly amount retroactively and tell a
 * user who has just corrected their plan that they are further behind than
 * before. Backwards from the target, applying a preset lands you exactly on
 * plan — which is what accepting a new plan should mean.
 *
 * It also agrees with the reminder, which falls due at the end of the month:
 * a goal converted today owes nothing yet, and owes its first payment once
 * the opening month has passed.
 *
 * Everything is compared in kuruş — numeric(12,2) reaches us as floats, and a
 * hundredth of a lira of dust must not read as "1 ay geridesin". Returns null
 * when there is no plan to measure: no target date, or no monthly amount.
 */
export function goalPace(params: {
  targetDate: string | null | undefined
  monthlyAmount: number
  targetAmount: number
  saved: number
  today?: Date
}): GoalPace | null {
  const { targetDate, monthlyAmount, targetAmount, saved } = params
  const today = params.today ?? new Date()
  const monthlyMinor = toMinor(monthlyAmount)
  const targetMinor = toMinor(targetAmount)
  const savedMinor = toMinor(saved)

  if (!targetDate || monthlyMinor <= 0) return null

  const left = monthsLeft(new Date(targetDate), today)
  // what the remaining months cannot cover, you should already be holding
  const expectedMinor = Math.max(0, targetMinor - monthlyMinor * left)
  const deltaMinor = savedMinor - expectedMinor

  return {
    expectedSaved: fromMinor(expectedMinor),
    delta: fromMinor(deltaMinor),
    monthsBehind: deltaMinor < 0 ? Math.ceil(-deltaMinor / monthlyMinor) : 0,
    monthsAhead: deltaMinor > 0 ? Math.floor(deltaMinor / monthlyMinor) : 0,
  }
}
