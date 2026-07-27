// Two-player Ludo (diagonally-opposite seats). Pure rules + board geometry;
// state lives in the games table and syncs over Realtime. Each player has 4
// tokens; a token's "steps" is -1 (in base), 0..50 (shared loop from that
// player's start), 51..55 (home column), 56 (finished / home).

export type Role = 'A' | 'B';
export const FINISH = 56;
export const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

// 52-cell clockwise loop as [row, col] on a 15x15 board.
export const LUDO_PATH: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0],
];

export const LUDO_START: Record<Role, number> = { A: 0, B: 26 };
export const LUDO_HOME: Record<Role, [number, number][]> = {
  A: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  B: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
};
export const LUDO_BASE: Record<Role, [number, number][]> = {
  A: [[1.6, 1.6], [1.6, 3.8], [3.8, 1.6], [3.8, 3.8]],
  B: [[10.6, 10.6], [10.6, 12.8], [12.8, 10.6], [12.8, 12.8]],
};
export const LUDO_CENTER: [number, number] = [7, 7];
export const LUDO_SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const ROLE_COLOR: Record<Role, string> = { A: '#e5484d', B: '#2fa84f' };

// Stable A/B seat assignment so both devices agree.
export function roleOf(pid: string, me: string, other: string): Role {
  const first = me < other ? me : other;
  return pid === first ? 'A' : 'B';
}

// Absolute loop index for a token on the shared track, else null.
export function absTrack(role: Role, steps: number): number | null {
  if (steps >= 0 && steps <= 50) return (LUDO_START[role] + steps) % 52;
  return null;
}

export function tokenCell(role: Role, steps: number, slot: number): [number, number] {
  if (steps === -1) return LUDO_BASE[role][slot];
  if (steps <= 50) return LUDO_PATH[(LUDO_START[role] + steps) % 52];
  if (steps <= 55) return LUDO_HOME[role][steps - 51];
  return LUDO_CENTER;
}

export function canMoveToken(steps: number, die: number): boolean {
  if (steps === 56) return false;
  if (steps === -1) return die === 6;
  return steps + die <= 56;
}
export function nextSteps(steps: number, die: number): number {
  return steps === -1 ? 0 : steps + die;
}
