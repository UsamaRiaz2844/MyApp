import { useRef, useState } from 'react';
import SeenTicks from './SeenTicks';
import MediaAttachment from './MediaAttachment';
import { formatMessageTime } from '../utils/format';
import type { ChatMessage } from '../types';

export interface QuotedPreview {
  author: string; // "You" or "@partner"
  label: string; // snippet or "📷 Photo" / "🎤 Voice message"
  mine: boolean; // whether the quoted message was sent by me
}

interface Props {
  m: ChatMessage;
  mine: boolean;
  mineClass: string; // theme bubble classes for own messages
  theirClass?: string; // theme bubble classes for received messages
  mineMeta?: string; // meta-row text colour on my bubble
  reactions?: Record<string, string>; // userId -> emoji
  displayText?: string; // decrypted/plaintext body to render (falls back to m.text)
  cryptoKey?: CryptoKey | null; // for decrypting encrypted media
  quoted?: QuotedPreview | null; // the message this one replies to
  highlighted?: boolean; // briefly flash when jumped to from a reply
  onQuickReact: () => void; // double-tap
  onOpenActions: () => void; // long-press
  onReply: () => void; // swipe-right / reply action
  onQuoteTap?: () => void; // tap the quoted preview to jump to the original
}

const REPLY_THRESHOLD = 52; // px of drag needed to trigger a reply

