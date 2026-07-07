import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createMovie,
  deleteMovie,
  listMovies,
  updateMovie,
} from '@/features/movies/api'

const moviesKey = ['movies'] as const

export function useMovies() {
  return useQuery({ queryKey: moviesKey, queryFn: listMovies })
}

export function useCreateMovie() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createMovie,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: moviesKey }),
  })
}

export function useUpdateMovie() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateMovie,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: moviesKey }),
  })
}

export function useDeleteMovie() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteMovie,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: moviesKey }),
  })
}
