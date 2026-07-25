// Shared per-conversation themes. `bg` is applied to the chat background,
// `mine` to the sender's message bubbles. Tuned to stay comfortable for long
// reading sessions (soft, low-glare gradients in both light and dark).

export interface ChatTheme {
  id: string;
  label: string;
  swatch: string; // preview dot
  bgLight: string;
  bgDark: string;
  mine: string; // tailwind classes for own bubble
}

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: 'default',
    label: 'Pronto',
    swatch: 'linear-gradient(135deg,#6366f1,#ec4899)',
    bgLight: '#f8fafc',
    bgDark: '#0b0c10',
    mine: 'bg-gradient-to-br from-brand-500 to-pink-500 text-white',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    swatch: 'linear-gradient(135deg,#f97316,#ec4899)',
    bgLight: '#fff7ed',
    bgDark: '#1a1012',
    mine: 'bg-gradient-to-br from-orange-500 to-pink-500 text-white',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    swatch: 'linear-gradient(135deg,#0ea5e9,#14b8a6)',
    bgLight: '#f0f9ff',
    bgDark: '#0a1416',
    mine: 'bg-gradient-to-br from-sky-500 to-teal-500 text-white',
  },
  {
    id: 'forest',
    label: 'Forest',
    swatch: 'linear-gradient(135deg,#22c55e,#0d9488)',
    bgLight: '#f0fdf4',
    bgDark: '#0a140f',
    mine: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
  },
  {
    id: 'grape',
    label: 'Grape',
    swatch: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
    bgLight: '#f5f3ff',
    bgDark: '#120f1e',
    mine: 'bg-gradient-to-br from-violet-500 to-brand-500 text-white',
  },
  {
    id: 'rose',
    label: 'Rose',
    swatch: 'linear-gradient(135deg,#f43f5e,#f59e0b)',
    bgLight: '#fff1f2',
    bgDark: '#1a0f12',
    mine: 'bg-gradient-to-br from-rose-500 to-amber-500 text-white',
  },
];

export function getTheme(id?: string | null): ChatTheme {
  return CHAT_THEMES.find((t) => t.id === id) || CHAT_THEMES[0];
}

export const REACTION_EMOJIS = ['❤️', '😂', '🔥', '😮', '😢', '👍'];