export default function MessageBubble({
  m,
  mine,
  mineClass,
  theirClass,
  mineMeta,
  reactions,
  displayText,
  cryptoKey,
  quoted,
  highlighted,
  onQuickReact,
  onOpenActions,
  onReply,
  onQuoteTap,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const [dragX, setDragX] = useState(0);
  const lastTap = useRef(0);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const dxRef = useRef(0);

  const isBlurredWhisper = !!(m.isWhisper && !mine && !revealed);
  const reactionList = reactions ? Object.values(reactions) : [];
  const hasImage = m.attachmentType === 'image' && !!m.attachmentUrl;
  const hasAudio = m.attachmentType === 'audio' && !!m.attachmentUrl;
  const hasMedia = hasImage || hasAudio;
  const body = displayText ?? m.text;

  function onPointerDown(e: React.PointerEvent) {
    longPressed.current = false;
    didDrag.current = false;
    dragging.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      onOpenActions();
    }, 450);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (!dragging.current) {
      if (dx > 10 && Math.abs(dx) > Math.abs(dy)) {
        dragging.current = true;
        didDrag.current = true;
        if (pressTimer.current) clearTimeout(pressTimer.current);
      } else if (Math.abs(dy) > 10) {
        dragStart.current = null; // vertical scroll — let it through
        return;
      }
    }
    if (dragging.current) {
      const clamped = Math.max(0, Math.min(72, dx));
      dxRef.current = clamped;
      setDragX(clamped);
    }
  }

  function finishDrag() {
    if (dragStart.current) dragStart.current = null;
    if (dragging.current) {
      const shouldReply = dxRef.current > REPLY_THRESHOLD;
      dragging.current = false;
      dxRef.current = 0;
      setDragX(0);
      if (shouldReply) {
        longPressed.current = true; // suppress the click that follows
        onReply();
      }
    }
  }

  function onPointerUp() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    finishDrag();
  }

  function handleClick() {
    if (longPressed.current || didDrag.current) return; // long-press / swipe handled it
    if (isBlurredWhisper) {
      setRevealed(true);
      return;
    }
    if (m.isWhisper && !mine) {
      setRevealed((v) => !v);
      return;
    }
    const now = Date.now();
    if (now - lastTap.current < 300) onQuickReact();
    lastTap.current = now;
  }

  return (
    <div id={`msg-${m.id}`} className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className="relative max-w-[76%]">
        {/* reply hint that appears as you swipe right */}
        <div
          className="pointer-events-none absolute inset-y-0 -left-9 flex items-center text-brand-500 dark:text-brand-400"
          style={{ opacity: Math.min(1, dragX / REPLY_THRESHOLD) }}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm dark:bg-brand-500/20">
            ↩︎
          </span>
        </div>

        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          onClick={handleClick}
          style={{
            transform: dragX ? `translateX(${dragX}px)` : undefined,
            transition: dragX ? 'none' : 'transform 0.18s ease-out',
            touchAction: 'pan-y',
          }}
          className={`animate-pop-in select-none text-sm shadow-sm ${
            hasImage ? 'overflow-hidden p-1' : 'px-3.5 py-2.5'
          } rounded-2xl ${
            mine
              ? `rounded-br-sm ${mineClass}`
              : `rounded-bl-sm ${theirClass ?? 'bg-white text-slate-800 dark:bg-white/10 dark:text-slate-100'}`
          } ${reactionList.length ? 'mb-2' : ''} ${highlighted ? 'ring-2 ring-brand-400' : ''} ${
            (m.delayMs ?? 0) > 600000 ? 'ring-2 ring-red-500/70' : ''
          }`}
        >
          {quoted && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onQuoteTap?.();
              }}
              className={`mb-1.5 flex flex-col gap-0.5 rounded-lg border-l-2 px-2 py-1 ${
                hasImage ? 'mx-1 mt-1' : ''
              } ${
                mine ? 'border-white/70 bg-white/15' : 'border-brand-500 bg-black/5 dark:border-brand-400 dark:bg-white/5'
              }`}
            >
              <span className={`text-[11px] font-semibold ${mine ? 'text-white/90' : 'text-brand-600 dark:text-brand-300'}`}>
                {quoted.author}
              </span>
              <span className={`truncate text-[11px] ${mine ? 'text-white/80' : 'text-slate-500 dark:text-slate-300'}`}>
                {quoted.label}
              </span>
            </div>
          )}

          {m.isWhisper && (
            <span className={`block text-[10px] ${hasImage ? 'px-2.5 pb-1 pt-1.5' : 'mb-0.5'} ${mine ? 'text-white/70' : 'text-slate-400'}`}>
              🫧 whisper{isBlurredWhisper ? ' · tap to reveal' : ''}
            </span>
          )}

          {hasMedia && (
            <MediaAttachment
              type={hasImage ? 'image' : 'audio'}
              url={m.attachmentUrl!}
              durationMs={m.attachmentDurationMs ?? null}
              encrypted={!!m.isEncrypted}
              cryptoKey={cryptoKey ?? null}
              mine={mine}
              blurred={isBlurredWhisper}
            />
          )}

          {body && (
            <p
              className={`whitespace-pre-wrap break-words ${hasImage ? 'px-2.5 pt-1.5' : hasMedia ? 'mt-1.5' : ''} ${
                isBlurredWhisper ? 'whisper-hidden' : 'whisper-shown'
              }`}
            >
              {body}
            </p>
          )}

          <div
            className={`flex items-center justify-end gap-1 text-[10px] ${
              hasImage ? 'px-2.5 pb-1 pt-1' : 'mt-1'
            } ${mine ? mineMeta ?? 'text-white/80' : 'text-slate-400'}`}
          >
            {(m.delayMs ?? 0) > 600000 && <span className="font-semibold text-red-400">⏰ late reply</span>}
            {m.editedAt && <span className="italic opacity-80">edited</span>}
            <span>{formatMessageTime(m.createdAt)}</span>
            {mine && <SeenTicks seen={!!m.seenAt} />}
          </div>
        </div>

        {reactionList.length > 0 && (
          <div className={`absolute -bottom-2.5 ${mine ? 'right-2' : 'left-2'} flex gap-0.5`}>
            {reactionList.map((e, i) => (
              <span
                key={i}
                className="animate-reaction-pop rounded-full bg-white px-1.5 py-0.5 text-xs shadow ring-1 ring-black/5 dark:bg-[#22232c] dark:ring-white/10"
              >
                {e}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
