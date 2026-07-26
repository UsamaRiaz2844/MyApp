// Movie / series suggestions via TMDB (free API). Filters to well-rated titles
// (vote_average >= 7) across Hollywood + Bollywood, movies and series, and looks
// up where to stream (Netflix / Prime / etc.).
//
// Requires a TMDB API key exposed at build time as VITE_TMDB_KEY. Without it the
// feature shows a friendly "not set up" message and everything else works.

const KEY = import.meta.env.VITE_TMDB_KEY as string | undefined;
const IMG = 'https://image.tmdb.org/t/p/w342';

export interface Movie {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  year: string;
  rating: number;
  overview: string;
  poster: string | null;
  providers: string[];
}

export function moviesConfigured(): boolean {
  return !!KEY;
}

// Mix of Hollywood (en) and Bollywood (hi) — weighted toward variety.
const LANGS = ['en', 'en', 'en', 'hi', 'hi'];

export async function fetchSuggestion(): Promise<Movie | null> {
  if (!KEY) return null;
  const type: 'movie' | 'tv' = Math.random() < 0.6 ? 'movie' : 'tv';
  const lang = LANGS[Math.floor(Math.random() * LANGS.length)];
  const page = 1 + Math.floor(Math.random() * 8);
  try {
    const url =
      `https://api.themoviedb.org/3/discover/${type}?api_key=${KEY}` +
      `&sort_by=popularity.desc&vote_average.gte=7&vote_count.gte=300` +
      `&with_original_language=${lang}&page=${page}&include_adult=false`;
    const res = await fetch(url);
    const data = await res.json();
    const list = (data.results || []).filter((r: any) => r.vote_average >= 7 && r.poster_path);
    if (!list.length) return null;
    const r = list[Math.floor(Math.random() * list.length)];
    const movie: Movie = {
      id: r.id,
      type,
      title: r.title || r.name || 'Untitled',
      year: (r.release_date || r.first_air_date || '').slice(0, 4),
      rating: Math.round(r.vote_average * 10) / 10,
      overview: r.overview || '',
      poster: r.poster_path ? IMG + r.poster_path : null,
      providers: [],
    };
    // Best-effort "where to watch" (prefer India, then US, then anything).
    try {
      const pr = await fetch(`https://api.themoviedb.org/3/${type}/${r.id}/watch/providers?api_key=${KEY}`);
      const pd = await pr.json();
      const region: any = pd.results?.IN || pd.results?.US || Object.values(pd.results || {})[0];
      const names = ((region?.flatrate || []) as any[]).map((p) => p.provider_name);
      movie.providers = Array.from(new Set(names)).slice(0, 4);
    } catch {
      /* providers are optional */
    }
    return movie;
  } catch {
    return null;
  }
}

export function suggestionText(m: Movie): string {
  const kind = m.type === 'tv' ? 'series' : 'movie';
  const where = m.providers.length ? ` · on ${m.providers.join(', ')}` : '';
  return `🎬 Let's watch the ${kind} "${m.title}"${m.year ? ` (${m.year})` : ''} — ⭐${m.rating}${where}`;
}
