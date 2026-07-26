import { catLook, type CatMood } from '../lib/pet';

// The shared cat that lives in the chat background. Its face + animation reflect
// the current mood; a couple of floating emojis add a reaction. It sits behind
// the messages (pointer-events off) so it peeks through the conversation.
export default function PetCat({ mood, level, size = 112 }: { mood: CatMood; level: number; size?: number }) {
  const look = catLook(mood);
  // Grow a little with each level, capped so it never dominates the screen.
  const px = Math.min(size + (level - 1) * 10, 180);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
      <div className="relative opacity-[0.55] dark:opacity-40">
        {look.extra && (
          <span
            key={`${mood}-a`}
            className="animate-pet-float absolute -right-2 -top-2 text-2xl"
            style={{ animationIterationCount: mood === 'crying' || mood === 'angry' || mood === 'love' ? 'infinite' : 1 }}
          >
            {look.extra}
          </span>
        )}
        {look.extra && (
          <span
            key={`${mood}-b`}
            className="animate-pet-float absolute -left-3 top-1 text-xl"
            style={{ animationDelay: '0.5s', animationIterationCount: mood === 'crying' || mood === 'angry' || mood === 'love' ? 'infinite' : 1 }}
          >
            {look.extra}
          </span>
        )}
        <div className={look.anim} style={{ fontSize: px, lineHeight: 1 }}>
          {look.face}
        </div>
      </div>
    </div>
  );
}
