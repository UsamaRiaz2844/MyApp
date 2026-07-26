import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { supabase } from '../lib/supabase';
import {
  C4_COLS,
  C4_ROWS,
  GAME_META,
  RPS_EMOJI,
  c4Drop,
  c4Winner,
  newSecret,
  rpsResolve,
  tttLine,
  tttWinner,
  type GameType,
  type Rps,
} from '../lib/games';

interface Props {
  conversationId: string;
  type: GameType;
  me: string;
  other: string;
  otherName: string;
  onClose: () => void;
}

export default function GamePanel({ conversationId, type, me, other, otherName, onClose }: Props) {
  const [game, setGame] = useState<any | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load (or create) the active game + scores.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let g = await api.getActiveGame(conversationId, type);
        if (!g) {
          const state =
            type === 'ttt'
              ? { board: Array(9).fill(null) }
              : type === 'c4'
              ? { board: Array(C4_ROWS * C4_COLS).fill(null) }
              : type === 'guess'
              ? { secret: newSecret(), low: 1, high: 100, guesses: [] }
              : { choices: {}, round: 1 };
          const turn = type === 'rps' ? null : me;
          g = await api.createGame(conversationId, type, state, turn);
        }
        if (!alive) return;
        setGame(g);
        setScores(await api.getScores(conversationId));
      } catch (e: any) {
        if (alive) setError(e?.message || 'Games need the games.sql migration to be run in Supabase.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [conversationId, type, me]);

  // Realtime: game moves + scoreboard.
  useEffect(() => {
    const ch = supabase
      .channel(`games-${conversationId}-${type}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `conversation_id=eq.${conversationId}` },
        (p: any) => {
          const row = p.new;
          if (row && row.type === type) setGame(row);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_scores', filter: `conversation_id=eq.${conversationId}` },
        () => api.getScores(conversationId).then(setScores).catch(() => {})
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversationId, type]);

  // RPS: once both have picked, one client (deterministic) finalises the winner.
  useEffect(() => {
    if (type !== 'rps' || !game || game.winner) return;
    const choices = game.state?.choices || {};
    if (choices[me] && choices[other] && me < other) {
      const result = rpsResolve(choices, [me, other]);
      if (result) {
        api.updateGame(game.id, { winner: result }).catch(() => {});
        if (result !== 'draw') api.bumpScore(conversationId, result).catch(() => {});
      }
    }
  }, [game, type, me, other, conversationId]);

  function tttPlay(i: number) {
    if (!game || game.winner || game.turn !== me) return;
    const board = [...(game.state?.board || Array(9).fill(null))];
    if (board[i]) return;
    board[i] = me;
    const w = tttWinner(board);
    const patch = { state: { board }, turn: w ? game.turn : other, winner: w || null };
    setGame({ ...game, ...patch });
    api.updateGame(game.id, patch).catch(() => {});
    if (w && w !== 'draw') api.bumpScore(conversationId, w).catch(() => {});
  }

  function c4Play(col: number) {
    if (!game || game.winner || game.turn !== me) return;
    const board = [...(game.state?.board || Array(C4_ROWS * C4_COLS).fill(null))];
    const idx = c4Drop(board, col);
    if (idx < 0) return;
    board[idx] = me;
    const w = c4Winner(board);
    const patch = { state: { board }, turn: w ? game.turn : other, winner: w || null };
    setGame({ ...game, ...patch });
    api.updateGame(game.id, patch).catch(() => {});
    if (w && w !== 'draw') api.bumpScore(conversationId, w).catch(() => {});
  }

  function guessPlay(value: number) {
    if (!game || game.winner || game.turn !== me) return;
    const s = game.state || {};
    if (value === s.secret) {
      const patch = {
        state: { ...s, guesses: [...(s.guesses || []), { by: me, value, hint: 'higher' }] },
        winner: me,
      };
      setGame({ ...game, ...patch });
      api.updateGame(game.id, patch).catch(() => {});
      api.bumpScore(conversationId, me).catch(() => {});
      return;
    }
    const higher = value < s.secret;
    const patch = {
      state: {
        ...s,
        low: higher ? Math.max(s.low, value + 1) : s.low,
        high: higher ? s.high : Math.min(s.high, value - 1),
        guesses: [...(s.guesses || []), { by: me, value, hint: higher ? 'higher' : 'lower' }],
      },
      turn: other,
      winner: null,
    };
    setGame({ ...game, ...patch });
    api.updateGame(game.id, patch).catch(() => {});
  }

  function rpsPick(choice: Rps) {
    if (!game || game.winner) return;
    const choices = { ...(game.state?.choices || {}) };
    if (choices[me]) return;
    choices[me] = choice;
    const patch = { state: { ...game.state, choices } };
    setGame({ ...game, ...patch });
    api.updateGame(game.id, patch).catch(() => {});
  }

  function playAgain() {
    if (!game) return;
    const patch =
      type === 'ttt'
        ? { state: { board: Array(9).fill(null) }, turn: me, winner: null }
        : type === 'c4'
        ? { state: { board: Array(C4_ROWS * C4_COLS).fill(null) }, turn: me, winner: null }
        : type === 'guess'
        ? { state: { secret: newSecret(), low: 1, high: 100, guesses: [] }, turn: me, winner: null }
        : { state: { choices: {}, round: (game.state?.round || 1) + 1 }, turn: null, winner: null };
    setGame({ ...game, ...patch });
    api.updateGame(game.id, patch).catch(() => {});
  }

  const meta = GAME_META[type];
  const winner: string | null = game?.winner || null;
  const resultText =
    winner === 'draw' ? "It's a draw 🤝" : winner === me ? 'You win! 🎉' : winner ? `${otherName} wins 😤` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom w-full max-w-md animate-sheet-up rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-[#15161d]"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {meta.icon} {meta.label}
          </h2>
          <button onClick={onClose} className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Close
          </button>
        </div>

        {/* Scoreboard */}
        <div className="mb-4 flex items-center justify-center gap-3 rounded-2xl bg-slate-50 py-2 text-sm font-bold dark:bg-white/[0.05]">
          <span className="text-brand-600 dark:text-brand-300">You {scores[me] || 0}</span>
          <span className="text-slate-400">–</span>
          <span className="text-slate-600 dark:text-slate-300">
            {scores[other] || 0} {otherName}
          </span>
        </div>

        {error ? (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            {error}
          </div>
        ) : loading || !game ? (
          <p className="py-12 text-center text-sm text-slate-400">Setting up…</p>
        ) : type === 'ttt' ? (
          <TttBoard game={game} me={me} winner={winner} onPlay={tttPlay} />
        ) : type === 'c4' ? (
          <C4Board game={game} me={me} winner={winner} onDrop={c4Play} />
        ) : type === 'guess' ? (
          <GuessBoard game={game} me={me} winner={winner} onGuess={guessPlay} />
        ) : (
          <RpsBoard game={game} me={me} other={other} winner={winner} onPick={rpsPick} />
        )}

        {!error && game && (
          <div className="mt-4 text-center">
            {winner ? (
              <>
                <p className="mb-3 text-sm font-bold text-slate-800 dark:text-white">{resultText}</p>
                <button onClick={playAgain} className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white">
                  🔄 Play again
                </button>
              </>
            ) : type !== 'rps' ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {game.turn === me ? 'Your turn' : `${otherName}'s turn…`}
              </p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {game.state?.choices?.[me] ? `Waiting for ${otherName}…` : 'Make your move'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TttBoard({
  game,
  me,
  winner,
  onPlay,
}: {
  game: any;
  me: string;
  winner: string | null;
  onPlay: (i: number) => void;
}) {
  const board: (string | null)[] = game.state?.board || Array(9).fill(null);
  const line = tttLine(board);
  return (
    <div className="mx-auto grid w-56 grid-cols-3 gap-2">
      {board.map((cell, i) => {
        const mine = cell === me;
        const win = line?.includes(i);
        return (
          <button
            key={i}
            onClick={() => onPlay(i)}
            disabled={!!cell || !!winner || game.turn !== me}
            className={`flex aspect-square items-center justify-center rounded-xl text-3xl font-bold transition active:scale-95 disabled:cursor-default ${
              win ? 'bg-brand-100 dark:bg-brand-500/30' : 'bg-slate-100 dark:bg-white/[0.06]'
            }`}
          >
            {cell ? (mine ? '❌' : '⭕') : ''}
          </button>
        );
      })}
    </div>
  );
}

function C4Board({
  game,
  me,
  winner,
  onDrop,
}: {
  game: any;
  me: string;
  winner: string | null;
  onDrop: (col: number) => void;
}) {
  const board: (string | null)[] = game.state?.board || Array(C4_ROWS * C4_COLS).fill(null);
  const disabled = !!winner || game.turn !== me;
  return (
    <div className="mx-auto w-full max-w-[320px] rounded-2xl bg-blue-500/90 p-2 dark:bg-blue-600/70">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: C4_COLS }).map((_, col) => (
          <button
            key={col}
            onClick={() => onDrop(col)}
            disabled={disabled}
            className="flex flex-col gap-1 disabled:cursor-default"
          >
            {Array.from({ length: C4_ROWS }).map((__, row) => {
              const cell = board[row * C4_COLS + col];
              return (
                <span
                  key={row}
                  className={`aspect-square w-full rounded-full ${
                    cell ? (cell === me ? 'bg-red-500' : 'bg-yellow-400') : 'bg-white/85 dark:bg-white/25'
                  }`}
                />
              );
            })}
          </button>
        ))}
      </div>
    </div>
  );
}

function GuessBoard({
  game,
  me,
  winner,
  onGuess,
}: {
  game: any;
  me: string;
  winner: string | null;
  onGuess: (n: number) => void;
}) {
  const [val, setVal] = useState('');
  const s = game.state || {};
  const guesses = (s.guesses || []) as { by: string; value: number; hint: string }[];
  const myTurn = game.turn === me && !winner;
  function submit() {
    const n = parseInt(val, 10);
    if (!Number.isFinite(n)) return;
    setVal('');
    onGuess(n);
  }
  return (
    <div>
      <p className="mb-3 text-center text-sm text-slate-500 dark:text-slate-400">
        Guess a number between <b>{s.low}</b> and <b>{s.high}</b>
      </p>
      {!winner && (
        <div className="mb-3 flex justify-center gap-2">
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            inputMode="numeric"
            disabled={!myTurn}
            placeholder={myTurn ? 'Your guess' : 'Their turn…'}
            className="w-32 rounded-xl bg-slate-100 px-3 py-2 text-center text-sm outline-none disabled:opacity-50 dark:bg-white/10 dark:text-white"
          />
          <button
            onClick={submit}
            disabled={!myTurn}
            className="rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            Guess
          </button>
        </div>
      )}
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {[...guesses].reverse().map((g, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm dark:bg-white/[0.05]">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {g.by === me ? 'You' : 'Them'} guessed {g.value}
            </span>
            <span className="text-xs text-slate-400">
              {winner && g.value === s.secret ? '🎯 correct!' : g.hint === 'higher' ? '⬆️ higher' : '⬇️ lower'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RpsBoard({
  game,
  me,
  other,
  winner,
  onPick,
}: {
  game: any;
  me: string;
  other: string;
  winner: string | null;
  onPick: (c: Rps) => void;
}) {
  const choices: Record<string, Rps> = game.state?.choices || {};
  const myChoice = choices[me];
  const bothIn = !!choices[me] && !!choices[other];
  const options: Rps[] = ['rock', 'paper', 'scissors'];
  return (
    <div>
      {bothIn || winner ? (
        <div className="flex items-center justify-center gap-6 py-4 text-5xl">
          <div className="text-center">
            <div>{RPS_EMOJI[choices[me]]}</div>
            <div className="mt-1 text-xs font-semibold text-brand-600 dark:text-brand-300">You</div>
          </div>
          <span className="text-2xl text-slate-400">vs</span>
          <div className="text-center">
            <div>{RPS_EMOJI[choices[other]]}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">Them</div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center gap-3 py-2">
          {options.map((o) => (
            <button
              key={o}
              onClick={() => onPick(o)}
              disabled={!!myChoice}
              className={`flex h-20 w-20 items-center justify-center rounded-2xl text-4xl transition active:scale-90 disabled:opacity-40 ${
                myChoice === o ? 'bg-brand-100 ring-2 ring-brand-500 dark:bg-brand-500/20' : 'bg-slate-100 dark:bg-white/[0.06]'
              }`}
            >
              {RPS_EMOJI[o]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
