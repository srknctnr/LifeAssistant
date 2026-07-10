import type { CuratedMovie } from '@/features/movies/curated-pool'
import type { GenreAffinity } from '@/features/movies/taste'

// Ranks the curated pool by the user's genre taste: each movie scores the
// sum of its genres' affinities. Ties keep the pool's original (acclaim)
// order, so a fresh account simply sees the classics. Titles already on the
// user's list are excluded.
export function rankCurated(
  pool: CuratedMovie[],
  profile: GenreAffinity[],
  ownedTitles: Set<string>,
  limit = 10,
): CuratedMovie[] {
  const affinity = new Map(profile.map((p) => [p.genre, p.score]))

  return pool
    .filter((m) => !ownedTitles.has(m.title.toLocaleLowerCase('tr')))
    .map((movie, index) => ({
      movie,
      index,
      score: movie.genres.reduce((sum, g) => sum + (affinity.get(g) ?? 0), 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.movie)
}
