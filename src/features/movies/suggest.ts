import { foldTr } from '@/features/assistant/tr-text'
import type { CuratedMovie } from '@/features/movies/curated-pool'
import type { GenreAffinity } from '@/features/movies/taste'

/**
 * Ranks the curated pool by the user's genre taste: each film scores the sum
 * of its genres' affinities. Ties keep the pool's original acclaim order, so
 * a fresh account simply sees the classics.
 *
 * `ownedTitles` must be folded with foldTr, the way this folds the pool.
 * Matching on title is the only option here — the pool is keyed by IMDb id
 * and `movies` has no imdb_id column to compare against. That holds up in
 * OMDb-only mode, where stored titles are the same English ones the pool
 * uses; a list built while a TMDB key was configured carries Turkish titles
 * and will not match. This surface only renders without a TMDB key, so the
 * mismatch stays theoretical, but it is a real limit and not a solved one.
 */
export function rankCurated(
  pool: CuratedMovie[],
  profile: GenreAffinity[],
  ownedTitles: Set<string>,
  limit = 10,
): CuratedMovie[] {
  // weight, not the raw score: a genre seen once should not outrank a genre
  // the user has actually shown a pattern in
  const affinity = new Map(profile.map((p) => [p.genre, p.weight]))

  return pool
    .filter((m) => !ownedTitles.has(foldTr(m.title)))
    .map((movie, index) => ({
      movie,
      index,
      score: movie.genres.reduce((sum, g) => sum + (affinity.get(g) ?? 0), 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.movie)
}
