import { useState } from 'react';
import { ATTACK_LIST } from '../lib/attacks';
import { PACKS, randomLine, type Pack } from '../lib/funpacks';
import { GAME_META, type GameType } from '../lib/games';
import { SOUNDS } from '../lib/soundboard';

interface Props {
  onAttack: (kind: string) => void;
  onSound: (id: string) => void;
  onPrompt: (text: string) => void;
  onMovie: () => void;
  onGame: (type: GameType) => void;
  onStats: () => void;
  onShared: () => void;
  onGif: () => void;
  onClose: () => void;
}

// The Fun hub — one place for attacks, conversation prompts, and movie night.
// More sections (games, polls, lists) get added here over time.
export default function FunHub({ onAttack, onSound, onPrompt, onMovie, onGame, onStats, onShared, onGif, onClose }: Props) {
  const [pack, setPack] = useState<Pack | null>(null);
  const [line, setLine] = useState('');

  function openPack(p: Pack) {
    setPack(p);
    setLine(randomLine(p));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom max-h-[85vh] w-full max-w-md animate-sheet-up overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-[#15161d]"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />

        {pack ? (
          <>
            <button onClick={() => setPack(null)} className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
              ← Fun
            </button>
            <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">
              {pack.icon} {pack.label}
            </h2>
            <div className="rounded-2xl bg-slate-50 p-4 text-center text-sm font-medium text-slate-800 dark:bg-white/[0.05] dark:text-slate-100">
              {line}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setLine(randomLine(pack, line))}
                className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200"
              >
                🔀 Shuffle
              </button>
              <button
                onClick={() => {
                  onPrompt(line);
                  onClose();
                }}
                className="flex-1 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white"
              >
                💬 Send this
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">🎮 Fun</h2>

            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Throw something</p>
            <div className="mb-4 grid grid-cols-4 gap-2">
              {ATTACK_LIST.map((a) => (
                <button
                  key={a.kind}
                  onClick={() => onAttack(a.kind)}
                  className="flex flex-col items-center gap-1 rounded-2xl bg-slate-50 py-3 text-2xl transition active:scale-90 dark:bg-white/[0.05]"
                >
                  {a.emoji}
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{a.label}</span>
                </button>
              ))}
            </div>

            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Soundboard</p>
            <div className="mb-4 grid grid-cols-4 gap-2">
              {SOUNDS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSound(s.id)}
                  className="flex flex-col items-center gap-1 rounded-2xl bg-slate-50 py-3 text-2xl transition active:scale-90 dark:bg-white/[0.05]"
                >
                  {s.emoji}
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{s.label}</span>
                </button>
              ))}
            </div>

            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Play together</p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {(Object.keys(GAME_META) as GameType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    onClose();
                    onGame(t);
                  }}
                  className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 transition active:scale-95 dark:bg-white/[0.05] dark:text-slate-200"
                >
                  <span className="text-lg">{GAME_META[t].icon}</span>
                  {GAME_META[t].label}
                </button>
              ))}
            </div>

            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Prompts & more</p>
            <div className="grid grid-cols-2 gap-2">
              {PACKS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openPack(p)}
                  className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 transition active:scale-95 dark:bg-white/[0.05] dark:text-slate-200"
                >
                  <span className="text-lg">{p.icon}</span>
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => {
                  onClose();
                  onGif();
                }}
                className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 transition active:scale-95 dark:bg-white/[0.05] dark:text-slate-200"
              >
                <span className="text-lg">🎁</span> GIFs
              </button>
              <button
                onClick={() => {
                  onClose();
                  onMovie();
                }}
                className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 transition active:scale-95 dark:bg-white/[0.05] dark:text-slate-200"
              >
                <span className="text-lg">🎬</span> Movie night
              </button>
              <button
                onClick={() => {
                  onClose();
                  onStats();
                }}
                className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 transition active:scale-95 dark:bg-white/[0.05] dark:text-slate-200"
              >
                <span className="text-lg">📊</span> Our stats
              </button>
              <button
                onClick={() => {
                  onClose();
                  onShared();
                }}
                className="col-span-2 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 transition active:scale-95 dark:bg-white/[0.05] dark:text-slate-200"
              >
                <span className="text-lg">🤝</span> Plans · Split · Polls
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
