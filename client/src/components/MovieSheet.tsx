import { useEffect, useState } from 'react';
import { fetchSuggestion, moviesConfigured, suggestionText, type Movie } from '../lib/movies';

interface Props {
  onSuggest: (text: string) => void;
  onClose: () => void;
}

// "Movie night" — keeps suggesting well-rated films & series to watch together.
export default function MovieSheet({ onSuggest, onClose }: Props) {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  async function next() {
    setLoading(true);
    setEmpty(false);
    // A couple of tries in case a page comes back thin.
    for (let i = 0; i < 3; i++) {
      const m = await fetchSuggestion();
      if (m) {
        setMovie(m);
        setLoading(false);
        return;
      }
    }
    setEmpty(true);
    setLoading(false);
  }

  useEffect(() => {
    if (moviesConfigured()) next();
    else setLoading(false);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom w-full max-w-md animate-sheet-up rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-[#15161d]"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">🎬 Movie night</h2>
          <button onClick={onClose} className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Close
          </button>
        </div>

        {!moviesConfigured() ? (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            Movie suggestions need a free <strong>TMDB API key</strong>. Add it as the repo secret{' '}
            <code>VITE_TMDB_KEY</code> and redeploy, then this will start suggesting titles.
          </div>
        ) : loading ? (
          <p className="py-16 text-center text-sm text-slate-400">Finding something good…</p>
        ) : empty || !movie ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-400">Couldn't fetch a suggestion right now.</p>
            <button onClick={next} className="mt-3 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold dark:bg-white/10 dark:text-white">
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-3">
              {movie.poster ? (
                <img src={movie.poster} alt="" className="h-40 w-28 shrink-0 rounded-xl object-cover shadow" />
              ) : (
                <div className="flex h-40 w-28 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-3xl dark:bg-white/10">
                  🎬
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-tight text-slate-900 dark:text-white">{movie.title}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {movie.type === 'tv' ? 'Series' : 'Movie'}
                  {movie.year ? ` · ${movie.year}` : ''} · ⭐ {movie.rating}
                </p>
                {movie.providers.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {movie.providers.map((p) => (
                      <span key={p} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 line-clamp-4 text-xs text-slate-500 dark:text-slate-400">{movie.overview}</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={next}
                className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200"
              >
                🔀 Next
              </button>
              <button
                onClick={() => {
                  onSuggest(suggestionText(movie));
                  onClose();
                }}
                className="flex-1 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white"
              >
                💬 Suggest this
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
