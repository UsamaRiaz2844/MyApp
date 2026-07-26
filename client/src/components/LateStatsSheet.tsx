import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatDayLabel, formatDuration } from '../utils/format';
import type { LateStat } from '../types';

interface Props {
  conversationId: string;
  myId: string;
  otherId: string;
  otherName: string;
  onClose: () => void;
}

export default function LateStatsSheet({ conversationId, myId, otherId, otherName, onClose }: Props) {
  const [stats, setStats] = useState<LateStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<{ mine: number; theirs: number; total: number } | null>(null);

  useEffect(() => {
    api
      .getLateStatsHistory(conversationId)
      .then((data) => setStats(data.stats))
      .finally(() => setLoading(false));
    api
      .getMessageCounts(otherId)
      .then(setCounts)
      .catch(() => {});
  }, [conversationId, otherId]);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom max-h-[75vh] w-full max-w-md animate-pop-in overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-[#14151c]"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />
        <h2 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">⏱ Late-reply tracker</h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Counts how long each of you takes to reply once a chat is opened with "hi" and closed with "bye", per day.
        </p>

        {counts && (
          <div className="mb-4 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
            <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">💬 All-time messages</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-brand-600 dark:text-brand-400">{counts.mine}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">You sent</p>
              </div>
              <div>
                <p className="text-lg font-bold text-pink-600 dark:text-pink-400">{counts.theirs}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">@{otherName} sent</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{counts.total}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Total</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-slate-400">Kept even if you delete the chat.</p>
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : stats.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No tracked sessions yet — say "hi" to each other to start one!
          </p>
        ) : (
          <ul className="space-y-2">
            {stats.map((s) => {
              const mine = s.lateMs[myId] || 0;
              const theirs = s.lateMs[otherId] || 0;
              const total = mine + theirs || 1;
              return (
                <li key={s.date} className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatDayLabel(s.date)}
                    </span>
                    {s.active && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        session active
                      </span>
                    )}
                  </div>
                  <div className="mb-1.5 flex h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div className="bg-brand-500" style={{ width: `${(mine / total) * 100}%` }} />
                    <div className="bg-pink-500" style={{ width: `${(theirs / total) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>You: {formatDuration(mine)}</span>
                    <span>@{otherName}: {formatDuration(theirs)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200"
        >
          Close
        </button>
      </div>
    </div>
  );
}
