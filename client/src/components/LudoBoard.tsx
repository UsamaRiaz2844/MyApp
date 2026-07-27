import { LUDO_HOME, LUDO_PATH, LUDO_SAFE, LUDO_START, canMoveToken, roleOf, tokenCell, type Role } from '../lib/ludo';

const CELL = 30;
const px = (c: number) => c * CELL + CELL / 2;
const py = (r: number) => r * CELL + CELL / 2;

// Board colours (4 arms). A = red (top-left), top = gold, B = green (bottom-right), bottom = blue.
const RED = '#e5484d';
const GOLD = '#f2b705';
const GREEN = '#2fa84f';
const BLUE = '#2f7de1';

// start-square index -> arm colour
const STARTS: Record<number, string> = { 0: RED, 13: GOLD, 26: GREEN, 39: BLUE };
// decorative home columns for the two unused arms (2-player uses A/B only)
const DECO_HOME: [string, [number, number][]][] = [
  [GOLD, [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]]],
  [BLUE, [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]],
];

function Star({ r, c }: { r: number; c: number }) {
  return (
    <text x={px(c)} y={py(r) + 5} textAnchor="middle" fontSize="15" fill="#c99a2e" opacity="0.7">
      ★
    </text>
  );
}

function Yard({ x, y, color, slots }: { x: number; y: number; color: string; slots: [number, number][] }) {
  return (
    <g>
      <rect x={x} y={y} width={CELL * 6} height={CELL * 6} rx="14" fill={color} />
      <rect x={x + 12} y={y + 12} width={CELL * 6 - 24} height={CELL * 6 - 24} rx="10" fill="#ffffff" opacity="0.92" />
      {slots.map(([r, c], i) => (
        <circle key={i} cx={px(c)} cy={py(r)} r="12" fill="none" stroke={color} strokeWidth="3" opacity="0.5" />
      ))}
    </g>
  );
}

export default function LudoBoard({
  game,
  me,
  other,
  onMove,
}: {
  game: any;
  me: string;
  other: string;
  onMove: (i: number) => void;
}) {
  const s = game.state || {};
  const roleMe = roleOf(me, me, other);
  const roleOther = roleOf(other, me, other);
  const myTurn = s.turn === me && s.phase === 'move' && !game.winner;

  const baseSlots: Record<Role, [number, number][]> = {
    A: [[1.6, 1.6], [1.6, 3.8], [3.8, 1.6], [3.8, 3.8]],
    B: [[10.6, 10.6], [10.6, 12.8], [12.8, 10.6], [12.8, 12.8]],
  };

  return (
    <svg viewBox="0 0 450 450" className="mx-auto block h-auto w-full max-w-[min(92vw,460px)]">
      <defs>
        <linearGradient id="lb-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbfbfe" />
          <stop offset="1" stopColor="#eef0f6" />
        </linearGradient>
        <radialGradient id="tok-A" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ff7b7f" />
          <stop offset="1" stopColor="#c92f34" />
        </radialGradient>
        <radialGradient id="tok-B" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#5fd07f" />
          <stop offset="1" stopColor="#1f8a3e" />
        </radialGradient>
        <filter id="tok-sh" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" floodOpacity="0.35" />
        </filter>
      </defs>

      <rect x="0" y="0" width="450" height="450" rx="18" fill="url(#lb-bg)" stroke="#d5d9e3" strokeWidth="2" />

      {/* yards */}
      <Yard x={0} y={0} color={RED} slots={baseSlots.A} />
      <Yard x={CELL * 9} y={0} color={GOLD} slots={[]} />
      <Yard x={CELL * 9} y={CELL * 9} color={GREEN} slots={baseSlots.B} />
      <Yard x={0} y={CELL * 9} color={BLUE} slots={[]} />

      {/* track cells */}
      {LUDO_PATH.map(([r, c], idx) => {
        const start = STARTS[idx];
        const fill = start || '#ffffff';
        return <rect key={idx} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill={fill} stroke="#cfd4de" strokeWidth="1" />;
      })}

      {/* functional home columns (A/B) + decorative (gold/blue) */}
      {([['A', RED] as const, ['B', GREEN] as const]).map(([role, col]) =>
        LUDO_HOME[role].map(([r, c], i) => (
          <rect key={`h${role}${i}`} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill={col} opacity="0.85" stroke="#cfd4de" strokeWidth="1" />
        ))
      )}
      {DECO_HOME.map(([col, cells]) =>
        cells.map(([r, c], i) => (
          <rect key={`d${col}${i}`} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill={col} opacity="0.85" stroke="#cfd4de" strokeWidth="1" />
        ))
      )}

      {/* safe stars */}
      {LUDO_PATH.map(([r, c], idx) => (LUDO_SAFE.has(idx) && !STARTS[idx] ? <Star key={`s${idx}`} r={r} c={c} /> : null))}

      {/* centre pinwheel */}
      <rect x={CELL * 6} y={CELL * 6} width={CELL * 3} height={CELL * 3} fill="#fff" stroke="#cfd4de" />
      <path d={`M${CELL * 6} ${CELL * 6} L${CELL * 9} ${CELL * 6} L${px(7)} ${py(7)} Z`} fill={GOLD} />
      <path d={`M${CELL * 9} ${CELL * 6} L${CELL * 9} ${CELL * 9} L${px(7)} ${py(7)} Z`} fill={GREEN} />
      <path d={`M${CELL * 9} ${CELL * 9} L${CELL * 6} ${CELL * 9} L${px(7)} ${py(7)} Z`} fill={BLUE} />
      <path d={`M${CELL * 6} ${CELL * 9} L${CELL * 6} ${CELL * 6} L${px(7)} ${py(7)} Z`} fill={RED} />

      {/* tokens */}
      {[
        { pid: me, role: roleMe },
        { pid: other, role: roleOther },
      ].map(({ pid, role }) =>
        (s.tokens?.[pid] || []).map((steps: number, i: number) => {
          const [r, c] = tokenCell(role, steps, i);
          const off = steps === 56 ? [(i - 1.5) * 9, (i % 2 ? 1 : -1) * 7] : [0, 0];
          const movable = pid === me && myTurn && canMoveToken(steps, s.die);
          const grad = role === 'A' ? 'url(#tok-A)' : 'url(#tok-B)';
          return (
            <g key={`${pid}${i}`} onClick={movable ? () => onMove(i) : undefined} style={{ cursor: movable ? 'pointer' : 'default' }}>
              {movable && (
                <circle cx={px(c) + off[0]} cy={py(r) + off[1]} r="17" fill={role === 'A' ? RED : GREEN} opacity="0.3" className="animate-glow-pulse" />
              )}
              <circle cx={px(c) + off[0]} cy={py(r) + off[1]} r="11" fill={grad} stroke="#fff" strokeWidth="2.5" filter="url(#tok-sh)" />
              <circle cx={px(c) + off[0] - 3} cy={py(r) + off[1] - 4} r="3" fill="#ffffff" opacity="0.9" />
              {movable && <circle cx={px(c) + off[0]} cy={py(r) + off[1]} r="13.5" fill="none" stroke="#111" strokeWidth="1.5" />}
            </g>
          );
        })
      )}
    </svg>
  );
}
