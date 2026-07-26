import { useEffect, useState } from 'react';
import { gifsConfigured, searchGifs, type Gif } from '../lib/gifs';

interface Props {
  onPick: (url: string) => void;
  onClose: () => void;
}

export default function GifSheet({ onPick, onClose }: Props) {
  const [q, setQ] = useState('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gifsConfigured()) return;
    setLoading(true);
    const id = setTimeout(() => {
      searchGifs(q)
        .then(setGifs)
        .finally(() => setLoading(false));
    }, 350); // debounce
    return () => clearTimeout(id);
  }, [q]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom flex max-h-[80vh] w-full max-w-md flex-col rounded-t-3xl bg-white p-4 shadow-2xl animate-sheet-up dark:bg-[#15161d]"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />

        {!gifsConfigured() ? (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            GIF search needs a free <strong>Giphy API key</strong>. Add it as the repo secret{' '}
            <code>VITE_GIPHY_KEY</code> and redeploy.
          </div>
        ) : (
          <>
            <div className="mb-3 flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
                placeholder="Search GIFs…"
                className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-white/10 dark:text-white"
              />
              <button onClick={onClose} className="rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading && gifs.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
              ) : gifs.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">No GIFs found.</p>
              ) : (
                <div className="columns-2 gap-2 [column-fill:_balance]">
                  {gifs.map((g) => (
                    <button key={g.id} onClick={() => onPick(g.url)} className="mb-2 block w-full overflow-hidden rounded-xl">
                      <img src={g.preview} alt="" loading="lazy" className="w-full" />
                    </button>
                  ))}
                </div>
              )}
              <p className="py-2 text-center text-[10px] text-slate-300 dark:text-slate-600">Powered by GIPHY</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
