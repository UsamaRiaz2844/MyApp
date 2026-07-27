import { useEffect, useState } from 'react';
import { GLYPH, inCheck, kingSquare, legalMoves, type ChessState, type Color, type Move } from '../lib/chess';

const LIGHT = '#ecd9b6';
const DARK = '#b07a4e';

export default function ChessBoard({
  game,
  me,
  onMove,
}: {
  game: any;
  me: string;
  onMove: (m: Move) => void;
}) {
  const s = game.state;
  const myColor: Color = s.white === me ? 'w' : 'b';
  const cs: ChessState = { board: s.board, turn: s.turn, castling: s.castling, ep: s.ep };
  const myTurn = s.turn === myColor && !game.winner;

  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);

  // Clear selection when it's not our move (e.g. after the opponent plays).
  useEffect(() => {
    if (!myTurn) {
      setSelected(null);
      setMoves([]);
    }
  }, [myTurn, s.turn]);

  const orient = (display: number) => (myColor === 'w' ? display : 63 - display);
  const lastMove: number[] | null = s.lastMove || null;
  const checkSq = inCheck(cs.board, cs.turn) ? kingSquare(cs.board, cs.turn) : -1;

  function tap(display: number) {
    if (!myTurn) return;
    const bi = orient(display);
    if (selected != null) {
      const mv = moves.find((m) => m.to === bi);
      if (mv) {
        onMove(mv);
        setSelected(null);
        setMoves([]);
        return;
      }
    }
    const piece = cs.board[bi];
    if (piece && piece.c === myColor) {
      setSelected(bi);
      setMoves(legalMoves(cs, bi));
    } else {
      setSelected(null);
      setMoves([]);
    }
  }

  const targets = new Set(moves.map((m) => m.to));

  return (
    <div
      className="grid aspect-square w-full max-w-[min(92vw,460px)] grid-cols-8 overflow-hidden rounded-xl shadow-2xl ring-4 ring-[#5a3a22]"
    >
      {[...Array(64)].map((_, display) => {
        const bi = orient(display);
        const f = bi % 8;
        const r = Math.floor(bi / 8);
        const dark = (f + r) % 2 === 1;
        const piece = cs.board[bi];
        const isSel = selected === bi;
        const isTarget = targets.has(bi);
        const isLast = lastMove && (lastMove[0] === bi || lastMove[1] === bi);
        const isCheck = checkSq === bi;
        return (
          <button
            key={display}
            onClick={() => tap(display)}
            className="relative flex items-center justify-center"
            style={{ background: isSel ? '#7bbcff' : isCheck ? '#e57373' : dark ? DARK : LIGHT }}
          >
            {isLast && !isSel && <span className="pointer-events-none absolute inset-0 bg-yellow-300/35" />}
            {piece && (
              <span
                className="relative select-none leading-none"
                style={{
                  fontSize: 'min(8vw,34px)',
                  color: piece.c === 'w' ? '#fbfbfb' : '#1c1c1c',
                  textShadow: piece.c === 'w' ? '0 1px 1px rgba(0,0,0,.55)' : '0 1px 1px rgba(255,255,255,.25)',
                }}
              >
                {GLYPH[piece.t]}
              </span>
            )}
            {isTarget && !piece && <span className="pointer-events-none absolute h-1/4 w-1/4 rounded-full bg-black/30" />}
            {isTarget && piece && <span className="pointer-events-none absolute inset-1 rounded-full ring-4 ring-black/30" />}
          </button>
        );
      })}
    </div>
  );
}
