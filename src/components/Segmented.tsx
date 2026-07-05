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
    <div className="flex rounded-xl bg-zinc-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`relative flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            value === option.value ? 'text-zinc-900' : 'text-zinc-500'
          }`}
        >
          {value === option.value && (
            <motion.span
              layoutId={`segmented-${id}`}
              className="absolute inset-0 rounded-lg bg-white shadow-sm"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative">{option.label}</span>
        </button>
      ))}
    </div>
  )
}
