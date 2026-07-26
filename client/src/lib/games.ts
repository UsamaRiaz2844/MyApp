// Game rules for the in-chat mini-games. State is stored in the `games` table
// and synced over Realtime; these helpers are pure logic.

export type GameType = 'ttt' | 'rps' | 'c4' | 'guess';

export const GAME_META: Record<GameType, { label: string; icon: string }> = {
  ttt: { label: 'Tic-Tac-Toe', icon: '⭕' },
  c4: { label: 'Connect 4', icon: '🔴' },
  guess: { label: 'Guess the Number', icon: '🔢' },
  rps: { label: 'Rock Paper Scissors', icon: '✊' },
};

// ---- Guess the Number (higher / lower, turn-based) -------------------------
export interface GuessState {
  secret: number;
  low: number;
  high: number;
  guesses: { by: string; value: number; hint: 'higher' | 'lower' }[];
}
export function newSecret(): number {
  return 1 + Math.floor(Math.random() * 100);
}

// ---- Tic-Tac-Toe ----------------------------------------------------------
export interface TttState {
  board: (string | null)[]; // 9 cells, value = player id
}
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
export function tttWinner(board: (string | null)[]): string | 'draw' | null {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a] as string;
  }
  if (board.every(Boolean)) return 'draw';
  return null;
}
export function tttLine(board: (string | null)[]): number[] | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line;
  }
  return null;
}

// ---- Connect 4 ------------------------------------------------------------
export const C4_ROWS = 6;
export const C4_COLS = 7;
export interface C4State {
  board: (string | null)[]; // 42 cells, row-major, index = row*7 + col (row 0 = top)
}
// lowest empty cell index in a column, or -1 if the column is full
export function c4Drop(board: (string | null)[], col: number): number {
  for (let r = C4_ROWS - 1; r >= 0; r--) {
    const i = r * C4_COLS + col;
    if (!board[i]) return i;
  }
  return -1;
}
export function c4Winner(board: (string | null)[]): string | 'draw' | null {
  const at = (r: number, c: number) => (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS ? board[r * C4_COLS + c] : null);
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      const v = at(r, c);
      if (!v) continue;
      for (const [dr, dc] of dirs) {
        if (at(r + dr, c + dc) === v && at(r + 2 * dr, c + 2 * dc) === v && at(r + 3 * dr, c + 3 * dc) === v) {
          return v as string;
        }
      }
    }
  }
  if (board.every(Boolean)) return 'draw';
  return null;
}

// ---- Rock Paper Scissors --------------------------------------------------
export type Rps = 'rock' | 'paper' | 'scissors';
export const RPS_EMOJI: Record<Rps, string> = { rock: '✊', paper: '✋', scissors: '✌️' };
export interface RpsState {
  choices: Record<string, Rps>; // playerId -> choice
  round: number;
}
// returns id of the winner, 'draw', or null if not both chosen yet
export function rpsResolve(choices: Record<string, Rps>, players: string[]): string | 'draw' | null {
  const [p1, p2] = players;
  const a = choices[p1];
  const b = choices[p2];
  if (!a || !b) return null;
  if (a === b) return 'draw';
  const aBeats: Record<Rps, Rps> = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
  return aBeats[a] === b ? p1 : p2;
}
