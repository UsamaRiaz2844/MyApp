import { memo } from 'react';
import MessageBubble, { QuotedPreview } from './MessageBubble';
import { formatDayLabel } from '../utils/format';
import { isEncryptedText } from '../lib/crypto';
import type { ChatMessage, ReactionMap } from '../types';
import type { ChatTheme } from '../lib/themes';

interface Props {
  messages: ChatMessage[];
  myId?: string;
  otherUsername?: string;
  theme: ChatTheme;
  reactions: ReactionMap;
  decrypted: Record<string, string>;
  cryptoKey: CryptoKey | null;
  highlightId: string | null;
  onQuickReact: (m: ChatMessage) => void;
  onOpenActions: (m: ChatMessage) => void;
  onReply: (m: ChatMessage) => void;
  onQuoteTap: (replyToId: string) => void;
}

// The scrollable message list. Extracted and memoized so typing in the composer
// (which lives in the parent) doesn't re-render every bubble — the big cause of
// input lag on long chats.
function MessageListInner({
  messages,
  myId,
  otherUsername,
  theme,
  reactions,
  decrypted,
  cryptoKey,
  highlightId,
  onQuickReact,
  onOpenActions,
  onReply,
  onQuoteTap,
}: Props) {
  const byId = new Map<string, ChatMessage>();
  for (const m of messages) byId.set(m.id, m);

  function bodyFor(m: ChatMessage): string {
    if (!m.isEncrypted) return m.text;
    if (isEncryptedText(m.text)) return decrypted[m.id] ?? (cryptoKey ? '' : '🔒 Encrypted message');
    return m.text || '';
  }
  function describe(m: ChatMessage): QuotedPreview {
    const mine = m.sender === myId;
    let label: string;
    if (m.attachmentType === 'image') label = '📷 Photo';
    else if (m.attachmentType === 'audio') label = '🎤 Voice message';
    else label = bodyFor(m) || 'Message';
    return { author: mine ? 'You' : `@${otherUsername ?? ''}`, label, mine };
  }
  function quotedFor(m: ChatMessage): QuotedPreview | null {
    if (!m.replyTo) return null;
    const orig = byId.get(m.replyTo);
    if (!orig) return { author: 'Message', label: 'Message unavailable', mine: false };
    return describe(orig);
  }

  const groups: { day: string; items: ChatMessage[] }[] = [];
  for (const m of messages) {
    const day = formatDayLabel(m.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(m);
    else groups.push({ day, items: [m] });
  }

  return (
    <>
      {groups.map((group) => (
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
              mine={m.sender === myId}
              mineClass={theme.mine}
              theirClass={theme.theirs}
              mineMeta={theme.mineMeta}
              reactions={reactions[m.id]}
              displayText={bodyFor(m)}
              cryptoKey={cryptoKey}
              quoted={quotedFor(m)}
              highlighted={highlightId === m.id}
              onQuickReact={() => onQuickReact(m)}
              onOpenActions={() => onOpenActions(m)}
              onReply={() => onReply(m)}
              onQuoteTap={() => m.replyTo && onQuoteTap(m.replyTo)}
            />
          ))}
        </div>
      ))}
    </>
  );
}

export default memo(MessageListInner);
