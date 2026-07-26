// Mood/status picked from a preset list. Stored as a single "emoji label" string
// (e.g. "😊 Happy") on the profile so the other person sees it live, and cached
// locally for my own display.

export interface Mood {
  e: string;
  l: string;
}

export const MOODS: Mood[] = [
  { e: '😊', l: 'Happy' },
  { e: '🥰', l: 'In love' },
  { e: '😎', l: 'Cool' },
  { e: '😴', l: 'Sleepy' },
  { e: '😔', l: 'Sad' },
  { e: '😤', l: 'Annoyed' },
  { e: '🥱', l: 'Bored' },
  { e: '🤒', l: 'Sick' },
  { e: '🎉', l: 'Excited' },
  { e: '🧠', l: 'Focused' },
  { e: '☕', l: 'Chilling' },
  { e: '🍔', l: 'Hungry' },
  { e: '😢', l: 'Crying' },
  { e: '😐', l: 'Meh' },
  { e: '💪', l: 'Motivated' },
  { e: '🥳', l: 'Celebrating' },
];

export function moodString(m: Mood): string {
  return `${m.e} ${m.l}`;
}

const LS = 'pronto_my_mood';
export function loadMyMood(): string | null {
  try {
    return localStorage.getItem(LS);
  } catch {
    return null;
  }
}
export function saveMyMood(m: string | null) {
  try {
    if (m) localStorage.setItem(LS, m);
    else localStorage.removeItem(LS);
  } catch {
    /* ignore */
  }
}
