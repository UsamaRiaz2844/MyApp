// A complete-enough chess engine: legal move generation (incl. castling, en
// passant, promotion), check / checkmate / stalemate. Board is 64 squares,
// index = rank*8 + file, rank 0 = top (black home), rank 7 = bottom (white home).
// Pure functions; state is stored in the games table and synced over Realtime.

export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export interface Piece {
  t: PieceType;
  c: Color;
}
export type Board = (Piece | null)[];

export interface Castling {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}
export interface ChessState {
  board: Board;
  turn: Color;
  castling: Castling;
  ep: number | null; // en-passant target square
}
export interface Move {
  from: number;
  to: number;
  promo?: PieceType;
  castle?: 'K' | 'Q';
  ep?: boolean;
}

const FF = (i: number) => i % 8;
const RR = (i: number) => Math.floor(i / 8);
const idx = (f: number, r: number) => r * 8 + f;
const inside = (f: number, r: number) => f >= 0 && f < 8 && r >= 0 && r < 8;

export function initialState(): ChessState {
  const back: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  const board: Board = Array(64).fill(null);
  for (let f = 0; f < 8; f++) {
    board[idx(f, 0)] = { t: back[f], c: 'b' };
    board[idx(f, 1)] = { t: 'p', c: 'b' };
    board[idx(f, 6)] = { t: 'p', c: 'w' };
    board[idx(f, 7)] = { t: back[f], c: 'w' };
  }
  return { board, turn: 'w', castling: { wK: true, wQ: true, bK: true, bQ: true }, ep: null };
}

const KNIGHT = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const KING = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];
const ROOK_DIR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIR = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

// Is square `sq` attacked by any piece of colour `by`?
export function attacked(board: Board, sq: number, by: Color): boolean {
  const f = FF(sq);
  const r = RR(sq);
  // knights
  for (const [df, dr] of KNIGHT) {
    if (inside(f + df, r + dr)) {
      const p = board[idx(f + df, r + dr)];
      if (p && p.c === by && p.t === 'n') return true;
    }
  }
  // king
  for (const [df, dr] of KING) {
    if (inside(f + df, r + dr)) {
      const p = board[idx(f + df, r + dr)];
      if (p && p.c === by && p.t === 'k') return true;
    }
  }
  // pawns (a white pawn sits at r+1 to attack up; black at r-1 to attack down)
  const pr = by === 'w' ? r + 1 : r - 1;
  for (const df of [-1, 1]) {
    if (inside(f + df, pr)) {
      const p = board[idx(f + df, pr)];
      if (p && p.c === by && p.t === 'p') return true;
    }
  }
  // sliding
  for (const [df, dr] of ROOK_DIR) {
    let nf = f + df, nr = r + dr;
    while (inside(nf, nr)) {
      const p = board[idx(nf, nr)];
      if (p) {
        if (p.c === by && (p.t === 'r' || p.t === 'q')) return true;
        break;
      }
      nf += df; nr += dr;
    }
  }
  for (const [df, dr] of BISHOP_DIR) {
    let nf = f + df, nr = r + dr;
    while (inside(nf, nr)) {
      const p = board[idx(nf, nr)];
      if (p) {
        if (p.c === by && (p.t === 'b' || p.t === 'q')) return true;
        break;
      }
      nf += df; nr += dr;
    }
  }
  return false;
}

export function kingSquare(board: Board, c: Color): number {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.t === 'k' && p.c === c) return i;
  }
  return -1;
}
export function inCheck(board: Board, c: Color): boolean {
  const k = kingSquare(board, c);
  return k >= 0 && attacked(board, k, c === 'w' ? 'b' : 'w');
}

