import { motion } from 'motion/react'

import { DAY_INITIALS } from '@/features/calendar/week-math'
import type { TripSpan } from '@/features/travel/trip-dates'
import { formatDate, toISODate, todayISO } from '@/lib/dates'

interface CalendarGridProps {
  weeks: Date[][] // one row in week view, five or six in month view
  selectedISO: string
  // month view dims cells outside this month; null in week view, where a week
  // legitimately spans two months and nothing should be dimmed
  anchorMonth: number | null
  busy: Set<string> // ISO days carrying at least one event
  // days covered by a trip, painted as one band running behind the numbers
  tripDays: Map<string, TripSpan>
  onSelect: (day: Date) => void
}

// Presentational grid shared by the week and month views. Both weekDays() and
// monthGrid() rows start on Monday, so DAY_INITIALS zips by plain index.
export function CalendarGrid({
  weeks,
  selectedISO,
  anchorMonth,
  busy,
  tripDays,
  onSelect,
}: CalendarGridProps) {
  const today = todayISO()

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7">
        {DAY_INITIALS.map((initial) => (
          <span
            key={initial}
            className="text-center text-[10px] font-medium text-zinc-400"
          >
            {initial}
          </span>
        ))}
      </div>

      {/* layout so the card springs between one and six rows */}
      <motion.div layout className="grid gap-y-1.5">
        {weeks.map((week) => (
          <div key={toISODate(week[0])} className="grid grid-cols-7">
            {week.map((day) => {
              const iso = toISODate(day)
              const isSelected = iso === selectedISO
              const isToday = iso === today
              const isBusy = busy.has(iso)
              const span = tripDays.get(iso)
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onSelect(day)}
                  aria-label={`${formatDate(day)}${isBusy ? ', planlı' : ''}${
                    span ? `, ${span.title}` : ''
                  }`}
                  aria-pressed={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  className={`relative mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-full transition-colors ${
                    isSelected
                      ? 'text-white'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  } ${
                    isToday && !isSelected
                      ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900'
                      : ''
                  } ${
                    anchorMonth !== null && day.getMonth() !== anchorMonth
                      ? 'opacity-35'
                      : ''
                  }`}
                >
                  {/* the band bleeds past the cell so consecutive days join
                      up, and only the real ends of the run get a round cap */}
                  {span && (
                    <span
                      aria-hidden
                      className={`absolute -inset-x-1 inset-y-0.5 bg-sky-100 dark:bg-sky-500/15 ${
                        span.isStart ? 'left-0 rounded-l-full' : ''
                      } ${span.isEnd ? 'right-0 rounded-r-full' : ''}`}
                    />
                  )}
                  {isSelected && (
                    <motion.span
                      layoutId="calendar-selected"
                      className="absolute inset-0 rounded-full bg-indigo-600"
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 34,
                      }}
                    />
                  )}
                  <span className="relative text-sm font-medium tabular-nums">
                    {day.getDate()}
                  </span>
                  {isBusy ? (
                    <span
                      aria-hidden
                      className={`relative mt-0.5 h-1 w-1 rounded-full ${
                        isSelected ? 'bg-white/70' : 'bg-indigo-500'
                      }`}
                    />
                  ) : (
                    span?.isStart && (
                      <span
                        aria-hidden
                        className="relative -mb-0.5 text-[9px] leading-none"
                      >
                        {span.emoji}
                      </span>
                    )
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </motion.div>
    </div>
  )
}
