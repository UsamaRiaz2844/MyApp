import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Avatar from '../components/Avatar';
import TypingDots from '../components/TypingDots';
import SeenTicks from '../components/SeenTicks';
import LateStatsSheet from '../components/LateStatsSheet';
import { formatDayLabel, formatDuration, formatLastSeen, formatMessageTime } from '../utils/format';
import type { ChatMessage, LateStat, OtherUser } from '../types';

interface LocationState {
  otherUser?: OtherUser;
}

export default function ChatRoom() {
  const { conversationId = '' } = useParams();
  const { state } = useLocation() as { state: LocationState | null };
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const [otherUser, setOtherUser] = useState<OtherUser | null>(state?.otherUser || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const [todayStat, setTodayStat] = useState<LateStat | null>(null);
  const [showStatsSheet, setShowStatsSheet] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasTyping = useRef(false);

  useEffect(() => {
    if (otherUser) return;
    api.listConversations().then((data) => {
      const conv = data.conversations.find((c: any) => c.id === conversationId);
      if (conv) setOtherUser(conv.otherUser);
    });
  }, [conversationId, otherUser]);

  useEffect(() => {
    setLoading(true);
    api
      .getMessages(conversationId)
      .then((data) => setMessages(data.messages))
      .finally(() => setLoading(false));
    api.markSeen(conversationId).catch(() => {});
    api
      .getLateStats(conversationId)
      .then((data) => setTodayStat(data.stat))
      .catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('conversation:join', conversationId);
    socket.emit('message:seen', { conversationId });
    return () => {
      socket.emit('conversation:leave', conversationId);
    };
  }, [socket, conversationId]);

  useEffect(() => {
    if (!socket) return;

    function onNewMessage(msg: ChatMessage) {
      if (msg.conversation !== conversationId) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.sender !== user?.id) {
        socket!.emit('message:seen', { conversationId });
        setOtherTyping(false);
      }
    }

    function onSeen({ conversationId: cid, seenAt }: any) {
      if (cid !== conversationId) return;
      setMessages((prev) => prev.map((m) => (m.sender === user?.id && !m.seenAt ? { ...m, seenAt } : m)));
    }

    function onTyping({ conversationId: cid, userId, isTyping }: any) {
      if (cid !== conversationId || userId === user?.id) return;
      setOtherTyping(isTyping);
    }

    function onPresence({ userId, isOnline, lastSeen }: any) {
      setOtherUser((prev) => (prev && prev.id === userId ? { ...prev, isOnline, lastSeen: lastSeen || prev.lastSeen } : prev));
    }

    function onLateStats(stat: LateStat) {
      if (stat.conversation === conversationId) setTodayStat(stat);
    }

    socket.on('message:new', onNewMessage);
    socket.on('message:seen', onSeen);
    socket.on('typing', onTyping);
    socket.on('presence:update', onPresence);
    socket.on('late-stats:update', onLateStats);
    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:seen', onSeen);
      socket.off('typing', onTyping);
      socket.off('presence:update', onPresence);
      socket.off('late-stats:update', onLateStats);
    };
  }, [socket, conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, otherTyping]);

  function handleTextChange(v: string) {
    setText(v);
    if (!socket) return;
    if (!wasTyping.current) {
      socket.emit('typing', { conversationId, isTyping: true });
      wasTyping.current = true;
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing', { conversationId, isTyping: false });
      wasTyping.current = false;
    }, 1200);
  }

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !socket) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      conversation: conversationId,
      sender: user!.id,
      receiver: otherUser?.id || '',
      text: trimmed,
      createdAt: new Date().toISOString(),
      seenAt: null,
      delayMs: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    if (wasTyping.current) {
      socket.emit('typing', { conversationId, isTyping: false });
      wasTyping.current = false;
    }

    socket.emit('message:send', { conversationId, text: trimmed }, (res: any) => {
      if (res?.message) {
        setMessages((prev) => {
          // the real-time broadcast (sent to the sender's own room too, for multi-device sync)
          // can arrive before this ack does - if so, just drop the optimistic placeholder.
          const alreadyArrived = prev.some((m) => m.id === res.message.id);
          if (alreadyArrived) return prev.filter((m) => m.id !== tempId);
          return prev.map((m) => (m.id === tempId ? res.message : m));
        });
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    });
  }

  const grouped = useMemo(() => {
    const groups: { day: string; items: ChatMessage[] }[] = [];
    for (const m of messages) {
      const day = formatDayLabel(m.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.items.push(m);
      else groups.push({ day, items: [m] });
    }
    return groups;
  }, [messages]);

  const myLateMs = todayStat?.lateMs?.[user?.id || ''] || 0;
  const theirLateMs = otherUser ? todayStat?.lateMs?.[otherUser.id] || 0 : 0;

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-[#0b0c10]">
      <header className="safe-top sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-white/5 dark:bg-[#0b0c10]/80">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <button
            onClick={() => navigate('/')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          >
            ←
          </button>
          <Avatar
            name={otherUser?.displayName || otherUser?.username || '?'}
            color={otherUser?.avatarColor || '#6366f1'}
            isOnline={!!otherUser?.isOnline}
            showStatus
            size={40}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900 dark:text-white">@{otherUser?.username}</p>
            <p className="truncate text-xs text-slate-400">
              {otherTyping ? (
                <span className="text-brand-500 dark:text-brand-400">typing…</span>
              ) : (
                formatLastSeen(!!otherUser?.isOnline, otherUser?.lastSeen || null)
              )}
            </p>
          </div>
          <button
            onClick={() => setShowStatsSheet(true)}
            className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20"
            title="Late-reply stats"
          >
            ⏱ {formatDuration(myLateMs)}
          </button>
        </div>
      </header>

      <main className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading messages…</p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <div className="text-4xl">👋</div>
            <p className="text-sm text-slate-400">Say hi to @{otherUser?.username} to start chatting</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.day}>
              <div className="my-3 flex justify-center">
                <span className="rounded-full bg-slate-200/70 px-3 py-1 text-[11px] font-medium text-slate-500 dark:bg-white/5 dark:text-slate-400">
                  {group.day}
                </span>
              </div>
              {group.items.map((m) => {
                const mine = m.sender === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-1.5`}>
                    <div
                      className={`max-w-[76%] animate-pop-in rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                        mine
                          ? 'rounded-br-sm bg-gradient-to-br from-brand-500 to-pink-500 text-white'
                          : 'rounded-bl-sm bg-white text-slate-800 dark:bg-white/10 dark:text-slate-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <div
                        className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                          mine ? 'text-white/80' : 'text-slate-400'
                        }`}
                      >
                        <span>{formatMessageTime(m.createdAt)}</span>
                        {mine && <SeenTicks seen={!!m.seenAt} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        {otherTyping && (
          <div className="flex justify-start">
            <TypingDots />
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <form onSubmit={sendMessage} className="safe-bottom border-t border-slate-200/70 bg-white/80 p-3 backdrop-blur dark:border-white/5 dark:bg-[#0b0c10]/80">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e as any);
              }
            }}
            placeholder="Type a message…"
            rows={1}
            className="max-h-28 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-brand-500/40 focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-pink-500 text-white shadow-lg shadow-brand-500/30 transition active:scale-90 disabled:opacity-40"
          >
            ➤
          </button>
        </div>
      </form>

      {showStatsSheet && otherUser && (
        <LateStatsSheet
          conversationId={conversationId}
          myId={user!.id}
          otherId={otherUser.id}
          otherName={otherUser.username}
          onClose={() => setShowStatsSheet(false)}
        />
      )}
    </div>
  );
}
