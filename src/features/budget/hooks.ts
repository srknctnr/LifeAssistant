import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createBudgetCategory,
  createExpenseItem,
  createIncome,
  createTransaction,
  listBudgetCategories,
  deleteExpenseItem,
  deleteIncome,
  deleteTransaction,
  listExpenseItems,
  listIncomes,
  listTransactions,
  updateExpenseItem,
  updateIncome,
  updateTransaction,
} from '@/features/budget/api'

const incomesKey = ['incomes'] as const
const expenseItemsKey = ['expense_items'] as const
const transactionsKey = ['transactions'] as const
const budgetCategoriesKey = ['budget_categories'] as const

export function useIncomes() {
  return useQuery({ queryKey: incomesKey, queryFn: listIncomes })
}

export function useCreateIncome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createIncome,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: incomesKey }),
  })
}

export function useUpdateIncome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateIncome,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: incomesKey }),
  })
}

export function useDeleteIncome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteIncome,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: incomesKey }),
  })
}

export function useExpenseItems() {
  return useQuery({ queryKey: expenseItemsKey, queryFn: listExpenseItems })
}

export function useCreateExpenseItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createExpenseItem,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: expenseItemsKey }),
  })
}

export function useUpdateExpenseItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateExpenseItem,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: expenseItemsKey }),
  })
}

export function useBudgetCategories() {
  return useQuery({
    queryKey: budgetCategoriesKey,
    queryFn: listBudgetCategories,
  })
}

export function useCreateBudgetCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createBudgetCategory,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: budgetCategoriesKey }),
  })
}

export function useTransactions() {
  return useQuery({ queryKey: transactionsKey, queryFn: listTransactions })
}

// A spend of mine is also a row in the group space: the family surfaces read
// their own per-member keys (space-data.ts), which nothing else invalidates.
// Now that a spend can be logged from any route — including while standing on
// the group page — those have to be refreshed too, or the group card keeps
// showing a total that the personal card has already moved past.
function useTransactionInvalidation() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: transactionsKey })
    queryClient.invalidateQueries({ queryKey: ['member-transactions'] })
    queryClient.invalidateQueries({ queryKey: ['member-budget-summary'] })
  }
}

export function useCreateTransaction() {
  const invalidate = useTransactionInvalidation()
  return useMutation({ mutationFn: createTransaction, onSuccess: invalidate })
}

export function useUpdateTransaction() {
  const invalidate = useTransactionInvalidation()
  return useMutation({ mutationFn: updateTransaction, onSuccess: invalidate })
}

export function useDeleteTransaction() {
  const invalidate = useTransactionInvalidation()
  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: invalidate,
  })
}

export function useDeleteExpenseItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteExpenseItem,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: expenseItemsKey }),
  })
}
