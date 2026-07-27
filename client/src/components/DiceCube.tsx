// A dice cube with pips. Re-runs a little roll animation whenever the value
// changes (keyed by `spin`).
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export default function DiceCube({ value, spin, size = 56 }: { value: number | null; spin?: number | string; size?: number }) {
  const pips = value ? PIPS[value] || [] : [];
  return (
    <div
      key={spin}
      className={`${value ? 'animate-dice-roll' : ''} grid grid-cols-3 gap-[2px] rounded-2xl bg-white p-2 shadow-lg ring-1 ring-black/10`}
      style={{ width: size, height: size }}
    >
      {[...Array(9)].map((_, i) => (
        <span key={i} className="flex items-center justify-center">
          <span className={`h-2 w-2 rounded-full ${pips.includes(i) ? 'bg-slate-800' : 'bg-transparent'}`} />
        </span>
      ))}
    </div>
  );
}
