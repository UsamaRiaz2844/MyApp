import { useEffect, useRef, useState } from 'react';
import { fetchReels, reelsConfigured, type Reel } from '../lib/reels';

// Full-screen vertical, swipe-up Reels feed (YouTube Shorts). Only the active
// slide mounts an autoplaying iframe; the rest show their thumbnail, so audio
// never overlaps and it stays light.
export default function ReelsView({ onClose }: { onClose: () => void }) {
  const [reels, setReels] = useState<Reel[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const loadingMore = useRef(false);

  async function loadMore() {
    if (loadingMore.current) return;
    loadingMore.current = true;
    const more = await fetchReels();
    setReels((prev) => {
      const have = new Set(prev.map((r) => r.id));
      return [...prev, ...more.filter((r) => !have.has(r.id))];
    });
    setLoading(false);
    loadingMore.current = false;
  }

  useEffect(() => {
    if (reelsConfigured()) loadMore();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    if (idx !== active) setActive(idx);
    if (idx >= reels.length - 3) loadMore();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      <button
        onClick={onClose}
        className="safe-top absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white backdrop-blur active:scale-90"
      >
        ✕
      </button>
      <div className="safe-top absolute left-4 top-4 z-10 text-sm font-extrabold tracking-wide text-white drop-shadow">
        📱 Reels
      </div>

      {!reelsConfigured() ? (
        <div className="flex h-full items-center justify-center p-8 text-center text-sm text-white/80">
          Reels need a free <strong className="mx-1">YouTube Data API key</strong>. Add it as the repo secret{' '}
          <code className="mx-1">VITE_YOUTUBE_KEY</code> and redeploy.
        </div>
      ) : loading && reels.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-white/70">Loading reels…</div>
      ) : (
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll"
        >
          {reels.map((r, i) => (
            <div key={`${r.id}-${i}`} className="relative flex h-full w-full snap-start items-center justify-center bg-black">
              {i === active ? (
                <iframe
                  title={r.title}
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${r.id}?autoplay=1&mute=1&playsinline=1&controls=1&rel=0&modestbranding=1&loop=1&playlist=${r.id}`}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <>
                  {r.thumb && <img src={r.thumb} alt="" className="max-h-full w-full object-contain opacity-90" />}
                  <div className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-white/25 text-3xl backdrop-blur">
                    ▶️
                  </div>
                </>
              )}
              <div className="pointer-events-none absolute bottom-6 left-4 right-16 z-[1]">
                <p className="line-clamp-2 text-sm font-semibold text-white drop-shadow">{r.title}</p>
                <p className="mt-0.5 text-xs text-white/70">@{r.channel}</p>
              </div>
            </div>
          ))}
          {loading && <div className="flex h-16 items-center justify-center text-xs text-white/50">Loading more…</div>}
        </div>
      )}
    </div>
  );
}
