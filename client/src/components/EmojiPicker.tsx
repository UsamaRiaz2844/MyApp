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

// Pronto's own emoji center. Rendered inline inside the composer (not a modal),
// so the message input stays visible above it and tapping the input brings the
// keyboard back over the panel.
export default function EmojiPicker({ onPick, onClose }: Props) {
  const recents = useMemo(loadRecents, []);
  const [cat, setCat] = useState(recents.length ? -1 : 0); // -1 = recents

  const grid = cat === -1 ? recents : EMOJI_CATEGORIES[cat].emojis;

  return (
    <div className="mt-2 animate-sheet-up overflow-hidden rounded-2xl border border-black/10 bg-white/80 dark:border-white/10 dark:bg-white/[0.05]">
      <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-black/5 p-1.5 dark:border-white/10">
        {recents.length > 0 && (
          <button
            type="button"
            onClick={() => setCat(-1)}
            title="Recent"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base ${
              cat === -1 ? 'bg-brand-100 dark:bg-brand-500/20' : ''
            }`}
          >
            🕘
          </button>
        )}
        {EMOJI_CATEGORIES.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(i)}
            title={c.label}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base ${
              cat === i ? 'bg-brand-100 dark:bg-brand-500/20' : ''
            }`}
          >
            {c.icon}
          </button>
        ))}
        <button
          type="button"
          onClick={onClose}
          title="Back to keyboard"
          className="ml-auto flex h-8 shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2 text-sm text-slate-600 dark:bg-white/10 dark:text-slate-300"
        >
          ⌨️
        </button>
      </div>

      {grid.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No recent emoji yet</p>
      ) : (
        <div className="no-scrollbar grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto p-1.5">
          {grid.map((e, i) => (
            <button
              key={`${e}-${i}`}
              type="button"
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
  );
}
