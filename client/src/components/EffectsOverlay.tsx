import { useEffect, useState } from 'react';

export interface Fx {
  kind: 'hearts' | 'confetti';
  id: number;
}

interface Burst {
  id: number;
  kind: 'hearts' | 'confetti';
  parts: { left: number; delay: number; hue: number; emoji: string }[];
}

const HEART_EMOJIS = ['❤️', '💖', '💕', '💗', '💓'];
const CONFETTI_COLORS = [0, 40, 140, 200, 280, 330];

function makeBurst(fx: Fx): Burst {
  const count = fx.kind === 'hearts' ? 16 : 34;
  const parts = Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    hue: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    emoji: HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)],
  }));
  return { id: fx.id, kind: fx.kind, parts };
}

// Renders a short-lived particle burst whenever `fx.id` changes.
export default function EffectsOverlay({ fx }: { fx: Fx | null }) {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    if (!fx) return;
    const b = makeBurst(fx);
    setBursts((prev) => [...prev, b]);
    const t = setTimeout(() => setBursts((prev) => prev.filter((x) => x.id !== b.id)), 3400);
    return () => clearTimeout(t);
  }, [fx?.id]);

  if (bursts.length === 0) return null;

  return (
    <div className="fx-layer">
      {bursts.map((b) =>
        b.parts.map((p, i) =>
          b.kind === 'hearts' ? (
            <span
              key={`${b.id}-${i}`}
              className="absolute bottom-0 animate-float-up text-3xl"
              style={{ left: `${p.left}%`, animationDelay: `${p.delay}s` }}
            >
              {p.emoji}
            </span>
          ) : (
            <span
              key={`${b.id}-${i}`}
              className="absolute top-0 h-2.5 w-2.5 rounded-[2px] animate-confetti-fall"
              style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, background: `hsl(${p.hue} 90% 60%)` }}
            />
          )
        )
      )}
    </div>
  );
}
