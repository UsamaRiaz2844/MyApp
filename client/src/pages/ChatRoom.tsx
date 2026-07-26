import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import Avatar from '../components/Avatar';
import TypingDots from '../components/TypingDots';
import LateStatsSheet from '../components/LateStatsSheet';
import MessageBubble from '../components/MessageBubble';
import MessageActions from '../components/MessageActions';
import EffectsOverlay, { Fx } from '../components/EffectsOverlay';
import EncryptionModal from '../components/EncryptionModal';
import { CHAT_THEMES, getTheme } from '../lib/themes';
import { useConversationCrypto } from '../lib/useConversationCrypto';
import { decryptText, encryptText, encryptFile, greetMarker, isEncryptedText } from '../lib/crypto';
import { formatClock, formatDayLabel, formatDuration, formatLastSeen } from '../utils/format';
import type { AttachmentType, ChatMessage, LateStat, OtherUser, ReactionMap } from '../types';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

interface LocationState {
  otherUser?: OtherUser;
}

export default function ChatRoom() {
  const { conversationId = '' } = useParams();
  const { state } = useLocation() as { state: LocationState | null };
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  const { theme: colorMode } = useTheme();

  const [otherUser, setOtherUser] = useState<OtherUser | null>(state?.otherUser || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<ReactionMap>({});
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [whisper, setWhisper] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherTypingText, setOtherTypingText] = useState('');
  const [todayStat, setTodayStat] = useState<LateStat | null>(null);
  const [showStatsSheet, setShowStatsSheet] = useState(false);
  const [bothHere, setBothHere] = useState(false);
  const [themeId, setThemeId] = useState<string | null>(null);
  const [fx, setFx] = useState<Fx | null>(null);
  const [nudgePulse, setNudgePulse] = useState(false);
  const [actionMsg, setActionMsg] = useState<ChatMessage | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);

  // --- encryption -----------------------------------------------------------
  const crypto = useConversationCrypto(conversationId);
  const cryptoKey = crypto.key;
  const encStatus = crypto.status;
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});
  const [showEncModal, setShowEncModal] = useState(false);
  const refreshedForEnc = useRef(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fxCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordStartRef = useRef(0);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordCancelledRef = useRef(false);

  const theme = getTheme(themeId);
  const bg = colorMode === 'dark' ? theme.bgDark : theme.bgLight;

  useEffect(() => {
    if (otherUser) return;
    api.listConversations().then((data) => {
      const conv = data.conversations.find((c: any) => c.id === conversationId);
      if (conv) setOtherUser(conv.otherUser);
    });
  }, [conversationId, otherUser]);

  useEffect(() => {
    setLoading(true);
    api.getMessages(conversationId).then((d) => setMessages(d.messages)).finally(() => setLoading(false));
    api.markSeen(conversationId).catch(() => {});
    api.getLateStats(conversationId).then((d) => setTodayStat(d.stat)).catch(() => {});
    api.getReactions(conversationId).then((d) => setReactions(d.reactions)).catch(() => {});
    api.getTheme(conversationId).then((d) => setThemeId(d.theme)).catch(() => {});
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
        setOtherTypingText('');
      }
    }
    function onSeen({ conversationId: cid, seenAt }: any) {
      if (cid !== conversationId) return;
      setMessages((prev) => prev.map((m) => (m.sender === user?.id && !m.seenAt ? { ...m, seenAt } : m)));
    }
    function onTyping({ conversationId: cid, userId, isTyping, text: t }: any) {
      if (cid !== conversationId || userId === user?.id) return;
      setOtherTyping(isTyping);
      setOtherTypingText(isTyping ? t || '' : '');
    }
    function onPresence({ userId, isOnline, lastSeen }: any) {
      setOtherUser((prev) => (prev && prev.id === userId ? { ...prev, isOnline, lastSeen: lastSeen || prev.lastSeen } : prev));
    }
    function onLateStats(stat: LateStat) {
      if (stat.conversation === conversationId) setTodayStat(stat);
    }
    function onCopresence({ conversationId: cid, bothHere: bh }: any) {
      if (cid === conversationId) setBothHere(bh);
    }
    function onNudge({ conversationId: cid }: any) {
      if (cid !== conversationId) return;
      navigator.vibrate?.([40, 60, 40]);
      setNudgePulse(true);
      setTimeout(() => setNudgePulse(false), 1000);
    }
    function onEffect({ conversationId: cid, kind }: any) {
      if (cid !== conversationId) return;
      fxCounter.current += 1;
      setFx({ kind: kind === 'confetti' ? 'confetti' : 'hearts', id: fxCounter.current });
    }
    function onReaction({ messageId, userId, emoji }: any) {
      setReactions((prev) => {
        const copy = { ...prev };
        const forMsg = { ...(copy[messageId] || {}) };
        if (emoji == null) delete forMsg[userId];
        else forMsg[userId] = emoji;
        if (Object.keys(forMsg).length) copy[messageId] = forMsg;
        else delete copy[messageId];
        return copy;
      });
    }
    function onMessageDeleted({ id, conversationId: cid }: any) {
      if (cid && cid !== conversationId) return;
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }
    function onConvUpdated({ id, theme: t }: any) {
      if (id === conversationId) setThemeId(t ?? null);
    }
    function onConvDeleted({ id }: any) {
      if (id === conversationId) navigate('/');
    }

    socket.on('message:new', onNewMessage);
    socket.on('message:seen', onSeen);
    socket.on('typing', onTyping);
    socket.on('presence:update', onPresence);
    socket.on('late-stats:update', onLateStats);
    socket.on('copresence', onCopresence);
    socket.on('nudge', onNudge);
    socket.on('effect', onEffect);
    socket.on('reaction:update', onReaction);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('conversation:updated', onConvUpdated);
    socket.on('conversation:deleted', onConvDeleted);
    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:seen', onSeen);
      socket.off('typing', onTyping);
      socket.off('presence:update', onPresence);
      socket.off('late-stats:update', onLateStats);
      socket.off('copresence', onCopresence);
      socket.off('nudge', onNudge);
      socket.off('effect', onEffect);
      socket.off('reaction:update', onReaction);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('conversation:updated', onConvUpdated);
      socket.off('conversation:deleted', onConvDeleted);
    };
  }, [socket, conversationId, user, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, otherTyping, otherTypingText]);

  // Abandon any in-progress recording if we leave the room.
  useEffect(() => {
    return () => {
      recordCancelledRef.current = true;
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') rec.stop();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  // Decrypt encrypted text bodies once the key is available.
  useEffect(() => {
    if (!cryptoKey) return;
    let cancelled = false;
    (async () => {
      const updates: Record<string, string> = {};
      for (const m of messages) {
        if (m.isEncrypted && isEncryptedText(m.text) && decrypted[m.id] === undefined) {
          try {
            updates[m.id] = await decryptText(cryptoKey, m.text);
          } catch {
            updates[m.id] = '⚠️ Unable to decrypt';
          }
        }
      }
      if (!cancelled && Object.keys(updates).length) setDecrypted((prev) => ({ ...prev, ...updates }));
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, cryptoKey, decrypted]);

  // If an encrypted message shows up but this device thinks encryption is off
  // (e.g. the partner just turned it on), re-check the conversation metadata.
  useEffect(() => {
    if (encStatus === 'off' && !refreshedForEnc.current && messages.some((m) => m.isEncrypted)) {
      refreshedForEnc.current = true;
      crypto.refresh();
    }
  }, [encStatus, messages, crypto]);

  // Decrypted body (or a placeholder) to render for a message.
  function bodyFor(m: ChatMessage): string {
    if (!m.isEncrypted) return m.text;
    if (isEncryptedText(m.text)) {
      return decrypted[m.id] ?? (cryptoKey ? '' : '🔒 Encrypted message');
    }
    return m.text || ''; // encrypted media-only message: no text body
  }

  function handleTextChange(v: string) {
    setText(v);
    if (!socket) return;
    socket.emit('typing', { conversationId, isTyping: v.length > 0, text: v });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit('typing', { conversationId, isTyping: false, text: '' }), 2500);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !socket) return;
    // Encryption enabled on this conversation but locked on this device — must
    // unlock before sending (otherwise we'd leak plaintext into an E2EE chat).
    if (encStatus === 'locked') {
      setShowEncModal(true);
      return;
    }
    const wasWhisper = whisper;
    const encrypt = encStatus === 'ready' && !!cryptoKey;
    let payloadText = trimmed;
    let marker: 'greet' | 'bye' | null = null;
    if (encrypt) {
      marker = greetMarker(trimmed);
      try {
        payloadText = await encryptText(cryptoKey!, trimmed);
      } catch {
        window.alert('Encryption failed — message not sent.');
        return;
      }
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      conversation: conversationId,
      sender: user!.id,
      receiver: otherUser?.id || '',
      text: encrypt ? payloadText : trimmed,
      createdAt: new Date().toISOString(),
      seenAt: null,
      delayMs: null,
      isWhisper: wasWhisper,
      isEncrypted: encrypt,
    };
    if (encrypt) setDecrypted((prev) => ({ ...prev, [tempId]: trimmed }));
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    setWhisper(false);
    socket.emit('typing', { conversationId, isTyping: false, text: '' });

    socket.emit(
      'message:send',
      { conversationId, text: payloadText, isWhisper: wasWhisper, isEncrypted: encrypt, encMarker: marker },
      (res: any) => {
        if (res?.message) {
          if (encrypt) setDecrypted((prev) => ({ ...prev, [res.message.id]: trimmed }));
          setMessages((prev) => {
            const already = prev.some((m) => m.id === res.message.id);
            if (already) return prev.filter((m) => m.id !== tempId);
            return prev.map((m) => (m.id === tempId ? res.message : m));
          });
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      }
    );
  }

  // --- attachments (image + voice) -----------------------------------------
  async function sendAttachment(blob: Blob, type: AttachmentType, ext: string, durationMs?: number) {
    if (!socket || !user) return;
    if (encStatus === 'locked') {
      setShowEncModal(true);
      return;
    }
    const encrypt = encStatus === 'ready' && !!cryptoKey;
    const wasWhisper = whisper;
    setWhisper(false);
    // Optimistic bubble shows the local plaintext (not encrypted) so it appears
    // instantly; the server row that replaces it carries the encrypted URL.
    const localUrl = URL.createObjectURL(blob);
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      conversation: conversationId,
      sender: user.id,
      receiver: otherUser?.id || '',
      text: '',
      createdAt: new Date().toISOString(),
      seenAt: null,
      delayMs: null,
      isWhisper: wasWhisper,
      attachmentUrl: localUrl,
      attachmentType: type,
      attachmentDurationMs: durationMs ?? null,
      isEncrypted: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    setUploading(true);
    try {
      // Encrypt the bytes before upload so Storage only holds ciphertext.
      const toUpload = encrypt ? await encryptFile(cryptoKey!, blob) : blob;
      const uploadExt = encrypt ? 'enc' : ext;
      const { url } = await api.uploadMedia(conversationId, toUpload, uploadExt);
      socket.emit(
        'message:send',
        {
          conversationId,
          text: '',
          isWhisper: wasWhisper,
          attachmentUrl: url,
          attachmentType: type,
          attachmentDurationMs: durationMs,
          isEncrypted: encrypt,
        },
        (res: any) => {
          URL.revokeObjectURL(localUrl);
          if (res?.message) {
            setMessages((prev) => {
              const already = prev.some((m) => m.id === res.message.id);
              if (already) return prev.filter((m) => m.id !== tempId);
              return prev.map((m) => (m.id === tempId ? res.message : m));
            });
          } else {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            window.alert(res?.error || 'Failed to send attachment.');
          }
        }
      );
    } catch (err: any) {
      URL.revokeObjectURL(localUrl);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      window.alert(err?.message || 'Upload failed. Has the media.sql migration been run?');
    } finally {
      setUploading(false);
    }
  }

  function pickImage() {
    fileInputRef.current?.click();
  }
  async function onImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    if (!file.type.startsWith('image/')) return window.alert('Please choose an image file.');
    if (file.size > MAX_IMAGE_BYTES) return window.alert('Image is too large (max 10 MB).');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    await sendAttachment(file, 'image', ext);
  }

  async function startRecording() {
    if (recording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      return window.alert('Voice recording is not supported on this device.');
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return window.alert('Microphone access was denied.');
    }
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(
      (t) => MediaRecorder.isTypeSupported?.(t)
    );
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = rec;
    chunksRef.current = [];
    recordCancelledRef.current = false;
    recordStartRef.current = Date.now();

    rec.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      const durationMs = Date.now() - recordStartRef.current;
      setRecording(false);
      setRecordMs(0);
      if (recordCancelledRef.current) return;
      if (durationMs < 500 || chunksRef.current.length === 0) return; // too short — ignore
      const actualType = rec.mimeType || mimeType || 'audio/webm';
      const ext = actualType.includes('mp4') ? 'm4a' : 'webm';
      const blob = new Blob(chunksRef.current, { type: actualType });
      void sendAttachment(blob, 'audio', ext, durationMs);
    };

    rec.start();
    setRecording(true);
    setRecordMs(0);
    recordTimerRef.current = setInterval(() => setRecordMs(Date.now() - recordStartRef.current), 200);
  }
  function stopRecording() {
    recordCancelledRef.current = false;
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }
  function cancelRecording() {
    recordCancelledRef.current = true;
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }

  function doReact(m: ChatMessage, emoji: string) {
    if (!user) return;
    const mineEmoji = reactions[m.id]?.[user.id];
    if (mineEmoji === emoji) {
      setReactions((prev) => onReactionLocal(prev, m.id, user.id, null));
      api.removeReaction(m.id).catch(() => {});
    } else {
      setReactions((prev) => onReactionLocal(prev, m.id, user.id, emoji));
      api.setReaction(m.id, conversationId, emoji).catch(() => {});
    }
  }
  function onReactionLocal(prev: ReactionMap, messageId: string, userId: string, emoji: string | null): ReactionMap {
    const copy = { ...prev };
    const forMsg = { ...(copy[messageId] || {}) };
    if (emoji == null) delete forMsg[userId];
    else forMsg[userId] = emoji;
    if (Object.keys(forMsg).length) copy[messageId] = forMsg;
    else delete copy[messageId];
    return copy;
  }

  function doDelete(m: ChatMessage) {
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    setActionMsg(null);
    api.deleteMessage(m.id).catch(() => {});
  }

  function playEffect(kind: 'hearts' | 'confetti') {
    fxCounter.current += 1;
    setFx({ kind, id: fxCounter.current });
    socket?.emit('effect', { conversationId, kind });
  }
  function sendNudge() {
    socket?.emit('nudge', { conversationId });
    navigator.vibrate?.(30);
    setNudgePulse(true);
    setTimeout(() => setNudgePulse(false), 1000);
  }

  function chooseTheme(id: string) {
    setThemeId(id);
    setShowThemes(false);
    api.setTheme(conversationId, id).catch(() => {});
  }
  function deleteChat() {
    setMenuOpen(false);
    if (!window.confirm(`Delete your entire chat with @${otherUser?.username}? This can't be undone.`)) return;
    api.deleteConversation(conversationId).then(() => navigate('/')).catch(() => {});
  }

  function onLockClick() {
    if (encStatus === 'ready') {
      if (window.confirm('Lock encrypted messages on this device? You will need the shared secret to read them again.')) {
        crypto.lock();
      }
    } else if (encStatus === 'off' || encStatus === 'locked') {
      setShowEncModal(true);
    }
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

  return (
    <div className="chat-surface relative flex h-[100dvh] flex-col" style={{ backgroundColor: bg }}>
      {bothHere && <div className="copresence-glow animate-glow-pulse" />}

      <header className="safe-top sticky top-0 z-30 border-b border-black/5 bg-white/70 backdrop-blur dark:border-white/5 dark:bg-black/30">
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
              {bothHere ? (
                <span className="font-medium text-pink-500 dark:text-pink-400">✨ you're both here</span>
              ) : otherTyping ? (
                <span className="text-brand-500 dark:text-brand-400">typing…</span>
              ) : (
                formatLastSeen(!!otherUser?.isOnline, otherUser?.lastSeen || null)
              )}
            </p>
          </div>
          <button
            onClick={onLockClick}
            title={
              encStatus === 'ready'
                ? 'Encrypted — tap to lock on this device'
                : encStatus === 'locked'
                ? 'Locked — tap to unlock'
                : 'Turn on encryption'
            }
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base transition active:scale-90 ${
              encStatus === 'ready'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                : encStatus === 'locked'
                ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                : 'bg-slate-100 text-slate-400 dark:bg-white/10'
            }`}
          >
            {encStatus === 'off' ? '🔓' : '🔒'}
          </button>
          <button
            onClick={() => setShowStatsSheet(true)}
            className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20"
          >
            ⏱ {formatDuration(myLateMs)}
          </button>
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
            >
              ⋮
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-40 w-44 overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-black/5 dark:bg-[#17181f] dark:ring-white/10">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setShowThemes(true);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  🎨 Chat theme
                </button>
                <button
                  onClick={deleteChat}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  🗑 Delete chat
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-4" onClick={() => menuOpen && setMenuOpen(false)}>
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
                <span className="rounded-full bg-black/5 px-3 py-1 text-[11px] font-medium text-slate-500 dark:bg-white/5 dark:text-slate-400">
                  {group.day}
                </span>
              </div>
              {group.items.map((m) => (
                <MessageBubble
                  key={m.id}
                  m={m}
                  mine={m.sender === user?.id}
                  mineClass={theme.mine}
                  reactions={reactions[m.id]}
                  displayText={bodyFor(m)}
                  cryptoKey={cryptoKey}
                  onQuickReact={() => doReact(m, '❤️')}
                  onOpenActions={() => setActionMsg(m)}
                />
              ))}
            </div>
          ))
        )}
        {otherTyping && (
          <div className="flex justify-start">
            {otherTypingText ? (
              <div className="max-w-[76%] rounded-2xl rounded-bl-sm bg-white/70 px-3.5 py-2.5 text-sm italic text-slate-500 shadow-sm dark:bg-white/5 dark:text-slate-400">
                {otherTypingText}
                <span className="ml-0.5 animate-blink">▍</span>
              </div>
            ) : (
              <TypingDots />
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      {nudgePulse && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className="animate-heartbeat text-8xl drop-shadow-lg">💗</div>
        </div>
      )}

      <EffectsOverlay fx={fx} />

      <form
        onSubmit={sendMessage}
        className="safe-bottom border-t border-black/5 bg-white/70 px-3 pb-12 pt-2.5 backdrop-blur dark:border-white/5 dark:bg-black/30"
      >
        {whisper && (
          <div className="mb-2 flex items-center gap-1 px-1 text-[11px] font-medium text-brand-500 dark:text-brand-400">
            🫧 Whisper mode — this message arrives blurred
          </div>
        )}

        {encStatus === 'locked' && (
          <button
            type="button"
            onClick={() => setShowEncModal(true)}
            className="mb-2 flex w-full items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-left text-[12px] font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400"
          >
            🔒 Locked — tap to unlock and read/send encrypted messages
          </button>
        )}
        {encStatus === 'ready' && (
          <div className="mb-2 flex items-center gap-1 px-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            🔒 End-to-end encrypted
          </div>
        )}

        {/* Row 1 — quick actions & attachments, all on one line */}
        <div className="no-scrollbar mb-2 flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={pickImage}
            disabled={uploading || recording}
            title="Send photo"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-lg transition active:scale-90 disabled:opacity-40 dark:bg-sky-500/10"
          >
            🖼️
          </button>
          <button
            type="button"
            onClick={startRecording}
            disabled={uploading || recording}
            title="Record voice note"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-lg transition active:scale-90 disabled:opacity-40 dark:bg-violet-500/10"
          >
            🎤
          </button>
          <span className="mx-0.5 h-6 w-px shrink-0 bg-black/10 dark:bg-white/10" />
          <button
            type="button"
            onClick={sendNudge}
            title="Nudge"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-50 text-lg transition active:scale-90 dark:bg-pink-500/10"
          >
            💗
          </button>
          <button
            type="button"
            onClick={() => playEffect('hearts')}
            title="Send hearts"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-lg transition active:scale-90 dark:bg-rose-500/10"
          >
            ❤️
          </button>
          <button
            type="button"
            onClick={() => playEffect('confetti')}
            title="Confetti"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-lg transition active:scale-90 dark:bg-amber-500/10"
          >
            🎉
          </button>
          <button
            type="button"
            onClick={() => setWhisper((v) => !v)}
            title="Whisper"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg transition active:scale-90 ${
              whisper ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-white/10'
            }`}
          >
            🫧
          </button>
          {uploading && <span className="ml-1 shrink-0 text-xs text-slate-400">Uploading…</span>}
        </div>

        {/* Row 2 — text input + send, or the recording bar */}
        {recording ? (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-500/20 dark:bg-red-500/10">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            <span className="tabular-nums text-sm font-semibold text-red-600 dark:text-red-400">
              {formatClock(recordMs)}
            </span>
            <span className="text-xs text-red-400">Recording…</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                title="Cancel"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-base text-slate-500 transition active:scale-90 dark:bg-white/10 dark:text-slate-300"
              >
                🗑
              </button>
              <button
                type="button"
                onClick={stopRecording}
                title="Send voice note"
                className={`flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition active:scale-90 ${theme.mine}`}
              >
                ➤
              </button>
            </div>
          </div>
        ) : (
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
              placeholder={
                whisper ? 'Whisper something…' : encStatus === 'ready' ? 'Type an encrypted message…' : 'Type a message…'
              }
              rows={1}
              className="max-h-28 flex-1 resize-none rounded-3xl border border-transparent bg-slate-100 px-5 py-3 text-sm outline-none transition focus:border-brand-500/30 focus:bg-white focus:ring-2 focus:ring-brand-500/30 dark:bg-white/10 dark:text-white dark:focus:bg-white/[0.07]"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition active:scale-90 disabled:opacity-40 ${theme.mine}`}
            >
              ➤
            </button>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onImageSelected} />
      </form>

      {showEncModal && (
        <EncryptionModal
          mode={encStatus === 'off' ? 'enable' : 'unlock'}
          otherName={otherUser?.username}
          error={crypto.error}
          onSubmit={encStatus === 'off' ? crypto.enable : crypto.unlock}
          onClose={() => setShowEncModal(false)}
        />
      )}

      {actionMsg && user && (
        <MessageActions
          isMine={actionMsg.sender === user.id}
          currentReaction={reactions[actionMsg.id]?.[user.id]}
          onReact={(emoji) => {
            doReact(actionMsg, emoji);
            setActionMsg(null);
          }}
          onDelete={() => doDelete(actionMsg)}
          onClose={() => setActionMsg(null)}
        />
      )}

      {showThemes && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowThemes(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="safe-bottom w-full max-w-md animate-pop-in rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-[#15161d]"
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />
            <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">🎨 Chat theme</h2>
            <div className="grid grid-cols-3 gap-3">
              {CHAT_THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => chooseTheme(t.id)}
                  className={`flex flex-col items-center gap-2 rounded-2xl p-3 ring-1 transition active:scale-95 ${
                    themeId === t.id || (!themeId && t.id === 'default')
                      ? 'ring-brand-500'
                      : 'ring-slate-200 dark:ring-white/10'
                  }`}
                >
                  <span className="h-10 w-10 rounded-full shadow-inner" style={{ background: t.swatch }} />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{t.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowThemes(false)}
              className="mt-5 w-full rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

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
