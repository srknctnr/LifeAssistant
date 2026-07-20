import { Users } from 'lucide-react'

import { Segmented } from '@/components/Segmented'

// Rendered in add/edit forms only when the module share level is 'ask':
// the user decides per record whether the family sees it
export function FamilyVisibilityField({
  value,
  onChange,
}: {
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="space-y-1.5">
      <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        <Users size={14} className="text-indigo-500" /> Kimin için?
      </span>
      <Segmented<'me' | 'family'>
        options={[
          { value: 'me', label: 'Sadece ben' },
          { value: 'family', label: 'Aile ile' },
        ]}
        value={value ? 'family' : 'me'}
        onChange={(next) => onChange(next === 'family')}
      />
    </div>
  )
}

// Compact inline variant for quick-add lists (movie search, discover feed)
export function FamilyVisibilityToggle({
  value,
  onChange,
}: {
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3.5 py-2 dark:bg-zinc-800/60">
      <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <Users size={13} className="text-indigo-500" /> Eklenenler kimin için?
      </span>
      <div className="flex gap-1">
        {(
          [
            { shared: false, label: 'Sadece ben' },
            { shared: true, label: 'Aile ile' },
          ] as const
        ).map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onChange(option.shared)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              value === option.shared
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
