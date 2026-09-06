import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createTrip,
  createTripEvent,
  createTripItem,
  createTripWish,
  deleteTrip,
  addPackingItems,
  deletePackingItem,
  deleteTripItem,
  listAllPackingItems,
  listPackingItems,
  setPacked,
  updatePackingItem,
  type PackingItemWithChecks,
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

const packingKey = (tripId: string) => ['trip_packing', tripId] as const

export function usePackingItems(tripId: string) {
  return useQuery({
    queryKey: packingKey(tripId),
    queryFn: () => listPackingItems(tripId),
  })
}

// The prefix, not one trip's key: the pool "copy a previous list" reads from
// lives under ['trip_packing', 'all'] and goes stale on the very same writes.
function usePackingInvalidation() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['trip_packing'] })
}

export function useAddPackingItems() {
  const invalidate = usePackingInvalidation()
  return useMutation({ mutationFn: addPackingItems, onSettled: invalidate })
}

export function useUpdatePackingItem() {
  const invalidate = usePackingInvalidation()
  return useMutation({ mutationFn: updatePackingItem, onSettled: invalidate })
}

export function useDeletePackingItem() {
  const invalidate = usePackingInvalidation()
  return useMutation({ mutationFn: deletePackingItem, onSettled: invalidate })
}

// A tick has to land under your thumb, not after a round trip — the list is
// used standing over an open suitcase, often on a bad connection. onSettled
// still reconciles, and onError puts the box back if the write was refused.
export function useSetPacked(tripId: string, userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: setPacked,
    onMutate: async (variables: {
      itemId: string
      tripId: string
      packed: boolean
    }) => {
      if (!userId) return
      await queryClient.cancelQueries({ queryKey: packingKey(tripId) })
      const previous = queryClient.getQueryData(packingKey(tripId))
      queryClient.setQueryData(
        packingKey(tripId),
        (rows: PackingItemWithChecks[] | undefined) =>
          rows?.map((row) =>
            row.id === variables.itemId
              ? {
                  ...row,
                  trip_packing_checks: variables.packed
                    ? [
                        ...row.trip_packing_checks,
                        {
                          user_id: userId,
                          checked_at: new Date().toISOString(),
                        },
                      ]
                    : row.trip_packing_checks.filter(
                        (c) => c.user_id !== userId,
                      ),
                }
              : row,
          ),
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(packingKey(tripId), context.previous)
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: packingKey(tripId) }),
  })
}

// Not scoped to a trip: this is the pool "copy a previous list" chooses from,
// and it is the same rows RLS would hand over trip by trip.
export function useAllPackingItems() {
  return useQuery({
    queryKey: ['trip_packing', 'all'] as const,
    queryFn: listAllPackingItems,
  })
}
