import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { isOnlineFresh } from '../lib/presence';
import { formatLastSeen } from '../utils/format';
import { weatherEmoji } from '../lib/weather';
import { formatDistance, haversineKm, loadMyCoords } from '../lib/geo';
import type { ConversationSummary } from '../types';

// Admin-only overview. Gated to the single admin account (username "usama").
export const ADMIN_USERNAME = 'usama';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const myCoords = loadMyCoords();

  useEffect(() => {
    api
      .listConversations()
      .then((d) => setRows(d.conversations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Hard gate: only the admin account can see this page.
  if (user && user.username !== ADMIN_USERNAME) return <Navigate to="/" replace />;

  return (
    <div className="animate-page-in min-h-screen bg-slate-50 dark:bg-[#0b0c10]">
      <header className="safe-top sticky top-0 z-10 border-b border-black/5 bg-white/70 px-3 py-3 backdrop-blur dark:border-white/5 dark:bg-black/30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Admin</h1>
            <p className="text-xs text-slate-400">Signed in as @{user?.username} · admin</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-3 py-4">
        <p className="mb-3 text-xs text-slate-400">
          Overview of your chats — everyone here can see the same distance & weather about each other; nothing on this
          page is hidden from them.
        </p>

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No conversations yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((c) => {
              const o = c.otherUser;
              if (!o) return null;
              const online = isOnlineFresh(o.isOnline, o.lastSeen);
              const dist =
                myCoords && o.lat != null && o.lon != null
                  ? haversineKm(myCoords, { lat: o.lat, lon: o.lon })
                  : null;
              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-black/5 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={o.displayName || o.username} color={o.avatarColor || '#6366f1'} src={o.avatarUrl} isOnline={online} showStatus size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">@{o.username}</p>
                        {o.mood && (
                          <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-white/10 dark:text-slate-300">
                            {o.mood}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-slate-400">{formatLastSeen(online, o.lastSeen)}</p>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="shrink-0 rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {o.weatherTemp != null && (
                      <span>
                        {weatherEmoji(o.weatherCode)} {Math.round(o.weatherTemp)}°
                      </span>
                    )}
                    {dist != null && <span>📍 {formatDistance(dist)}</span>}
                    {c.lastMessage && (
                      <span>🕘 last msg {new Date(c.lastMessage.createdAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
