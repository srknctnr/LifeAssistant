import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createCategory,
  createEntry,
  createEvent,
  deleteCategory,
  deleteEntry,
  deleteEvent,
  listCategories,
  listEntries,
  listEvents,
  updateCategory,
  updateEvent,
  type CalendarEvent,
  type CategoryEntry,
} from '@/features/calendar/api'
import { updateMovie } from '@/features/movies/api'
import type { TablesInsert, TablesUpdate } from '@/lib/database.types'

const categoriesKey = ['life_categories'] as const
const entriesKey = ['category_entries'] as const
const eventsKey = ['events'] as const
const moviesKey = ['movies'] as const // mirrors the private key in movies/hooks

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

export function useEvents() {
  return useQuery({ queryKey: eventsKey, queryFn: listEvents })
}

// A movie-kind event OWNS its movie's film günü: creating, moving or deleting
// the event writes movies.planned_for. The mirror is strictly one-way
// (events -> movies) — nothing ever writes an event from a movie and
// MovieForm's date goes read-only while a link exists, so no loop is possible.
export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: TablesInsert<'events'>) => {
      const event = await createEvent(input)
      if (event.kind === 'movie' && event.movie_id) {
        await updateMovie({
          id: event.movie_id,
          patch: { planned_for: event.starts_on },
        })
      }
      return event
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKey })
      queryClient.invalidateQueries({ queryKey: moviesKey })
    },
  })
}

interface UpdateEventInput {
  id: string
  patch: TablesUpdate<'events'>
  previousMovieId?: string | null // pass when the link may change or clear
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch, previousMovieId }: UpdateEventInput) => {
      const event = await updateEvent({ id, patch })
      if (previousMovieId && previousMovieId !== event.movie_id) {
        await updateMovie({
          id: previousMovieId,
          patch: { planned_for: null },
        })
      }
      if (event.kind === 'movie' && event.movie_id) {
        await updateMovie({
          id: event.movie_id,
          patch: { planned_for: event.starts_on },
        })
      }
      return event
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKey })
      queryClient.invalidateQueries({ queryKey: moviesKey })
    },
  })
}

// Takes the whole row so the movie link is released without an extra read
export function useDeleteEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (event: CalendarEvent) => {
      await deleteEvent(event.id)
      if (event.kind === 'movie' && event.movie_id) {
        await updateMovie({
          id: event.movie_id,
          patch: { planned_for: null },
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKey })
      queryClient.invalidateQueries({ queryKey: moviesKey })
    },
  })
}
