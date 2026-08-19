import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createTransaction, deleteTransaction } from '@/features/budget/api'
import { useTransactions } from '@/features/budget/hooks'
import type { ExpenseWithShares } from '@/features/expenses/api'

const transactionsKey = ['transactions'] as const

// Mirrors the caller's own share of a group expense into their personal
// spending log — the share, never the amount paid, so the personal budget
// tracks what they consumed. The link column makes it a toggle rather than a
// one-way copy, which is what keeps it from double counting.
export function useShareMirror(userId: string | undefined) {
  const transactions = useTransactions()
  const queryClient = useQueryClient()

  const mirrored = new Map(
    (transactions.data ?? [])
      .filter((t) => t.shared_expense_id)
      .map((t) => [t.shared_expense_id!, t]),
  )

  const write = useMutation({
    mutationFn: async (expense: ExpenseWithShares) => {
      if (!userId) throw new Error('Oturum bulunamadı')
      const share = expense.expense_shares.find((s) => s.user_id === userId)
      if (!share || share.amount <= 0) {
        throw new Error('Bu harcamada payın yok')
      }
      await createTransaction({
        user_id: userId,
        amount: share.amount,
        currency: expense.currency,
        category: expense.category,
        note: expense.title,
        spent_on: expense.spent_on,
        shared_expense_id: expense.id,
      })
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: transactionsKey }),
  })

  const undo = useMutation({
    mutationFn: async (expenseId: string) => {
      const existing = mirrored.get(expenseId)
      if (!existing) return
      await deleteTransaction(existing.id)
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: transactionsKey }),
  })

  return {
    isMirrored: (expenseId: string) => mirrored.has(expenseId),
    myShare: (expense: ExpenseWithShares) =>
      expense.expense_shares.find((s) => s.user_id === userId)?.amount ?? 0,
    write,
    undo,
    isPending: write.isPending || undo.isPending,
  }
}
