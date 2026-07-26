// Shared chat cat: its mood is derived on the client from the latest message
// (recency + any emoji in it), and its growth (level) comes from a daily "both
// of you chatted" streak stored on the conversation.

export type CatMood = 'excited' | 'happy' | 'love' | 'neutral' | 'sad' | 'crying' | 'angry' | 'sleeping';

const CRY = ['😭', '😢', '😿', '💔', '🥺'];
const ANGRY = ['😠', '😡', '🤬', '😤', '💢', '👿'];
const LOVE = ['❤️', '❤', '🥰', '😍', '😻', '💕', '💗', '💖', '😘', '💞', '💘'];
const HAPPY = ['😂', '🤣', '😄', '😁', '😊', '😺', '😸', '🎉', '🥳', '😆'];

function hasAny(text: string, list: string[]): boolean {
  return list.some((e) => text.includes(e));
}

// `text` is the decrypted body of the most recent message (may be empty for
// encrypted/media); `ageMs` is how long ago it was sent.
export function catMood(text: string | null, ageMs: number | null): CatMood {
  if (ageMs == null) return 'sleeping'; // no messages yet
  // Fresh emoji reactions (only right after the message).
  if (text && ageMs < 20 * 60_000) {
    if (hasAny(text, CRY)) return 'crying';
    if (hasAny(text, ANGRY)) return 'angry';
    if (hasAny(text, LOVE)) return 'love';
    if (hasAny(text, HAPPY)) return 'happy';
  }
  if (ageMs < 3 * 60_000) return 'excited'; // someone just messaged
  if (ageMs < 2 * 3_600_000) return 'happy'; // chatted recently
  if (ageMs < 10 * 3_600_000) return 'neutral';
  if (ageMs < 24 * 3_600_000) return 'sad'; // quiet for a while
  return 'crying'; // ignored for over a day
}

interface CatLook {
  face: string;
  anim: string;
  extra: string | null; // a floating emoji
}

export function catLook(mood: CatMood): CatLook {
  switch (mood) {
    case 'excited':
      return { face: '😸', anim: 'animate-cat-bounce', extra: '✨' };
    case 'happy':
      return { face: '😺', anim: 'animate-cat-bob', extra: null };
    case 'love':
      return { face: '😻', anim: 'animate-cat-bob', extra: '💕' };
    case 'crying':
      return { face: '😿', anim: 'animate-cat-shake', extra: '💧' };
    case 'angry':
      return { face: '😾', anim: 'animate-cat-shake', extra: '💢' };
    case 'sad':
      return { face: '😿', anim: 'animate-cat-bob', extra: null };
    case 'sleeping':
      return { face: '🐱', anim: 'animate-cat-bob', extra: '💤' };
    default:
      return { face: '🐱', anim: 'animate-cat-bob', extra: null };
  }
}

export function moodLabel(mood: CatMood): string {
  const map: Record<CatMood, string> = {
    excited: 'excited',
    happy: 'happy',
    love: 'in love',
    neutral: 'content',
    sad: 'sad',
    crying: 'crying',
    angry: 'grumpy',
    sleeping: 'napping',
  };
  return map[mood];
}

// Level grows with the number of days you've both chatted (pet_xp).
export function petLevel(xp: number | null | undefined): number {
  const x = xp || 0;
  return Math.max(1, Math.floor(Math.sqrt(x)) + 1);
}
