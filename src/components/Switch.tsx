import { motion } from 'motion/react'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between py-1"
    >
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <span
        className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
          checked ? 'bg-indigo-600' : 'bg-zinc-200'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={`h-5 w-5 rounded-full bg-white shadow ${
            checked ? 'ml-auto' : ''
          }`}
        />
      </span>
    </button>
  )
}
