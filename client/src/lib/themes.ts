// Shared per-conversation themes. A theme is stored on the conversation row and
// synced to both people in real time, so picking one changes the look for both.
//
// Each theme controls: the chat background (light/dark), the two bubble styles
// (mine / theirs), the accent used for the send + action buttons, the meta-row
// text colour on my bubbles, and an optional font (for the "era" themes).
// Bubble/accent strings are Tailwind classes and should carry their own dark:
// variants so they adapt to the light/dark toggle.

export interface ChatTheme {
  id: string;
  label: string;
  swatch: string; // preview dot (CSS background)
  bgLight: string; // CSS background (colour or gradient)
  bgDark: string;
  mine: string; // my bubble classes (bg + text)
  theirs: string; // their bubble classes (bg + text)
  accent: string; // send / action button classes (bg + text)
  mineMeta?: string; // meta-row text colour on my bubble (default: text-white/80)
  font?: string; // optional font-family (era themes)
}

export const CHAT_THEMES: ChatTheme[] = [
  // ---- Glass (default): frosted, transparent, luxury ----------------------
  {
    id: 'glass',
    label: 'Glass',
    swatch: 'linear-gradient(135deg,rgba(255,255,255,.7),rgba(148,163,184,.25))',
    bgLight: 'linear-gradient(135deg,#eef2ff 0%,#fae8ff 50%,#e0f2fe 100%)',
    bgDark: 'linear-gradient(135deg,#0b1220 0%,#1e1b4b 55%,#0c2942 100%)',
    mine: 'bg-white/25 text-slate-900 border border-white/50 backdrop-blur-md dark:bg-white/10 dark:text-white dark:border-white/15',
    theirs:
      'bg-white/50 text-slate-900 border border-white/60 backdrop-blur-md dark:bg-white/5 dark:text-white dark:border-white/10',
    accent:
      'bg-white/30 text-slate-900 border border-white/50 backdrop-blur-md dark:bg-white/15 dark:text-white dark:border-white/20',
    mineMeta: 'text-slate-500 dark:text-white/70',
  },

  // ---- Famous-app looks ----------------------------------------------------
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    swatch: 'linear-gradient(135deg,#25D366,#128C7E)',
    bgLight: '#ECE5DD',
    bgDark: '#0B141A',
    mine: 'bg-[#DCF8C6] text-slate-900 dark:bg-[#005C4B] dark:text-white',
    theirs: 'bg-white text-slate-900 dark:bg-[#202C33] dark:text-white',
    accent: 'bg-[#25D366] text-white dark:bg-[#00A884] dark:text-white',
    mineMeta: 'text-slate-500 dark:text-white/70',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    swatch: 'linear-gradient(135deg,#833AB4,#E1306C,#F77737)',
    bgLight: '#FFFFFF',
    bgDark: '#000000',
    mine: 'bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] text-white',
    theirs: 'bg-[#EFEFEF] text-slate-900 dark:bg-[#262626] dark:text-white',
    accent: 'bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] text-white',
  },
  {
    id: 'messenger',
    label: 'Messenger',
    swatch: 'linear-gradient(135deg,#00B2FF,#006AFF)',
    bgLight: '#FFFFFF',
    bgDark: '#18191A',
    mine: 'bg-gradient-to-br from-[#00B2FF] to-[#006AFF] text-white',
    theirs: 'bg-[#E4E6EB] text-slate-900 dark:bg-[#3A3B3C] dark:text-white',
    accent: 'bg-gradient-to-br from-[#00B2FF] to-[#006AFF] text-white',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    swatch: 'linear-gradient(135deg,#2AABEE,#229ED9)',
    bgLight: '#C8DCEA',
    bgDark: '#0E1621',
    mine: 'bg-[#3390EC] text-white dark:bg-[#2B5278] dark:text-white',
    theirs: 'bg-white text-slate-900 dark:bg-[#182533] dark:text-white',
    accent: 'bg-[#3390EC] text-white dark:bg-[#50A8EB] dark:text-white',
  },
  {
    id: 'snapchat',
    label: 'Snapchat',
    swatch: '#FFFC00',
    bgLight: '#FFFFFF',
    bgDark: '#000000',
    mine: 'bg-[#FFFC00] text-black',
    theirs: 'bg-[#F0F0F0] text-black dark:bg-[#1B1B1D] dark:text-white',
    accent: 'bg-[#FFFC00] text-black',
    mineMeta: 'text-black/50',
  },

  // ---- Eras ---------------------------------------------------------------
  {
    id: 'era1750',
    label: '1750s',
    swatch: 'linear-gradient(135deg,#c9a86a,#7c5a34)',
    bgLight: 'linear-gradient(135deg,#efe2c4,#e3d2a8)',
    bgDark: 'linear-gradient(135deg,#241b12,#2e2216)',
    mine: 'bg-[#7C5A34] text-[#F6ECD6] dark:bg-[#5A4327] dark:text-[#F6ECD6]',
    theirs: 'bg-[#E5D4A8] text-[#3B2E1B] dark:bg-[#3A2E20] dark:text-[#E9DBB8]',
    accent: 'bg-gradient-to-br from-[#9C7B45] to-[#6B4E2A] text-[#F6ECD6]',
    font: "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif",
  },
  {
    id: 'era1850',
    label: '1850s',
    swatch: 'linear-gradient(135deg,#b8860b,#6e1f2a)',
    bgLight: 'linear-gradient(135deg,#e8e0cf,#d9cdb2)',
    bgDark: 'linear-gradient(135deg,#171012,#1e1416)',
    mine: 'bg-[#6E1F2A] text-[#F3E3C0] dark:bg-[#5A1822] dark:text-[#F3E3C0]',
    theirs: 'bg-[#DCCFB0] text-[#2A1D18] dark:bg-[#2A1C1E] dark:text-[#E8D8B8]',
    accent: 'bg-gradient-to-br from-[#B8860B] to-[#7A5A06] text-[#1a1206]',
    font: "Georgia,'Times New Roman',serif",
  },
  {
    id: 'era1950',
    label: '1950s',
    swatch: 'linear-gradient(135deg,#2fb0a3,#e8624a)',
    bgLight: 'linear-gradient(135deg,#fbf3e3,#f6e7c8)',
    bgDark: 'linear-gradient(135deg,#10201f,#15201a)',
    mine: 'bg-[#E8624A] text-white dark:bg-[#C24A34] dark:text-white',
    theirs: 'bg-[#2FB0A3] text-white dark:bg-[#1E6E67] dark:text-white',
    accent: 'bg-gradient-to-br from-[#F2A20C] to-[#E8624A] text-white',
    font: "'Futura','Century Gothic','Trebuchet MS',Arial,sans-serif",
  },
  {
    id: 'era2050',
    label: '2050',
    swatch: 'linear-gradient(135deg,#12F7D6,#7B2FF7)',
    bgLight: 'linear-gradient(135deg,#e7fbff,#efe4ff)',
    bgDark: 'linear-gradient(135deg,#04010d,#0a0a20 60%,#05121f)',
    mine: 'bg-[#0B1030] text-[#8CF6FF] border border-cyan-400/40 dark:bg-[#0B1030] dark:text-[#8CF6FF]',
    theirs:
      'bg-white/80 text-[#3b2a6b] border border-fuchsia-400/40 dark:bg-[#141a3a] dark:text-[#d9ccff] dark:border-fuchsia-400/30',
    accent: 'bg-gradient-to-br from-[#12F7D6] to-[#7B2FF7] text-black',
    mineMeta: 'text-cyan-300/70',
    font: "'SF Mono','JetBrains Mono',ui-monospace,'Cascadia Code',monospace",
  },
];

export function getTheme(id?: string | null): ChatTheme {
  return CHAT_THEMES.find((t) => t.id === id) || CHAT_THEMES[0];
}

export const REACTION_EMOJIS = ['❤️', '😂', '🔥', '😮', '😢', '👍'];
