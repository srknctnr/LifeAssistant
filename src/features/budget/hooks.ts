import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createExpenseItem,
  createIncome,
  deleteExpenseItem,
  deleteIncome,
  listExpenseItems,
  listIncomes,
} from '@/features/budget/api'

const incomesKey = ['incomes'] as const
const expenseItemsKey = ['expense_items'] as const

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

export function useDeleteExpenseItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteExpenseItem,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: expenseItemsKey }),
  })
}
