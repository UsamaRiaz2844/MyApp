import {
  LUDO_HOME,
  LUDO_PATH,
  LUDO_SAFE,
  LUDO_START,
  ROLE_COLOR,
  canMoveToken,
  roleOf,
  tokenCell,
  type Role,
} from '../lib/ludo';

const CELL = 26;
const px = (c: number) => c * CELL + CELL / 2;
const py = (r: number) => r * CELL + CELL / 2;

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

  const startIdx: Record<number, Role> = { [LUDO_START.A]: 'A', [LUDO_START.B]: 'B' };

  return (
    <svg viewBox="0 0 390 390" className="mx-auto w-full max-w-[330px] rounded-xl bg-white shadow dark:bg-[#0e0f16]">
      {/* corner bases */}
      <rect x="0" y="0" width={CELL * 6} height={CELL * 6} fill="#f7c9cb" />
      <rect x={CELL * 9} y={CELL * 9} width={CELL * 6} height={CELL * 6} fill="#c4e6cd" />
      <rect x={CELL * 9} y="0" width={CELL * 6} height={CELL * 6} fill="#eef1f4" />
      <rect x="0" y={CELL * 9} width={CELL * 6} height={CELL * 6} fill="#eef1f4" />
      {(['A', 'B'] as Role[]).map((role) =>
        LUDO_BASESlots(role).map(([r, c], i) => (
          <circle key={`${role}${i}`} cx={px(c)} cy={py(r)} r="9" fill="#fff" stroke={ROLE_COLOR[role]} strokeWidth="3" />
        ))
      )}

      {/* track cells */}
      {LUDO_PATH.map(([r, c], idx) => {
        const safe = LUDO_SAFE.has(idx);
        const start = startIdx[idx];
        const fill = start ? ROLE_COLOR[start] : safe ? '#ffe6a8' : '#ffffff';
        return <rect key={idx} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill={fill} stroke="#c9ced6" strokeWidth="1" />;
      })}
      {/* home columns */}
      {(['A', 'B'] as Role[]).map((role) =>
        LUDO_HOME[role].map(([r, c], i) => (
          <rect key={`h${role}${i}`} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill={ROLE_COLOR[role]} opacity="0.55" stroke="#c9ced6" strokeWidth="1" />
        ))
      )}
      {/* center home */}
      <rect x={CELL * 6} y={CELL * 6} width={CELL * 3} height={CELL * 3} fill="#eef1f4" stroke="#c9ced6" />
      <path d={`M${CELL * 6} ${CELL * 6} L${px(7)} ${py(7)} L${CELL * 6} ${CELL * 9} Z`} fill={ROLE_COLOR.A} opacity="0.8" />
      <path d={`M${CELL * 9} ${CELL * 6} L${px(7)} ${py(7)} L${CELL * 9} ${CELL * 9} Z`} fill={ROLE_COLOR.B} opacity="0.8" />

      {/* tokens */}
      {[
        { pid: me, role: roleMe },
        { pid: other, role: roleOther },
      ].map(({ pid, role }) =>
        (s.tokens?.[pid] || []).map((steps: number, i: number) => {
          const [r, c] = tokenCell(role, steps, i);
          // fan out finished tokens around the centre so they don't fully overlap
          const off = steps === 56 ? [(i - 1.5) * 8, (i % 2 ? 1 : -1) * 6] : [0, 0];
          const movable = pid === me && myTurn && canMoveToken(steps, s.die);
          return (
            <g key={`${pid}${i}`} onClick={movable ? () => onMove(i) : undefined} style={{ cursor: movable ? 'pointer' : 'default' }}>
              {movable && <circle cx={px(c) + off[0]} cy={py(r) + off[1]} r="14" fill={ROLE_COLOR[role]} opacity="0.25" className="animate-glow-pulse" />}
              <circle
                cx={px(c) + off[0]}
                cy={py(r) + off[1]}
                r="10"
                fill={ROLE_COLOR[role]}
                stroke={movable ? '#111' : '#fff'}
                strokeWidth={movable ? 2.5 : 2}
              />
              <circle cx={px(c) + off[0]} cy={py(r) + off[1] - 3} r="3" fill="#ffffff" opacity="0.85" />
            </g>
          );
        })
      )}
    </svg>
  );
}

function LUDO_BASESlots(role: Role): [number, number][] {
  return role === 'A'
    ? [[1.6, 1.6], [1.6, 3.8], [3.8, 1.6], [3.8, 3.8]]
    : [[10.6, 10.6], [10.6, 12.8], [12.8, 10.6], [12.8, 12.8]];
}
