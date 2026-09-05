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

// Full calendar months from `start` to `today`, using monthsUntil's day rule
// inverted: the day of the month has to come round again before another month
// counts. A goal started on the 15th is not late on the 10th of the next month.
function elapsedMonths(start: Date, today: Date): number {
  const months =
    (today.getFullYear() - start.getFullYear()) * 12 +
    (today.getMonth() - start.getMonth())
  const adjusted = today.getDate() >= start.getDate() ? months : months - 1
  return Math.max(0, adjusted)
}

/**
 * Is this goal still on its own plan?
 *
 * The conversion writes start_date and a monthly amount and then nothing ever
 * reads them again — the card shows a percentage, which answers "how far" but
 * never "am I on time". Two goals at 40% are not the same goal if one started
 * in January and the other last week.
 *
 * The first contribution is due in the starting month itself (the budget line
 * starts that month), so the plan expects elapsed + 1 payments. Everything is
 * compared in kuruş: numeric(12,2) values reach us as floats, and a hundredth
 * of a lira of float dust must not read as "1 ay geridesin".
 */
export function goalPace(params: {
  startDate: string
  monthlyAmount: number
  targetAmount: number
  saved: number
  today?: Date
}): GoalPace {
  const { startDate, monthlyAmount, targetAmount, saved } = params
  const today = params.today ?? new Date()
  const monthlyMinor = toMinor(monthlyAmount)
  const targetMinor = toMinor(targetAmount)
  const savedMinor = toMinor(saved)

  // a goal with no monthly plan can't be behind one
  if (monthlyMinor <= 0) {
    return {
      expectedSaved: 0,
      delta: fromMinor(savedMinor),
      monthsBehind: 0,
      monthsAhead: 0,
    }
  }

  const due = elapsedMonths(new Date(startDate), today) + 1
  // clamped at the target so a finished goal never reads "geride"
  const expectedMinor = Math.min(targetMinor, monthlyMinor * due)
  const deltaMinor = savedMinor - expectedMinor

  return {
    expectedSaved: fromMinor(expectedMinor),
    delta: fromMinor(deltaMinor),
    monthsBehind: deltaMinor < 0 ? Math.ceil(-deltaMinor / monthlyMinor) : 0,
    monthsAhead: deltaMinor > 0 ? Math.floor(deltaMinor / monthlyMinor) : 0,
  }
}
