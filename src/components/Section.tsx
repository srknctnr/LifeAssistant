import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  onAdd?: () => void
  children: ReactNode
}

export function Section({ title, onAdd, children }: SectionProps) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {onAdd && (
          <button
            onClick={onAdd}
            aria-label={`${title} ekle`}
            className="rounded-full bg-indigo-50 p-2 text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
          >
            <Plus size={17} strokeWidth={2.4} />
          </button>
        )}
      </div>
      {children}
    </section>
  )
}
