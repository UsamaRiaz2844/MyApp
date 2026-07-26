// Shown while BOTH people are typing at once — a little burst of twinkling
// sparks above the composer.
const SPARKS = [
  { e: '✨', left: '18%', top: '35%', d: '0s' },
  { e: '💥', left: '72%', top: '20%', d: '0.2s' },
  { e: '✨', left: '48%', top: '55%', d: '0.45s' },
  { e: '⭐', left: '34%', top: '12%', d: '0.65s' },
  { e: '✨', left: '82%', top: '58%', d: '0.15s' },
  { e: '💫', left: '10%', top: '62%', d: '0.5s' },
  { e: '⚡', left: '60%', top: '40%', d: '0.35s' },
];

export default function TypingSparks() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 z-20 h-44">
      {SPARKS.map((s, i) => (
        <span
          key={i}
          className="animate-sparkle absolute text-2xl"
          style={{ left: s.left, top: s.top, animationDelay: s.d, animationIterationCount: 'infinite' }}
        >
          {s.e}
        </span>
      ))}
      <div className="absolute inset-x-0 bottom-0 text-center text-xs font-semibold text-brand-500 dark:text-brand-300">
        ✨ you're both typing ✨
      </div>
    </div>
  );
}
