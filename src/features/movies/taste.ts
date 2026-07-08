// Foundation for the recommendation slice (ready-made TMDB recommendations
// or an AI layer later): distills watched ratings into a genre taste
// profile. 4-5 star films boost their genres, 1-2 star films penalize them.

interface RatedMovie {
  status: string
  rating: number | null
  genres: string[]
}

export interface GenreAffinity {
  genre: string
  score: number
  count: number
}

export function genreTasteProfile(movies: RatedMovie[]): GenreAffinity[] {
  const totals = new Map<string, { score: number; count: number }>()

  for (const movie of movies) {
    if (movie.status !== 'watched' || !movie.rating) continue
    for (const genre of movie.genres) {
      const entry = totals.get(genre) ?? { score: 0, count: 0 }
      entry.score += movie.rating - 3
      entry.count += 1
      totals.set(genre, entry)
    }
  }

  return [...totals.entries()]
    .map(([genre, { score, count }]) => ({ genre, score, count }))
    .sort((a, b) => b.score - a.score || b.count - a.count)
}
