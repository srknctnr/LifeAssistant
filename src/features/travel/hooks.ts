import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createTrip,
  createTripEvent,
  createTripItem,
  createTripWish,
  deleteTrip,
  deleteTripItem,
  listTripItems,
  listTrips,
  updateTrip,
  updateTripItem,
  updateTripEvent,
} from '@/features/travel/api'

const tripsKey = ['trips'] as const
const wishesKey = ['wishlist_items'] as const
const eventsKey = ['events'] as const
// A trip that is deleted or moved to another group drops its tag off that
// group's shared expenses (server side), so their cached rows are stale.
// Prefix only — the real keys carry a group id we do not know here.
const sharedExpensesKey = ['shared_expenses'] as const

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripsKey })
      queryClient.invalidateQueries({ queryKey: sharedExpensesKey })
    },
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
      queryClient.invalidateQueries({ queryKey: sharedExpensesKey })
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

export function useUpdateTripEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateTripEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventsKey }),
  })
}

export function useCreateTripEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTripEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventsKey }),
  })
}

const itemsKey = (tripId: string) => ['trip_items', tripId] as const

export function useTripItems(tripId: string) {
  return useQuery({
    queryKey: itemsKey(tripId),
    queryFn: () => listTripItems(tripId),
  })
}

function useItemsInvalidation(tripId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: itemsKey(tripId) })
}

export function useCreateTripItem(tripId: string) {
  const invalidate = useItemsInvalidation(tripId)
  return useMutation({ mutationFn: createTripItem, onSettled: invalidate })
}

export function useUpdateTripItem(tripId: string) {
  const invalidate = useItemsInvalidation(tripId)
  return useMutation({ mutationFn: updateTripItem, onSettled: invalidate })
}

export function useDeleteTripItem(tripId: string) {
  const invalidate = useItemsInvalidation(tripId)
  return useMutation({ mutationFn: deleteTripItem, onSettled: invalidate })
}
