import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { petLevel } from '../lib/pet';

interface Props {
  conversationId: string;
  me: string;
  other: string;
  otherName: string;
  onClose: () => void;
}

export function streakBadge(streak: number): { icon: string; label: string } | null {
  if (streak >= 100) return { icon: '💯', label: 'Century streak' };
  if (streak >= 50) return { icon: '👑', label: '50-day legend' };
  if (streak >= 30) return { icon: '🏆', label: '30-day pro' };
  if (streak >= 14) return { icon: '⭐', label: '2-week streak' };
  if (streak >= 7) return { icon: '🔥', label: 'Week streak' };
  if (streak >= 3) return { icon: '✨', label: 'Warming up' };
  return null;
}

// A friendly "leaderboard" for the two of you — messages, game wins, streak.
export default function StatsSheet({ conversationId, me, other, otherName, onClose }: Props) {
  const [msgs, setMsgs] = useState<{ mine: number; theirs: number; total: number } | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [pet, setPet] = useState<{ streak: number; xp: number }>({ streak: 0, xp: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getMessageCounts(other).catch(() => null),
      api.getScores(conversationId).catch(() => ({})),
      api.getPet(conversationId).catch(() => ({ streak: 0, xp: 0 })),
    ])
      .then(([m, s, p]) => {
        if (m) setMsgs(m);
        setScores(s as Record<string, number>);
        setPet(p as { streak: number; xp: number });
      })
      .finally(() => setLoading(false));
  }, [conversationId, other]);

  const myWins = scores[me] || 0;
  const theirWins = scores[other] || 0;
  const badge = streakBadge(pet.streak);

  function Row({ label, mine, theirs }: { label: string; mine: number; theirs: number }) {
    const lead = mine === theirs ? 'tie' : mine > theirs ? 'me' : 'them';
    return (
      <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/[0.05]">
        <span className={`text-lg font-bold tabular-nums ${lead === 'me' ? 'text-brand-600 dark:text-brand-300' : 'text-slate-500'}`}>
          {mine}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <span className={`text-lg font-bold tabular-nums ${lead === 'them' ? 'text-brand-600 dark:text-brand-300' : 'text-slate-500'}`}>
          {theirs}
        </span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom max-h-[85vh] w-full max-w-md animate-sheet-up overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-[#15161d]"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">📊 Our stats</h2>
          <button onClick={onClose} className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Close
          </button>
        </div>
        <div className="mb-4 flex justify-between px-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <span>You</span>
          <span>{otherName}</span>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-slate-400">Crunching numbers…</p>
        ) : (
          <div className="space-y-2">
            <Row label="Messages" mine={msgs?.mine || 0} theirs={msgs?.theirs || 0} />
            <Row label="Game wins" mine={myWins} theirs={theirWins} />

            <div className="mt-3 flex items-center justify-between rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-4 dark:from-orange-500/10 dark:to-amber-500/10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Cat streak</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">🔥 {pet.streak} days</p>
                {badge && (
                  <p className="mt-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {badge.icon} {badge.label}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Level</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">Lv {petLevel(pet.xp)}</p>
              </div>
            </div>

            {msgs && (
              <p className="pt-2 text-center text-xs text-slate-400">{msgs.total.toLocaleString()} messages together 💬</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
