import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createTrip,
  createTripEvent,
  createTripWish,
  deleteTrip,
  listTrips,
  updateTrip,
} from '@/features/travel/api'

const tripsKey = ['trips'] as const
const wishesKey = ['wishlist_items'] as const
const eventsKey = ['events'] as const

export function useTrips() {
  return useQuery({ queryKey: tripsKey, queryFn: listTrips })
}

export function useCreateTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTrip,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripsKey }),
  })
}

export function useUpdateTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateTrip,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripsKey }),
  })
}

// Deleting a trip only clears the pointers (ON DELETE SET NULL): the savings
// goal, its budget line and the calendar event all survive on purpose —
// nobody's budget commitment should vanish because a plan was cancelled.
export function useDeleteTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripsKey })
      queryClient.invalidateQueries({ queryKey: wishesKey })
      queryClient.invalidateQueries({ queryKey: eventsKey })
    },
  })
}

export function useCreateTripWish() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTripWish,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wishesKey }),
  })
}

export function useCreateTripEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTripEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventsKey }),
  })
}
