import { motion } from 'motion/react'
import { useId } from 'react'

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  const id = useId()

  return (
    <div className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`relative flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            value === option.value
              ? 'text-zinc-900 dark:text-zinc-50'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          {value === option.value && (
            <motion.span
              layoutId={`segmented-${id}`}
              className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-zinc-700"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative">{option.label}</span>
        </button>
      ))}
    </div>
  )
}
