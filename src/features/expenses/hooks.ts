import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createSettlement,
  deleteExpense,
  deleteSettlement,
  listGroupExpenses,
  listSettlements,
  saveExpense,
} from '@/features/expenses/api'

// Group-scoped keys: unlike the personal modules, the same user reads a
// different ledger per group, so the id belongs in the key
const expensesKey = (familyId: string) => ['shared_expenses', familyId] as const
const settlementsKey = (familyId: string) =>
  ['expense_settlements', familyId] as const

export function useGroupExpenses(familyId: string | undefined) {
  return useQuery({
    queryKey: expensesKey(familyId ?? ''),
    queryFn: () => listGroupExpenses(familyId!),
    enabled: Boolean(familyId),
  })
}

export function useSettlements(familyId: string | undefined) {
  return useQuery({
    queryKey: settlementsKey(familyId ?? ''),
    queryFn: () => listSettlements(familyId!),
    enabled: Boolean(familyId),
  })
}

// Every balance depends on both lists, so each mutation refreshes both
function useLedgerInvalidation(familyId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: expensesKey(familyId) })
    queryClient.invalidateQueries({ queryKey: settlementsKey(familyId) })
  }
}

export function useSaveExpense(familyId: string) {
  const invalidate = useLedgerInvalidation(familyId)
  return useMutation({ mutationFn: saveExpense, onSettled: invalidate })
}

export function useDeleteExpense(familyId: string) {
  const invalidate = useLedgerInvalidation(familyId)
  return useMutation({ mutationFn: deleteExpense, onSettled: invalidate })
}

export function useCreateSettlement(familyId: string) {
  const invalidate = useLedgerInvalidation(familyId)
  return useMutation({ mutationFn: createSettlement, onSettled: invalidate })
}

export function useDeleteSettlement(familyId: string) {
  const invalidate = useLedgerInvalidation(familyId)
  return useMutation({ mutationFn: deleteSettlement, onSettled: invalidate })
}
