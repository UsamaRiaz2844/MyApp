import { useState } from 'react';
import { FONT_FAMILIES, FONT_SIZES, loadFontId, loadSizeId, setFont, setSize } from '../lib/appearance';

export default function AppearanceSheet({ onClose }: { onClose: () => void }) {
  const [sizeId, setSizeId] = useState(loadSizeId());
  const [fontId, setFontId] = useState(loadFontId());

  const size = FONT_SIZES.find((s) => s.id === sizeId) || FONT_SIZES[1];
  const font = FONT_FAMILIES.find((f) => f.id === fontId) || FONT_FAMILIES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom w-full max-w-md animate-sheet-up rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-[#15161d]"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">🔤 Text &amp; font</h2>
          <button onClick={onClose} className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Done
          </button>
        </div>

        {/* live preview */}
        <div className="mb-4 rounded-2xl bg-gradient-to-br from-brand-500 to-pink-500 p-3">
          <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-white/90 px-3.5 py-2.5 text-slate-900" style={{ fontSize: size.px, fontFamily: font.stack }}>
            This is how your messages will look. 😊
          </p>
        </div>

        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Size</p>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {FONT_SIZES.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSizeId(s.id);
                setSize(s.id);
              }}
              className={`rounded-2xl py-3 text-sm font-semibold transition active:scale-95 ${
                sizeId === s.id ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Font</p>
        <div className="grid grid-cols-1 gap-2">
          {FONT_FAMILIES.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFontId(f.id);
                setFont(f.id);
              }}
              style={{ fontFamily: f.stack }}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 text-base transition active:scale-[0.98] ${
                fontId === f.id ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-800 dark:bg-white/[0.06] dark:text-slate-100'
              }`}
            >
              <span>{f.label}</span>
              <span className="opacity-70">Aa Bb 123</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
