// Distills ratings into a genre taste profile. 4-5 star films boost their
// genres, 1-2 star films penalize them.

interface RatedMovie {
  status: string
  rating: number | null
  genres: string[]
}

export interface GenreAffinity {
  genre: string
  /** raw sum of (rating - 3); keeps the original ordering meaning */
  score: number
  count: number
  /**
   * The same signal in [-1, 1], damped by how little we know.
   *
   * The raw sum rewards volume: five indifferent 3.5s in one genre would
   * outrank a single 5-star in another, which is the opposite of taste. This
   * is the mean pulled toward zero by a constant, so one great film counts
   * for something without pretending to be a pattern.
   */
  weight: number
}

// How many ratings a genre needs before its mean is trusted at close to full
// strength. Two is deliberately small: most people rate a handful of films.
const CONFIDENCE = 2

// Below this many rated films there is no taste to speak of, only noise.
export const TASTE_MIN_RATED = 3

export function genreTasteProfile(movies: RatedMovie[]): GenreAffinity[] {
  const totals = new Map<string, { score: number; count: number }>()

  for (const movie of movies) {
    // A rating can only be set by marking a film watched, so a rated row was
    // watched even if it has since been put back on the list. Ignoring those
    // would quietly drop films the user told us most about.
    if (!movie.rating) continue
    for (const genre of movie.genres) {
      const entry = totals.get(genre) ?? { score: 0, count: 0 }
      entry.score += movie.rating - 3
      entry.count += 1
      totals.set(genre, entry)
    }
  }

  return [...totals.entries()]
    .map(([genre, { score, count }]) => ({
      genre,
      score,
      count,
      // (mean of score) × (confidence in that mean), then scaled by the 2
      // points that separate a 5-star from neutral
      weight: (score / count) * (count / (count + CONFIDENCE)) * 0.5,
    }))
    .sort((a, b) => b.weight - a.weight || b.count - a.count)
}

/** how many films carry a rating at all — the profile's whole evidence base */
export function ratedMovieCount(movies: RatedMovie[]): number {
  return movies.filter((m) => m.rating).length
}

/**
 * True when there is not enough rated history to claim a taste.
 *
 * Recommending "based on your taste" off one rating is a claim the data does
 * not support, and the user can tell — which costs the feature its credit on
 * the first screen they see.
 */
export function tasteIsThin(movies: RatedMovie[]): boolean {
  return ratedMovieCount(movies) < TASTE_MIN_RATED
}

/** the genres worth steering towards, strongest first */
export function likedGenres(profile: GenreAffinity[], limit = 3): string[] {
  return profile
    .filter((g) => g.weight > 0)
    .slice(0, limit)
    .map((g) => g.genre)
}

/** the genres worth steering away from, strongest dislike first */
export function dislikedGenres(profile: GenreAffinity[], limit = 2): string[] {
  return profile
    .filter((g) => g.weight < 0)
    .slice(-limit)
    .reverse()
    .map((g) => g.genre)
}
