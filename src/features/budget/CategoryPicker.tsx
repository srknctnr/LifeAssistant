import { Plus } from 'lucide-react'
import { useState } from 'react'

import { useAuth } from '@/features/auth/useAuth'
import { mergeCategoryNames } from '@/features/budget/categories'
import {
  useBudgetCategories,
  useCreateBudgetCategory,
  useExpenseItems,
  useTransactions,
} from '@/features/budget/hooks'

interface CategoryPickerProps {
  value: string
  onChange: (value: string) => void
}

// Chip-based category selection: built-in defaults + the user's custom
// categories + anything already used on records. "+ Yeni" persists a new one.
export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { session } = useAuth()
  const categories = useBudgetCategories()
  const expenses = useExpenseItems()
  const transactions = useTransactions()
  const createCategory = useCreateBudgetCategory()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  const names = mergeCategoryNames(
    (categories.data ?? []).map((c) => c.name),
    [
      ...(expenses.data ?? []).map((e) => e.category),
      ...(transactions.data ?? []).map((t) => t.category),
    ],
  )

  async function handleAdd() {
    const name = newName.trim()
    if (!name || !session) return
    try {
      await createCategory.mutateAsync({ user_id: session.user.id, name })
    } catch {
      // duplicate names are fine — just select the existing one
    }
    onChange(name)
    setNewName('')
    setAdding(false)
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Kategori
      </span>
      <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
        <PickerChip
          label="Yok"
          active={value === ''}
          onClick={() => onChange('')}
        />
        {names.map((name) => (
          <PickerChip
            key={name}
            label={name}
            active={value === name}
            onClick={() => onChange(value === name ? '' : name)}
          />
        ))}
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
          >
            <Plus size={12} strokeWidth={2.4} /> Yeni
          </button>
        )}
      </div>
      {adding && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleAdd()
              }
            }}
            placeholder="Yeni kategori adı"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
          />
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={createCategory.isPending || !newName.trim()}
            className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
          >
            Ekle
          </button>
        </div>
      )}
    </div>
  )
}

function PickerChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
      }`}
    >
      {label}
    </button>
  )
}
