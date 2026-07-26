import { MOODS, moodString } from '../lib/mood';

interface Props {
  current: string | null;
  onPick: (mood: string | null) => void;
  onClose: () => void;
}

// Bottom sheet to pick a mood from a preset list (or clear it).
export default function MoodPicker({ current, onPick, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom w-full max-w-md animate-sheet-up rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-[#15161d]"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />
        <h2 className="mb-3 text-center text-base font-bold text-slate-900 dark:text-white">How are you feeling?</h2>

        <div className="grid grid-cols-2 gap-2">
          {MOODS.map((m) => {
            const s = moodString(m);
            const active = current === s;
            return (
              <button
                key={s}
                onClick={() => onPick(s)}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-medium transition active:scale-95 ${
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
                    : 'border-black/10 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5'
                }`}
              >
                <span className="text-xl">{m.e}</span>
                {m.l}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPick(null)}
          className="mt-4 w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300"
        >
          Clear mood
        </button>
      </div>
    </div>
  );
}
