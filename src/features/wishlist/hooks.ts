import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addContribution,
  convertWishlistItem,
  createWishlistItem,
  deleteWishlistItem,
  listContributions,
  listGoals,
  listWishlistItems,
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
