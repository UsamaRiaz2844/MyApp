// Per-device text preferences: message font size + font family. Applied via a
// CSS variable (--msg-size, used by message bubbles + composer) and the document
// body font-family. Uses only system font stacks — no external fonts to load.

export interface FontSize {
  id: string;
  label: string;
  px: string;
}
export const FONT_SIZES: FontSize[] = [
  { id: 's', label: 'Small', px: '13.5px' },
  { id: 'm', label: 'Default', px: '15px' },
  { id: 'l', label: 'Large', px: '17.5px' },
  { id: 'xl', label: 'Huge', px: '20px' },
];

export interface FontFamily {
  id: string;
  label: string;
  stack: string;
}
export const FONT_FAMILIES: FontFamily[] = [
  { id: 'system', label: 'Default', stack: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
  { id: 'rounded', label: 'Rounded', stack: "'SF Pro Rounded', ui-rounded, 'Nunito', 'Segoe UI', system-ui, sans-serif" },
  { id: 'serif', label: 'Serif', stack: "Georgia, 'Times New Roman', Cambria, 'Noto Serif', serif" },
  { id: 'mono', label: 'Mono', stack: "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Code', Consolas, monospace" },
  { id: 'playful', label: 'Playful', stack: "'Comic Sans MS', 'Comic Neue', 'Chalkboard SE', 'Segoe Print', cursive" },
];

const SIZE_KEY = 'pronto_font_size';
const FONT_KEY = 'pronto_font_family';

export function loadSizeId(): string {
  try {
    return localStorage.getItem(SIZE_KEY) || 'm';
  } catch {
    return 'm';
  }
}
export function loadFontId(): string {
  try {
    return localStorage.getItem(FONT_KEY) || 'system';
  } catch {
    return 'system';
  }
}

export function applyAppearance(sizeId = loadSizeId(), fontId = loadFontId()) {
  const size = FONT_SIZES.find((s) => s.id === sizeId) || FONT_SIZES[1];
  const font = FONT_FAMILIES.find((f) => f.id === fontId) || FONT_FAMILIES[0];
  document.documentElement.style.setProperty('--msg-size', size.px);
  document.body.style.fontFamily = font.stack;
}

export function setSize(id: string) {
  try {
    localStorage.setItem(SIZE_KEY, id);
  } catch {
    /* ignore */
  }
  applyAppearance(id, loadFontId());
}
export function setFont(id: string) {
  try {
    localStorage.setItem(FONT_KEY, id);
  } catch {
    /* ignore */
  }
  applyAppearance(loadSizeId(), id);
}
