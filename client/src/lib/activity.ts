// "What are you up to?" status + a daily 1–10 "how was your day" score. Both are
// stored on the profile (streamed via presence) and cached locally for my own view.

export interface Activity {
  e: string;
  l: string;
}
export const ACTIVITIES: Activity[] = [
  { e: '🎮', l: 'Gaming' },
  { e: '😴', l: 'Sleeping' },
  { e: '📚', l: 'Studying' },
  { e: '💼', l: 'Working' },
  { e: '🍔', l: 'Eating' },
  { e: '📺', l: 'Watching' },
  { e: '🏃', l: 'Gym' },
  { e: '🎧', l: 'Music' },
  { e: '🚗', l: 'Commuting' },
  { e: '🛒', l: 'Out & about' },
  { e: '🧘', l: 'Relaxing' },
  { e: '📵', l: 'Busy' },
];
export function activityString(a: Activity): string {
  return `${a.e} ${a.l}`;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const A_KEY = 'pronto_my_activity';
export function loadMyActivity(): string | null {
  try {
    return localStorage.getItem(A_KEY);
  } catch {
    return null;
  }
}
export function saveMyActivity(v: string | null) {
  try {
    if (v) localStorage.setItem(A_KEY, v);
    else localStorage.removeItem(A_KEY);
  } catch {
    /* ignore */
  }
}

const D_KEY = 'pronto_my_day';
export function loadMyDay(): { score: number; date: string } | null {
  try {
    return JSON.parse(localStorage.getItem(D_KEY) || 'null');
  } catch {
    return null;
  }
}
export function saveMyDay(score: number) {
  try {
    localStorage.setItem(D_KEY, JSON.stringify({ score, date: today() }));
  } catch {
    /* ignore */
  }
}

export function dayFace(score: number): string {
  if (score >= 9) return '🤩';
  if (score >= 7) return '😊';
  if (score >= 5) return '🙂';
  if (score >= 3) return '😕';
  return '😩';
}
