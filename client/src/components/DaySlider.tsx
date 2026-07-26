import { useState } from 'react';
import { dayFace } from '../lib/activity';

interface Props {
  current: number | null;
  onSubmit: (score: number) => void;
  onClose: () => void;
}

// "How was your day?" — a 1–10 rating.
export default function DaySlider({ current, onSubmit, onClose }: Props) {
  const [score, setScore] = useState(current || 7);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom w-full max-w-md animate-sheet-up rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-[#15161d]"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />
        <h2 className="mb-1 text-center text-base font-bold text-slate-900 dark:text-white">How was your day?</h2>
        <div className="my-3 text-center">
          <div className="text-6xl">{dayFace(score)}</div>
          <div className="mt-1 text-2xl font-black text-slate-800 dark:text-white">{score}/10</div>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="w-full accent-brand-500"
        />
        <button
          onClick={() => onSubmit(score)}
          className="mt-4 w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white"
        >
          Share today
        </button>
      </div>
    </div>
  );
}
