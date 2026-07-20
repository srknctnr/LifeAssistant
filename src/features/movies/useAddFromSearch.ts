import { useState } from 'react'

import { useAuth } from '@/features/auth/useAuth'
import { useMyShareMode } from '@/features/family/hooks'
import { resolveFamilyVisibility } from '@/features/family/share-utils'
import { useCreateMovie } from '@/features/movies/hooks'
import {
  fetchMovieExtras,
  type MovieSearchResult,
} from '@/features/movies/tmdb'

export function resultKey(result: MovieSearchResult): string {
  return result.imdbId ?? String(result.tmdbId)
}

// Shared add-to-watchlist flow for search results and the discover feed:
// resolves the IMDb rating + genres, then inserts the movie. With an 'ask'
// level share the caller shows a toggle bound to familyVisible.
export function useAddFromSearch() {
  const { session } = useAuth()
  const createMovie = useCreateMovie()
  const shareMode = useMyShareMode('movies')
  const [familyVisible, setFamilyVisible] = useState(false)
  const [addingKey, setAddingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function add(result: MovieSearchResult): Promise<boolean> {
    if (!session || addingKey !== null) return false
    setError(null)
    setAddingKey(resultKey(result))
    try {
      const extras = await fetchMovieExtras(result)
      await createMovie.mutateAsync({
        user_id: session.user.id,
        title: result.title,
        tmdb_id: result.tmdbId,
        poster_path: result.posterPath,
        release_date: result.releaseDate,
        external_rating: extras.rating,
        external_source: extras.source,
        genres: extras.genres,
        is_family_visible: resolveFamilyVisibility(shareMode, familyVisible),
      })
      return true
    } catch {
      setError('Eklenemedi — bu film zaten listende olabilir.')
      return false
    } finally {
      setAddingKey(null)
    }
  }

  return {
    add,
    addingKey,
    error,
    askMode: shareMode === 'ask',
    familyVisible,
    setFamilyVisible,
  }
}
