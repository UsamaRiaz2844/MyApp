// Game rules for the in-chat mini-games. State is stored in the `games` table
// and synced over Realtime; these helpers are pure logic.

export type GameType = 'ttt' | 'rps';

export const GAME_META: Record<GameType, { label: string; icon: string }> = {
  ttt: { label: 'Tic-Tac-Toe', icon: '⭕' },
  rps: { label: 'Rock Paper Scissors', icon: '✊' },
};

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
