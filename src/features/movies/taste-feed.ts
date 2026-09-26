import {
  dislikedGenres,
  genreTasteProfile,
  likedGenres,
  tasteIsThin,
} from '@/features/movies/taste'
import { isTmdbConfigured, tmdbGenreIds } from '@/features/movies/tmdb'

interface RatedMovie {
  status: string
  rating: number | null
  genres: string[]
}

export interface TasteFeed {
  /** the genres the feed will actually be built from, strongest first */
  liked: string[]
  /** the genres it will exclude */
  disliked: string[]
  /** whether the "Sana göre" tab exists at all right now */
  available: boolean
}

/**
 * One answer to "is there a taste feed, and which genres is it about".
 *
 * Both the Keşfet tab and the Filmler page's "En sevdiğin türler" line ask
 * this. They used to work it out separately, and the line ended up pointing
 * at a tab that was not there: it appeared after a single rating, while the
 * tab needs three, a TMDB key, and genres TMDB has an id for. Two surfaces
 * describing the same thing differently is this repo's oldest and most
 * expensive mistake.
 */
export function tasteFeed(movies: RatedMovie[]): TasteFeed {
  const profile = genreTasteProfile(movies)
  // The app's genre vocabulary is wider than TMDB's — Biyografi, Kara Film,
  // Müzikal and Spor come from OMDb and have no id — so a profile made only
  // of those cannot seed a query, however confident it looks.
  const askable = (g: string) => tmdbGenreIds([g]).length > 0
  const liked = likedGenres(profile).filter(askable)
  const disliked = dislikedGenres(profile).filter(askable)

  return {
    liked,
    disliked,
    available: isTmdbConfigured && !tasteIsThin(movies) && liked.length > 0,
  }
}
