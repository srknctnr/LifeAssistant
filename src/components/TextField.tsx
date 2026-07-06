import { useId, type InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function TextField({ label, id, ...props }: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>
      <input
        id={inputId}
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
        {...props}
      />
    </div>
  )
}
