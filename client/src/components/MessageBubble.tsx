import { useRef, useState } from 'react';
import SeenTicks from './SeenTicks';
import VoiceNote from './VoiceNote';
import { formatMessageTime } from '../utils/format';
import type { ChatMessage } from '../types';

interface Props {
  m: ChatMessage;
  mine: boolean;
  mineClass: string; // theme bubble classes for own messages
  reactions?: Record<string, string>; // userId -> emoji
  onQuickReact: () => void; // double-tap
  onOpenActions: () => void; // long-press
}

export default function MessageBubble({ m, mine, mineClass, reactions, onQuickReact, onOpenActions }: Props) {
  const [revealed, setRevealed] = useState(false);
  const lastTap = useRef(0);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const isBlurredWhisper = m.isWhisper && !mine && !revealed;
  const reactionList = reactions ? Object.values(reactions) : [];
  const hasImage = m.attachmentType === 'image' && !!m.attachmentUrl;
  const hasAudio = m.attachmentType === 'audio' && !!m.attachmentUrl;
  const hasMedia = hasImage || hasAudio;

  function startPress() {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      onOpenActions();
    }, 450);
  }
  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  function handleClick() {
    if (longPressed.current) return; // long-press already handled
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
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className="relative max-w-[76%]">
        <div
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onContextMenu={(e) => e.preventDefault()}
          onClick={handleClick}
          className={`animate-pop-in select-none text-sm shadow-sm ${
            hasImage ? 'overflow-hidden p-1' : 'px-3.5 py-2.5'
          } rounded-2xl ${
            mine ? `rounded-br-sm ${mineClass}` : 'rounded-bl-sm bg-white text-slate-800 dark:bg-white/10 dark:text-slate-100'
          } ${reactionList.length ? 'mb-2' : ''}`}
        >
          {m.isWhisper && (
            <span className={`block text-[10px] ${hasImage ? 'px-2.5 pb-1 pt-1.5' : 'mb-0.5'} ${mine ? 'text-white/70' : 'text-slate-400'}`}>
              🫧 whisper{isBlurredWhisper ? ' · tap to reveal' : ''}
            </span>
          )}

          {hasImage && (
            <img
              src={m.attachmentUrl!}
              alt="shared"
              loading="lazy"
              onClick={(e) => {
                if (isBlurredWhisper) return; // let the bubble handler reveal it
                e.stopPropagation();
                window.open(m.attachmentUrl!, '_blank', 'noopener');
              }}
              className={`block max-h-72 w-full max-w-[260px] rounded-xl object-cover ${
                isBlurredWhisper ? 'whisper-hidden' : 'whisper-shown'
              }`}
            />
          )}

          {hasAudio && (
            <div className={isBlurredWhisper ? 'whisper-hidden' : 'whisper-shown'}>
              <VoiceNote src={m.attachmentUrl!} durationMs={m.attachmentDurationMs ?? null} mine={mine} />
            </div>
          )}

          {m.text && (
            <p
              className={`whitespace-pre-wrap break-words ${hasImage ? 'px-2.5 pt-1.5' : hasMedia ? 'mt-1.5' : ''} ${
                isBlurredWhisper ? 'whisper-hidden' : 'whisper-shown'
              }`}
            >
              {m.text}
            </p>
          )}

          <div
            className={`flex items-center justify-end gap-1 text-[10px] ${
              hasImage ? 'px-2.5 pb-1 pt-1' : 'mt-1'
            } ${mine ? 'text-white/80' : 'text-slate-400'}`}
          >
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
