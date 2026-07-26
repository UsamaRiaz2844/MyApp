import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ThemeToggle from '../components/ThemeToggle';
import Avatar from '../components/Avatar';
import LockSetupModal from '../components/LockSetupModal';
import { formatDuration, formatLastSeen } from '../utils/format';
import { isEncryptedText } from '../lib/crypto';
import { isOnlineFresh } from '../lib/presence';
import { ensureNotifyPermission, notifyPermission, notifySupported } from '../lib/notify';
import { fetchMyWeather, saveMyWeather, weatherStale } from '../lib/weather';
import { getNickname } from '../lib/nickname';
import { loadMyMood, saveMyMood } from '../lib/mood';
import MoodPicker from '../components/MoodPicker';
import type { ConversationSummary, OtherUser } from '../types';

// Preview text for the chat list — encrypted last messages show a lock instead
// of ciphertext (decryption happens only inside the open conversation).
function previewText(last: { text: string; sender: string } | null, myId?: string): string {
  if (!last) return 'Say hi 👋';
  const body = isEncryptedText(last.text) ? '🔒 Encrypted message' : last.text;
  return last.sender === myId ? `You: ${body}` : body;
}

export default function ChatList() {
  const { user, logout, setAvatar } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [, setPresenceTick] = useState(0); // ticks to re-evaluate online freshness

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OtherUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLock, setShowLock] = useState(false);
  const [showMood, setShowMood] = useState(false);
  const [myMood, setMyMood] = useState<string | null>(() => loadMyMood());
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(notifyPermission());
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  useEffect(() => {
    api.listConversations().then((data) => {
      setConversations(data.conversations);
      setLoading(false);
    });
  }, []);

  // Best-effort: ask for notification permission once. Some browsers only
  // prompt from a user gesture — the account-menu item is the reliable fallback.
  useEffect(() => {
    if (notifySupported() && notifyPermission() === 'default') {
      ensureNotifyPermission().then(setNotifPerm);
    }
  }, []);

  // Re-evaluate online freshness so stale "online" flips to offline over time.
  useEffect(() => {
    const id = setInterval(() => setPresenceTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  // Refresh my weather (browser location → Open-Meteo) and share it, at most
  // every ~20 min. Fails silently if location is denied/unavailable.
  useEffect(() => {
    if (!weatherStale(20)) return;
    fetchMyWeather().then((w) => {
      if (!w) return;
      saveMyWeather(w);
      api.updateWeather(w.temp, w.city, w.code).catch(() => {});
    });
  }, []);

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return window.alert('Please choose an image file.');
    if (file.size > 5 * 1024 * 1024) return window.alert('Image is too large (max 5 MB).');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    try {
      const { url } = await api.uploadAvatar(file, ext);
      setAvatar(url);
    } catch (err: any) {
      window.alert(err?.message || 'Could not update photo. (Has the profiles.sql migration been run?)');
    }
  }

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      api
        .searchUsers(q)
        .then((data) => setResults(data.users))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!socket) return;

    function onNewMessage(msg: any) {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.conversation);
        if (idx === -1) {
          api.listConversations().then((data) => setConversations(data.conversations));
          return prev;
        }
        const updated = [...prev];
        const conv = { ...updated[idx] };
        conv.lastMessage = { text: msg.text, sender: msg.sender, createdAt: msg.createdAt };
        if (msg.sender !== user?.id) conv.unreadCount = (conv.unreadCount || 0) + 1;
        updated.splice(idx, 1);
        updated.unshift(conv);
        return updated;
      });
    }

    function onPresence({ userId, isOnline, lastSeen, avatarUrl }: any) {
      setConversations((prev) =>
        prev.map((c) =>
          c.otherUser?.id === userId
            ? {
                ...c,
                otherUser: {
                  ...c.otherUser!,
                  isOnline,
                  lastSeen: lastSeen || c.otherUser!.lastSeen,
                  avatarUrl: avatarUrl !== undefined ? avatarUrl : c.otherUser!.avatarUrl,
                },
              }
            : c
        )
      );
    }

    function onLateStats(stat: any) {
      setConversations((prev) => prev.map((c) => (c.id === stat.conversation ? { ...c, todayLateStats: stat } : c)));
    }
    function onConvDeleted({ id }: any) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
    }

    socket.on('message:new', onNewMessage);
    socket.on('presence:update', onPresence);
    socket.on('late-stats:update', onLateStats);
    socket.on('conversation:deleted', onConvDeleted);
    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('presence:update', onPresence);
      socket.off('late-stats:update', onLateStats);
      socket.off('conversation:deleted', onConvDeleted);
    };
  }, [socket, user]);

  async function openChatWith(username: string) {
    const data = await api.openConversation(username);
    setQuery('');
    setResults([]);
    navigate(`/chat/${data.conversation.id}`, { state: { otherUser: data.conversation.otherUser } });
  }

  function openExisting(c: ConversationSummary) {
    if (longPressed.current) return;
    navigate(`/chat/${c.id}`, { state: { otherUser: c.otherUser } });
  }

  function startPress(c: ConversationSummary) {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      if (window.confirm(`Delete your chat with @${c.otherUser?.username}? This can't be undone.`)) {
        setConversations((prev) => prev.filter((x) => x.id !== c.id));
        api.deleteConversation(c.id).catch(() => {});
      }
    }, 500);
  }
  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  const showingSearch = query.trim().length > 0;

  const totalUnread = useMemo(() => conversations.reduce((a, c) => a + (c.unreadCount || 0), 0), [conversations]);

  return (
    <div className="animate-page-in flex h-screen flex-col bg-slate-50 dark:bg-[#0b0c10]">
      <header className="safe-top sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-white/5 dark:bg-[#0b0c10]/80">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-pink-500 text-lg shadow-md shadow-brand-500/30">
              💬
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none text-slate-900 dark:text-white">Pronto</h1>
              {totalUnread > 0 && (
                <span className="text-[11px] font-medium text-brand-600 dark:text-brand-400">
                  {totalUnread} unread
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="relative">
              <button onClick={() => setMenuOpen((v) => !v)} className="active:scale-95">
                <Avatar
                  name={user?.displayName || user?.username || '?'}
                  color={user?.avatarColor || '#6366f1'}
                  src={user?.avatarUrl}
                  size={38}
                />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 z-20 w-44 overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-black/5 dark:bg-[#17181f] dark:ring-white/10">
                  <div className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-white/5 dark:text-slate-200">
                    @{user?.username}
                    {myMood && <div className="mt-0.5 text-xs font-normal text-slate-400">{myMood}</div>}
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowMood(true);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    😊 Set mood
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      avatarInputRef.current?.click();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    🖼 Update photo
                  </button>
                  {notifySupported() && notifPerm !== 'granted' && (
                    <button
                      onClick={() => {
                        ensureNotifyPermission().then(setNotifPerm);
                        setMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                    >
                      🔔 {notifPerm === 'denied' ? 'Notifications blocked' : 'Enable notifications'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowLock(true);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    🔒 App lock
                  </button>
                  <button
                    onClick={logout}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 dark:bg-white/5">
            <span className="text-slate-400">🔎</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search username to start a chat…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white"
            />
          </div>
        </div>
      </header>

      <main className="no-scrollbar safe-bottom flex-1 overflow-y-auto pb-8">
        {showingSearch ? (
          <div className="px-2 pt-2">
            {searching && <p className="px-2 py-3 text-sm text-slate-400">Searching…</p>}
            {!searching && results.length === 0 && (
              <p className="px-2 py-3 text-sm text-slate-400">No users found for "{query}"</p>
            )}
            {results.map((u) => (
              <button
                key={u.id}
                onClick={() => openChatWith(u.username)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-100 active:scale-[0.99] dark:hover:bg-white/5"
              >
                <Avatar
                  name={u.displayName || u.username}
                  color={u.avatarColor}
                  src={u.avatarUrl}
                  isOnline={isOnlineFresh(u.isOnline, u.lastSeen)}
                  showStatus
                  size={44}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-white">@{u.username}</p>
                  <p className="truncate text-xs text-slate-400">{formatLastSeen(isOnlineFresh(u.isOnline, u.lastSeen), u.lastSeen)}</p>
                </div>
              </button>
            ))}
          </div>
        ) : loading ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Loading chats…</p>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
            <div className="text-5xl">👋</div>
            <p className="font-semibold text-slate-700 dark:text-slate-200">No conversations yet</p>
            <p className="text-sm text-slate-400">Search a username above to say hi</p>
          </div>
        ) : (
          <ul className="px-2 pt-2">
            {conversations.map((c) => {
              const myLateMs = c.todayLateStats?.lateMs?.[user?.id || ''] || 0;
              const theirLateMs = c.otherUser ? c.todayLateStats?.lateMs?.[c.otherUser.id] || 0 : 0;
              const showLate = (myLateMs > 0 || theirLateMs > 0) && c.todayLateStats;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => openExisting(c)}
                    onPointerDown={() => startPress(c)}
                    onPointerUp={endPress}
                    onPointerLeave={endPress}
                    onContextMenu={(e) => e.preventDefault()}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-100 active:scale-[0.99] dark:hover:bg-white/5"
                  >
                    <Avatar
                      name={c.otherUser?.displayName || c.otherUser?.username || '?'}
                      color={c.otherUser?.avatarColor || '#6366f1'}
                      src={c.otherUser?.avatarUrl}
                      isOnline={isOnlineFresh(c.otherUser?.isOnline, c.otherUser?.lastSeen)}
                      showStatus
                      size={48}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">
                          {getNickname(c.otherUser?.id) || `@${c.otherUser?.username}`}
                        </p>
                        {c.lastMessage && (
                          <span className="shrink-0 text-[11px] text-slate-400">
                            {new Date(c.lastMessage.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                          {previewText(c.lastMessage, user?.id)}
                        </p>
                        {c.unreadCount > 0 && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-pink-500 px-1.5 text-[11px] font-bold text-white">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                      {showLate && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                          <span>⏱</span>
                          <span>
                            You {formatDuration(myLateMs)} · Them {formatDuration(theirLateMs)} late today
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={onAvatarSelected} />

      {showLock && <LockSetupModal onClose={() => setShowLock(false)} />}
      {showMood && (
        <MoodPicker
          current={myMood}
          onPick={(m) => {
            setMyMood(m);
            saveMyMood(m);
            api.updateMood(m).catch(() => {});
            setShowMood(false);
          }}
          onClose={() => setShowMood(false)}
        />
      )}
    </div>
  );
}
