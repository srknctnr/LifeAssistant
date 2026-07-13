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

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionsKey }),
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateTransaction,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionsKey }),
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: transactionsKey }),
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
