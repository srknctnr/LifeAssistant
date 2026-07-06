import { useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import { useCreateReminder } from '@/features/reminders/hooks'

export function ReminderForm({ onDone }: { onDone: () => void }) {
  const { session } = useAuth()
  const createReminder = useCreateReminder()
  const [title, setTitle] = useState('')
  const [dueOn, setDueOn] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!session) return

    try {
      await createReminder.mutateAsync({
        user_id: session.user.id,
        title: title.trim(),
        due_on: dueOn,
      })
      onDone()
    } catch {
      setError('Kaydedilemedi. Tekrar dener misin?')
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <TextField
        label="Ne hatırlatayım?"
        required
        placeholder="Kredi kartı ödemesi"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TextField
        label="Tarih"
        type="date"
        required
        value={dueOn}
        onChange={(e) => setDueOn(e.target.value)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        type="submit"
        isLoading={createReminder.isPending}
        className="w-full"
      >
        Kaydet
      </Button>
    </form>
  )
}
