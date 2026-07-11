import { useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import type { LifeCategory } from '@/features/calendar/api'
import { useCreateCategory, useUpdateCategory } from '@/features/calendar/hooks'

interface CategoryFormProps {
  category?: LifeCategory
  onDone: () => void
}

export function CategoryForm({ category, onDone }: CategoryFormProps) {
  const { session } = useAuth()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const [name, setName] = useState(category?.name ?? '')
  const [emoji, setEmoji] = useState(category?.emoji ?? '')
  const [weeklyTarget, setWeeklyTarget] = useState(
    category?.weekly_target ? String(category.weekly_target) : '',
  )
  const [error, setError] = useState<string | null>(null)

  const isPending = createCategory.isPending || updateCategory.isPending

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    let target: number | null = null
    if (weeklyTarget.trim()) {
      target = Number.parseInt(weeklyTarget, 10)
      if (!target || target < 1 || target > 21) {
        setError('Haftalık hedef 1 ile 21 arasında olmalı.')
        return
      }
    }
    if (!session) return

    const values = {
      name: name.trim(),
      emoji: emoji.trim() || null,
      weekly_target: target,
    }

    try {
      if (category) {
        await updateCategory.mutateAsync({ id: category.id, patch: values })
      } else {
        await createCategory.mutateAsync({
          user_id: session.user.id,
          ...values,
        })
      }
      onDone()
    } catch {
      setError('Kaydedilemedi. Bağlantını kontrol edip tekrar dene.')
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <TextField
        label="Kategori adı"
        required
        placeholder="Spor, kitap, sosyalleşme…"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <TextField
        label="Emoji (isteğe bağlı)"
        placeholder="🏃"
        maxLength={4}
        value={emoji}
        onChange={(e) => setEmoji(e.target.value)}
      />
      <TextField
        label="Haftalık hedef (isteğe bağlı)"
        type="number"
        min={1}
        max={21}
        placeholder="3"
        value={weeklyTarget}
        onChange={(e) => setWeeklyTarget(e.target.value)}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button type="submit" isLoading={isPending} className="w-full">
        Kaydet
      </Button>
    </form>
  )
}
