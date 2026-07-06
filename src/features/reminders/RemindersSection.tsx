import { Bell, Check, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { EmptyState } from '@/components/EmptyState'
import { Section } from '@/components/Section'
import { Sheet } from '@/components/Sheet'
import { SkeletonRows } from '@/components/SkeletonRows'
import type { Reminder } from '@/features/reminders/api'
import { ReminderForm } from '@/features/reminders/ReminderForm'
import { useReminders, useSetReminderStatus } from '@/features/reminders/hooks'
import { formatDate } from '@/lib/dates'

function todayISO(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd}`
}

export function RemindersSection() {
  const reminders = useReminders()
  const [addOpen, setAddOpen] = useState(false)

  const pending = (reminders.data ?? []).filter((r) => r.status === 'pending')

  return (
    <>
      <Section title="Hatırlatmalar" onAdd={() => setAddOpen(true)}>
        {reminders.isPending ? (
          <SkeletonRows count={1} />
        ) : pending.length === 0 ? (
          <EmptyState text="Bekleyen hatırlatma yok. 🙌" />
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {pending.map((reminder) => (
                <ReminderRow key={reminder.id} reminder={reminder} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Section>

      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Hatırlatma ekle"
      >
        <ReminderForm onDone={() => setAddOpen(false)} />
      </Sheet>
    </>
  )
}

function ReminderRow({ reminder }: { reminder: Reminder }) {
  const setStatus = useSetReminderStatus()
  const isOverdue = reminder.due_on < todayISO()

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60"
    >
      <span
        className={`rounded-xl p-2.5 ${
          isOverdue ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
        }`}
      >
        <Bell size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{reminder.title}</p>
        <p
          className={`text-xs ${isOverdue ? 'font-medium text-red-500' : 'text-zinc-400'}`}
        >
          {formatDate(reminder.due_on)}
          {isOverdue ? ' · gecikti' : ''}
        </p>
      </div>
      <button
        aria-label={`${reminder.title} hatırlatmasını tamamla`}
        onClick={() => setStatus.mutate({ id: reminder.id, status: 'done' })}
        className="rounded-full p-2 text-zinc-300 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
      >
        <Check size={17} strokeWidth={2.4} />
      </button>
      <button
        aria-label={`${reminder.title} hatırlatmasını yok say`}
        onClick={() =>
          setStatus.mutate({ id: reminder.id, status: 'dismissed' })
        }
        className="-ml-1 rounded-full p-2 text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-500"
      >
        <X size={17} />
      </button>
    </motion.li>
  )
}