// Pseudo-legal moves for the piece on `sq` (ignores leaving own king in check).
function pseudo(state: ChessState, sq: number): Move[] {
  const { board, castling, ep } = state;
  const p = board[sq];
  if (!p) return [];
  const c = p.c;
  const f = FF(sq), r = RR(sq);
  const out: Move[] = [];
  const enemy = c === 'w' ? 'b' : 'w';
  const add = (to: number) => out.push({ from: sq, to });

  if (p.t === 'p') {
    const dir = c === 'w' ? -1 : 1;
    const startRank = c === 'w' ? 6 : 1;
    const promoRank = c === 'w' ? 0 : 7;
    const one = idx(f, r + dir);
    if (inside(f, r + dir) && !board[one]) {
      if (r + dir === promoRank) out.push({ from: sq, to: one, promo: 'q' });
      else add(one);
      if (r === startRank && !board[idx(f, r + 2 * dir)]) out.push({ from: sq, to: idx(f, r + 2 * dir) });
    }
    for (const df of [-1, 1]) {
      const nf = f + df, nr = r + dir;
      if (!inside(nf, nr)) continue;
      const t = idx(nf, nr);
      if (board[t] && board[t]!.c === enemy) {
        if (nr === promoRank) out.push({ from: sq, to: t, promo: 'q' });
        else add(t);
      } else if (ep === t) {
        out.push({ from: sq, to: t, ep: true });
      }
    }
  } else if (p.t === 'n') {
    for (const [df, dr] of KNIGHT) {
      if (!inside(f + df, r + dr)) continue;
      const t = idx(f + df, r + dr);
      if (!board[t] || board[t]!.c === enemy) add(t);
    }
  } else if (p.t === 'k') {
    for (const [df, dr] of KING) {
      if (!inside(f + df, r + dr)) continue;
      const t = idx(f + df, r + dr);
      if (!board[t] || board[t]!.c === enemy) add(t);
    }
    // castling
    const rank = c === 'w' ? 7 : 0;
    if (sq === idx(4, rank) && !attacked(board, sq, enemy)) {
      const kSide = c === 'w' ? castling.wK : castling.bK;
      const qSide = c === 'w' ? castling.wQ : castling.bQ;
      if (kSide && !board[idx(5, rank)] && !board[idx(6, rank)] && !attacked(board, idx(5, rank), enemy) && !attacked(board, idx(6, rank), enemy)) {
        out.push({ from: sq, to: idx(6, rank), castle: 'K' });
      }
      if (
        qSide &&
        !board[idx(3, rank)] &&
        !board[idx(2, rank)] &&
        !board[idx(1, rank)] &&
        !attacked(board, idx(3, rank), enemy) &&
        !attacked(board, idx(2, rank), enemy)
      ) {
        out.push({ from: sq, to: idx(2, rank), castle: 'Q' });
      }
    }
  } else {
    const dirs = p.t === 'r' ? ROOK_DIR : p.t === 'b' ? BISHOP_DIR : [...ROOK_DIR, ...BISHOP_DIR];
    for (const [df, dr] of dirs) {
      let nf = f + df, nr = r + dr;
      while (inside(nf, nr)) {
        const t = idx(nf, nr);
        if (!board[t]) add(t);
        else {
          if (board[t]!.c === enemy) add(t);
          break;
        }
        nf += df; nr += dr;
      }
    }
  }
  return out;
}

// Apply a move, returning the new state (turn flipped, rights updated).
export function applyMove(state: ChessState, m: Move): ChessState {
  const board = state.board.slice();
  const p = board[m.from]!;
  const c = p.c;
  const castling = { ...state.castling };
  let ep: number | null = null;

  board[m.to] = m.promo ? { t: m.promo, c } : p;
  board[m.from] = null;

  if (m.ep) {
    // captured pawn sits beside the destination
    const capSq = idx(FF(m.to), RR(m.from));
    board[capSq] = null;
  }
  if (m.castle) {
    const rank = c === 'w' ? 7 : 0;
    if (m.castle === 'K') {
      board[idx(5, rank)] = board[idx(7, rank)];
      board[idx(7, rank)] = null;
    } else {
      board[idx(3, rank)] = board[idx(0, rank)];
      board[idx(0, rank)] = null;
    }
  }
  // double pawn push sets ep target
  if (p.t === 'p' && Math.abs(RR(m.to) - RR(m.from)) === 2) {
    ep = idx(FF(m.from), (RR(m.from) + RR(m.to)) / 2);
  }
  // castling rights
  if (p.t === 'k') {
    if (c === 'w') { castling.wK = false; castling.wQ = false; }
    else { castling.bK = false; castling.bQ = false; }
  }
  const clearRook = (sq: number) => {
    if (sq === idx(0, 7)) castling.wQ = false;
    if (sq === idx(7, 7)) castling.wK = false;
    if (sq === idx(0, 0)) castling.bQ = false;
    if (sq === idx(7, 0)) castling.bK = false;
  };
  clearRook(m.from);
  clearRook(m.to);

  return { board, turn: c === 'w' ? 'b' : 'w', castling, ep };
}

// Legal moves for the piece on `sq` (own king safe afterwards).
export function legalMoves(state: ChessState, sq: number): Move[] {
  const p = state.board[sq];
  if (!p || p.c !== state.turn) return [];
  return pseudo(state, sq).filter((m) => {
    const next = applyMove(state, m);
    return !inCheck(next.board, p.c);
  });
}

export function allLegalMoves(state: ChessState, c: Color): Move[] {
  const out: Move[] = [];
  for (let i = 0; i < 64; i++) {
    const p = state.board[i];
    if (p && p.c === c) out.push(...legalMoves({ ...state, turn: c }, i));
  }
  return out;
}

export type Status = 'active' | 'checkmate' | 'stalemate';
export function statusFor(state: ChessState, c: Color): Status {
  const moves = allLegalMoves(state, c);
  if (moves.length > 0) return 'active';
  return inCheck(state.board, c) ? 'checkmate' : 'stalemate';
}

export const GLYPH: Record<PieceType, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
