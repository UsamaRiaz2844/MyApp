import { useMemo, useState } from 'react';
import { EMOJI_CATEGORIES } from '../lib/emojiData';

interface Props {
  onPick: (emoji: string) => void;
  onClose: () => void;
}

const RECENT_KEY = 'pronto_recent_emojis';

function loadRecents(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}
export function pushRecentEmoji(emoji: string) {
  try {
    const next = [emoji, ...loadRecents().filter((e) => e !== emoji)].slice(0, 24);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

// Pronto's own emoji center: recents + category tabs, no external library.
export default function EmojiPicker({ onPick, onClose }: Props) {
  const recents = useMemo(loadRecents, []);
  const [cat, setCat] = useState(recents.length ? -1 : 0); // -1 = recents

  const grid = cat === -1 ? recents : EMOJI_CATEGORIES[cat].emojis;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom w-full max-w-md animate-sheet-up rounded-t-3xl bg-white p-4 shadow-2xl dark:bg-[#15161d]"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />

        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">Emoji</h2>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300"
          >
            Done
          </button>
        </div>

        <div className="no-scrollbar mb-2 flex gap-1 overflow-x-auto">
          {recents.length > 0 && (
            <button
              onClick={() => setCat(-1)}
              title="Recent"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${
                cat === -1 ? 'bg-brand-100 dark:bg-brand-500/20' : ''
              }`}
            >
              🕘
            </button>
          )}
          {EMOJI_CATEGORIES.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setCat(i)}
              title={c.label}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${
                cat === i ? 'bg-brand-100 dark:bg-brand-500/20' : ''
              }`}
            >
              {c.icon}
            </button>
          ))}
        </div>

        {grid.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No recent emoji yet</p>
        ) : (
          <div className="no-scrollbar grid max-h-64 grid-cols-8 gap-1 overflow-y-auto">
            {grid.map((e, i) => (
              <button
                key={`${e}-${i}`}
                onClick={() => {
                  pushRecentEmoji(e);
                  onPick(e);
                }}
                className="flex h-9 items-center justify-center rounded-lg text-2xl transition active:scale-90 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
