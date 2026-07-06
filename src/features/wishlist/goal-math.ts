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
