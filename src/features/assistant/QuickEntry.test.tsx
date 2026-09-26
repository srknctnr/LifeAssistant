import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const eventInsert = vi.fn()
const expenseInsert = vi.fn()
const txInsert = vi.fn()

// The parser has its own tests; this file is about what the form does with a
// draft, so the draft is fixed.
vi.mock('@/features/assistant/parse-entry', () => ({
  parseEntry: (text: string) =>
    text.trim()
      ? {
          title: 'Sinemaya gidiyoruz',
          dateISO: '2026-10-02',
          time: null,
          amount: 600,
          category: 'Eğlence',
          past: false,
          actions: ['movie-night', 'plan-expense'],
          matched: [],
        }
      : null,
}))
vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' } } }),
}))
let shareMode: string | null = null
vi.mock('@/features/family/hooks', () => ({
  useMyShareMode: () => shareMode,
}))
vi.mock('@/features/budget/CategoryPicker', () => ({
  CategoryPicker: () => null,
}))
vi.mock('@/features/calendar/hooks', () => ({
  useCreateEvent: () => ({ isPending: false, mutateAsync: eventInsert }),
}))
vi.mock('@/features/budget/hooks', () => ({
  useCreateTransaction: () => ({ isPending: false, mutateAsync: txInsert }),
  useCreateExpenseItem: () => ({
    isPending: false,
    mutateAsync: expenseInsert,
  }),
}))

const { QuickEntry } = await import('@/features/assistant/QuickEntry')

async function typeSentence(user: ReturnType<typeof userEvent.setup>) {
  render(<QuickEntry onDone={() => {}} />)
  await user.type(screen.getByLabelText(/Bir cümleyle yaz/), 'cuma sinemaya')
}

const save = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Kaydet' }))

beforeEach(() => {
  shareMode = null
  eventInsert.mockReset()
  expenseInsert.mockReset()
  txInsert.mockReset()
})

describe('QuickEntry', () => {
  it('writes every ticked action once', async () => {
    const user = userEvent.setup()
    eventInsert.mockResolvedValue({})
    expenseInsert.mockResolvedValue({})

    await typeSentence(user)
    await save(user)

    expect(eventInsert).toHaveBeenCalledTimes(1)
    expect(expenseInsert).toHaveBeenCalledTimes(1)
  })

  // The calendar entry is already on the calendar. Retrying the half that
  // failed must not put a second copy there.
  it('does not re-write the half that already succeeded', async () => {
    const user = userEvent.setup()
    eventInsert.mockResolvedValue({})
    expenseInsert.mockRejectedValueOnce(new Error('boom'))

    await typeSentence(user)
    await save(user)
    expect(eventInsert).toHaveBeenCalledTimes(1)

    expenseInsert.mockResolvedValue({})
    await save(user)

    expect(eventInsert).toHaveBeenCalledTimes(1)
    expect(expenseInsert).toHaveBeenCalledTimes(2)
  })

  // Editing the sentence used to clear the memory of what had been saved,
  // and the next save duplicated it.
  it('remembers what it saved even after the sentence is edited', async () => {
    const user = userEvent.setup()
    eventInsert.mockResolvedValue({})
    expenseInsert.mockRejectedValueOnce(new Error('boom'))

    await typeSentence(user)
    await save(user)
    expect(eventInsert).toHaveBeenCalledTimes(1)

    expenseInsert.mockResolvedValue({})
    await user.type(screen.getByLabelText(/Bir cümleyle yaz/), ' gidiyoruz')
    await save(user)

    expect(eventInsert).toHaveBeenCalledTimes(1)
  })

  it('says which half landed when the other one does not', async () => {
    const user = userEvent.setup()
    eventInsert.mockResolvedValue({})
    expenseInsert.mockRejectedValue(new Error('boom'))

    await typeSentence(user)
    await save(user)

    expect(screen.getByText(/kaydedildi/)).toBeTruthy()
  })
})

describe('QuickEntry sharing', () => {
  // Every other form asks this at the "Sor" level. Leaving it out meant
  // quick entry could only ever write a private record.
  it('asks who the record is for when the share level says ask', async () => {
    const user = userEvent.setup()
    shareMode = 'ask'
    eventInsert.mockResolvedValue({})
    expenseInsert.mockResolvedValue({})

    await typeSentence(user)
    expect(screen.queryByText(/Kimin için/)).not.toBeNull()
  })

  it('does not ask when the share level already decides', async () => {
    const user = userEvent.setup()
    shareMode = 'full'
    await typeSentence(user)
    expect(screen.queryByText(/Kimin için/)).toBeNull()
  })

  // At "Tam" the other forms sync automatically; this must too, or a family
  // sees every record except the ones added the fastest way.
  it('shares automatically at the full level', async () => {
    const user = userEvent.setup()
    shareMode = 'full'
    eventInsert.mockResolvedValue({})
    expenseInsert.mockResolvedValue({})

    await typeSentence(user)
    await save(user)

    expect(eventInsert.mock.calls[0][0].is_family_visible).toBe(true)
    expect(expenseInsert.mock.calls[0][0].is_family_visible).toBe(true)
  })
})
