import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addContribution,
  completeGoal,
  convertWishlistItem,
  createWishlistItem,
  deleteContribution,
  deleteGoal,
  deleteWishlistItem,
  listContributions,
  listGoals,
  listWishlistItems,
  setGoalPaused,
  updateWishlistItem,
} from '@/features/wishlist/api'

const wishlistKey = ['wishlist_items'] as const
const goalsKey = ['savings_goals'] as const
const contributionsKey = ['savings_contributions'] as const

export function useWishlistItems() {
  return useQuery({ queryKey: wishlistKey, queryFn: listWishlistItems })
}

export function useCreateWishlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createWishlistItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wishlistKey }),
  })
}

export function useUpdateWishlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateWishlistItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wishlistKey }),
  })
}

export function useDeleteWishlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteWishlistItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wishlistKey }),
  })
}

export function useGoals() {
  return useQuery({ queryKey: goalsKey, queryFn: listGoals })
}

export function useContributions() {
  return useQuery({ queryKey: contributionsKey, queryFn: listContributions })
}

export function useAddContribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addContribution,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: contributionsKey }),
  })
}

export function useDeleteContribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteContribution,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: contributionsKey }),
  })
}

function useGoalMutation<TArgs>(mutationFn: (args: TArgs) => Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKey })
      queryClient.invalidateQueries({ queryKey: wishlistKey })
      queryClient.invalidateQueries({ queryKey: contributionsKey })
      // goal actions also touch the linked budget expense item
      queryClient.invalidateQueries({ queryKey: ['expense_items'] })
    },
  })
}

export function useSetGoalPaused() {
  return useGoalMutation(setGoalPaused)
}

export function useCompleteGoal() {
  return useGoalMutation(completeGoal)
}

export function useDeleteGoal() {
  return useGoalMutation(deleteGoal)
}

export function useConvertWishlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: convertWishlistItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKey })
      queryClient.invalidateQueries({ queryKey: goalsKey })
      // the conversion also writes a budget expense item
      queryClient.invalidateQueries({ queryKey: ['expense_items'] })
    },
  })
}
