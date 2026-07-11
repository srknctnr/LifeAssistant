import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createCategory,
  createEntry,
  deleteCategory,
  deleteEntry,
  listCategories,
  listEntries,
  updateCategory,
  type CategoryEntry,
} from '@/features/calendar/api'

const categoriesKey = ['life_categories'] as const
const entriesKey = ['category_entries'] as const

export function useLifeCategories() {
  return useQuery({ queryKey: categoriesKey, queryFn: listCategories })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKey }),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKey }),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesKey })
      queryClient.invalidateQueries({ queryKey: entriesKey })
    },
  })
}

export function useCategoryEntries() {
  return useQuery({ queryKey: entriesKey, queryFn: listEntries })
}

interface ToggleInput {
  userId: string
  categoryId: string
  date: string
  existing: CategoryEntry | undefined
}

// A day toggles between done and not-done: delete the entry if it exists,
// create it otherwise
export function useToggleEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, categoryId, date, existing }: ToggleInput) => {
      if (existing) {
        await deleteEntry(existing.id)
      } else {
        await createEntry({
          user_id: userId,
          category_id: categoryId,
          done_on: date,
        })
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: entriesKey }),
  })
}
