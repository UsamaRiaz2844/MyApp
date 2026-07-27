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
  fetchTrivia,
  newSecret,
  rpsResolve,
  tttLine,
  tttWinner,
  type GameType,
  type Rps,
} from '../lib/games';
import LudoBoard from './LudoBoard';
import DiceCube from './DiceCube';
import { absTrack, canMoveToken, nextSteps, roleOf, LUDO_SAFE } from '../lib/ludo';
import ChessBoard from './ChessBoard';
import { applyMove, initialState, inCheck, statusFor, type ChessState, type Move as ChessMove } from '../lib/chess';
import CricketField from './CricketField';
import GoalScene from './GoalScene';

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
          let state: any;
          if (type === 'ttt') state = { board: Array(9).fill(null) };
          else if (type === 'c4') state = { board: Array(C4_ROWS * C4_COLS).fill(null) };
          else if (type === 'guess') state = { secret: newSecret(), low: 1, high: 100, guesses: [] };
          else if (type === 'trivia') state = (await fetchTrivia()) || { question: '', options: [], correct: 0, answers: {} };
          else if (type === 'ludo') state = { tokens: { [me]: [-1, -1, -1, -1], [other]: [-1, -1, -1, -1] }, turn: me, die: null, phase: 'roll' };
          else if (type === 'chess') {
            const init = initialState();
            const white = me < other ? me : other;
            state = { ...init, white, black: white === me ? other : me, lastMove: null };
          } else if (type === 'cricket') {
            state = { batter: me, first: me, innings: 1, scores: { [me]: 0, [other]: 0 }, picks: {}, target: null, lastBall: null, done: false };
          } else if (type === 'football') {
            state = { shooter: me, goals: { [me]: 0, [other]: 0 }, taken: { [me]: 0, [other]: 0 }, picks: {}, last: null, done: false };
          } else state = { choices: {}, round: 1 };
          const turn = type === 'ttt' || type === 'c4' || type === 'guess' ? me : null;
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

  function triviaAnswer(idx: number) {
    if (!game || game.winner) return;
    const answers = { ...(game.state?.answers || {}) };
    if (answers[me] != null) return;
    answers[me] = idx;
    const patch = { state: { ...game.state, answers } };
    setGame({ ...game, ...patch });
    api.updateGame(game.id, patch).catch(() => {});
  }

  // Trivia: once both have answered, one client (deterministic) reveals + scores.
  useEffect(() => {
    if (type !== 'trivia' || !game || game.winner) return;
    const a = game.state?.answers || {};
    if (a[me] != null && a[other] != null && me < other) {
      api.updateGame(game.id, { winner: 'done' }).catch(() => {});
      if (a[me] === game.state.correct) api.bumpScore(conversationId, me).catch(() => {});
      if (a[other] === game.state.correct) api.bumpScore(conversationId, other).catch(() => {});
    }
  }, [game, type, me, other, conversationId]);

  function ludoRoll() {
    if (!game || game.winner) return;
    const s = game.state || {};
    if (s.turn !== me || s.phase !== 'roll') return;
    const d = 1 + Math.floor(Math.random() * 6);
    const mine: number[] = s.tokens?.[me] || [];
    const movable = mine.some((st) => canMoveToken(st, d));
    const patch = movable
      ? { state: { ...s, die: d, phase: 'move' } }
      : { state: { ...s, die: d, phase: 'roll', turn: other } };
    setGame({ ...game, ...patch });
    api.updateGame(game.id, patch).catch(() => {});
  }

  function ludoMove(i: number) {
    if (!game || game.winner) return;
    const s = game.state || {};
    if (s.turn !== me || s.phase !== 'move') return;
    const d = s.die as number;
    const mine = [...(s.tokens[me] as number[])];
    if (!canMoveToken(mine[i], d)) return;
    const role = roleOf(me, me, other);
    mine[i] = nextSteps(mine[i], d);
    // capture opponent tokens on the same (non-safe) track cell
    let captured = false;
    const opp = [...(s.tokens[other] as number[])];
    const oppRole = roleOf(other, me, other);
    const landed = absTrack(role, mine[i]);
    if (landed != null && !LUDO_SAFE.has(landed)) {
      for (let k = 0; k < 4; k++) {
        if (absTrack(oppRole, opp[k]) === landed) {
          opp[k] = -1;
          captured = true;
        }
      }
    }
    const tokens = { ...s.tokens, [me]: mine, [other]: opp };
    const won = mine.every((x) => x === 56);
    const again = d === 6 || captured;
    const patch: any = {
      state: { ...s, tokens, die: null, phase: 'roll', turn: won ? me : again ? me : other },
      winner: won ? me : null,
    };
    setGame({ ...game, ...patch });
    api.updateGame(game.id, patch).catch(() => {});
    if (won) api.bumpScore(conversationId, me).catch(() => {});
  }

  function chessMove(m: ChessMove) {
    if (!game || game.winner) return;
    const s = game.state;
    const myColor = s.white === me ? 'w' : 'b';
    if (s.turn !== myColor) return;
    const cs: ChessState = { board: s.board, turn: s.turn, castling: s.castling, ep: s.ep };
    const next = applyMove(cs, m);
    const st = statusFor(next, next.turn); // opponent to move
    const winner = st === 'checkmate' ? me : st === 'stalemate' ? 'draw' : null;
    const patch: any = {
      state: { ...s, board: next.board, turn: next.turn, castling: next.castling, ep: next.ep, lastMove: [m.from, m.to], status: st },
      winner,
    };
    setGame({ ...game, ...patch });
    api.updateGame(game.id, patch).catch(() => {});
    if (winner === me) api.bumpScore(conversationId, me).catch(() => {});
  }

  function cricketPick(n: number) {
    if (!game || game.winner) return;
    const s = game.state;
    if (s.done) return;
    const picks = { ...(s.picks || {}) };
    if (picks[me] != null) return;
    picks[me] = n;
    const patch = { state: { ...s, picks } };
    setGame({ ...game, ...patch });
    api.updateGame(game.id, patch).catch(() => {});
  }

  // Cricket: once both have picked a number, one client resolves the ball.
  useEffect(() => {
    if (type !== 'cricket' || !game || game.winner) return;
    const s = game.state;
    if (s.done) return;
    const picks = s.picks || {};
    if (picks[me] == null || picks[other] == null || me >= other) return;

    const batter = s.batter as string;
    const bowler = batter === me ? other : me;
    const bp = picks[batter];
    const op = picks[bowler];
    const scores = { ...s.scores };
    let patch: any;

    if (bp === op) {
      // OUT
      if (s.innings === 1) {
        patch = { state: { ...s, picks: {}, innings: 2, batter: bowler, target: (scores[batter] || 0) + 1, lastBall: { text: 'OUT! 🙌', out: true } } };
      } else {
        // innings 2 wicket → compare the two batters' totals
        const p1 = s.first;
        const p2 = s.batter; // the second (current) batter
        const w = (scores[p1] || 0) === (scores[p2] || 0) ? 'draw' : (scores[p1] || 0) > (scores[p2] || 0) ? p1 : p2;
        patch = { state: { ...s, picks: {}, done: true, lastBall: { text: 'OUT! 🙌', out: true } }, winner: w };
      }
    } else {
      scores[batter] = (scores[batter] || 0) + bp;
      const chaseWon = s.innings === 2 && s.target != null && scores[batter] >= s.target;
      const text = bp === 6 ? 'SIX! 💥' : bp === 4 ? 'FOUR! 🏏' : `${bp} run${bp > 1 ? 's' : ''}`;
      patch = chaseWon
        ? { state: { ...s, scores, picks: {}, done: true, lastBall: { text } }, winner: batter }
        : { state: { ...s, scores, picks: {}, lastBall: { text } } };
    }
    setGame({ ...game, ...patch });
    api.updateGame(game.id, patch).catch(() => {});
    if (patch.winner && patch.winner !== 'draw') api.bumpScore(conversationId, patch.winner).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, type, me, other, conversationId]);

  function footballPick(zone: number) {
    if (!game || game.winner) return;
    const s = game.state;
    if (s.done) return;
    const picks = { ...(s.picks || {}) };
    if (picks[me] != null) return;
    picks[me] = zone;
    const patch = { state: { ...s, picks } };
    setGame({ ...game, ...patch });
    api.updateGame(game.id, patch).catch(() => {});
  }

  // Football: resolve a penalty once both have chosen (one client, deterministic).
  useEffect(() => {
    if (type !== 'football' || !game || game.winner) return;
    const s = game.state;
    if (s.done) return;
    const picks = s.picks || {};
    if (picks[me] == null || picks[other] == null || me >= other) return;

    const shooter = s.shooter as string;
    const keeper = shooter === me ? other : me;
    const aim = picks[shooter];
    const dive = picks[keeper];
    const goal = aim !== dive;
    const goals = { ...s.goals };
    const taken = { ...s.taken };
    goals[shooter] = (goals[shooter] || 0) + (goal ? 1 : 0);
    taken[shooter] = (taken[shooter] || 0) + 1;

    const bothDone = (taken[me] || 0) >= 5 && (taken[other] || 0) >= 5 && taken[me] === taken[other];
    const decided = bothDone && goals[me] !== goals[other];
    const winner = decided ? (goals[me] > goals[other] ? me : other) : null;
    const patch: any = {
      state: { ...s, goals, taken, shooter: decided ? shooter : keeper, picks: {}, last: { aim, dive, goal }, done: decided },
      winner,
    };
    setGame({ ...game, ...patch });
    api.updateGame(game.id, patch).catch(() => {});
    if (winner) api.bumpScore(conversationId, winner).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, type, me, other, conversationId]);

  async function playAgain() {
    if (!game) return;
    let patch: any;
    if (type === 'ttt') patch = { state: { board: Array(9).fill(null) }, turn: me, winner: null };
    else if (type === 'c4') patch = { state: { board: Array(C4_ROWS * C4_COLS).fill(null) }, turn: me, winner: null };
    else if (type === 'guess') patch = { state: { secret: newSecret(), low: 1, high: 100, guesses: [] }, turn: me, winner: null };
    else if (type === 'trivia')
      patch = { state: (await fetchTrivia()) || { question: '', options: [], correct: 0, answers: {} }, turn: null, winner: null };
    else if (type === 'ludo')
      patch = { state: { tokens: { [me]: [-1, -1, -1, -1], [other]: [-1, -1, -1, -1] }, turn: me, die: null, phase: 'roll' }, turn: me, winner: null };
    else if (type === 'chess') {
      const init = initialState();
      const white = me < other ? me : other;
      patch = { state: { ...init, white, black: white === me ? other : me, lastMove: null }, turn: null, winner: null };
    } else if (type === 'cricket') {
      patch = { state: { batter: me, first: me, innings: 1, scores: { [me]: 0, [other]: 0 }, picks: {}, target: null, lastBall: null, done: false }, winner: null };
    } else if (type === 'football') {
      patch = { state: { shooter: me, goals: { [me]: 0, [other]: 0 }, taken: { [me]: 0, [other]: 0 }, picks: {}, last: null, done: false }, winner: null };
    } else patch = { state: { choices: {}, round: (game.state?.round || 1) + 1 }, turn: null, winner: null };
    setGame({ ...game, ...patch });
    api.updateGame(game.id, patch).catch(() => {});
  }

  const meta = GAME_META[type];
  const winner: string | null = game?.winner || null;
  let resultText = '';
  if (type === 'trivia' && winner) {
    const a = game?.state?.answers || {};
    const myOk = a[me] === game?.state?.correct;
    const otherOk = a[other] === game?.state?.correct;
    resultText = myOk && otherOk ? 'You both nailed it! 🎉' : myOk ? 'You got it right! ✅' : otherOk ? `Only ${otherName} got it 😅` : 'Neither of you got it 🙈';
  } else if (winner) {
    resultText = winner === 'draw' ? "It's a draw 🤝" : winner === me ? 'You win! 🎉' : `${otherName} wins 😤`;
  }

  // ---- Ludo gets its own full-screen board ---------------------------------
  if (type === 'ludo') {
    const st = game?.state;
    const roleMe = roleOf(me, me, other);
    const aPid = roleMe === 'A' ? me : other;
    const bPid = roleMe === 'A' ? other : me;
    const myTurn = st?.turn === me && !winner;
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#241633] via-[#31204d] to-[#3a2358] text-white">
        <header className="safe-top flex items-center justify-between px-4 py-3">
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg active:scale-90">
            ←
          </button>
          <h2 className="text-base font-extrabold tracking-wide">🎲 LUDO</h2>
          <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold tabular-nums">
            🔴 {scores[aPid] || 0} · {scores[bPid] || 0} 🟢
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-3 pb-6">
          {error ? (
            <div className="mx-4 rounded-2xl bg-amber-500/15 p-4 text-center text-sm text-amber-200">{error}</div>
          ) : loading || !game ? (
            <p className="text-sm text-white/60">Setting up the board…</p>
          ) : (
            <>
              <LudoBoard game={game} me={me} other={other} onMove={ludoMove} />

              <div className="flex items-center gap-5">
                <DiceCube value={st?.die ?? null} spin={`${st?.die}-${st?.turn}-${st?.phase}`} />
                <div className="text-center">
                  <p className="mb-1 text-xs font-medium text-white/55">
                    You are {roleMe === 'A' ? '🔴 Red' : '🟢 Green'}
                  </p>
                  {winner ? (
                    <p className="text-lg font-extrabold">{resultText}</p>
                  ) : myTurn ? (
                    st?.phase === 'roll' ? (
                      <button
                        onClick={ludoRoll}
                        className="rounded-2xl bg-white px-7 py-3 text-base font-extrabold text-slate-900 shadow-lg active:scale-95"
                      >
                        Roll dice
                      </button>
                    ) : (
                      <p className="text-sm font-bold text-amber-300">Tap a glowing token</p>
                    )
                  ) : (
                    <p className="text-sm text-white/65">{otherName} is playing…</p>
                  )}
                </div>
              </div>

              {winner && (
                <button onClick={playAgain} className="rounded-2xl bg-white/15 px-7 py-3 text-sm font-bold active:scale-95">
                  🔄 Play again
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- Chess: full-screen board --------------------------------------------
  if (type === 'chess') {
    const st = game?.state;
    const myColor = st?.white === me ? 'w' : 'b';
    const myTurn = st?.turn === myColor && !winner;
    const checking = st && inCheck(st.board, st.turn);
    const chessResult =
      winner === 'draw'
        ? 'Stalemate — draw 🤝'
        : winner === me
        ? 'Checkmate — you win! 🎉'
        : winner
        ? `Checkmate — ${otherName} wins 😤`
        : '';
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#241a12] via-[#2e2116] to-[#3a2a1a] text-white">
        <header className="safe-top flex items-center justify-between px-4 py-3">
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg active:scale-90">
            ←
          </button>
          <h2 className="text-base font-extrabold tracking-widest">♛ CHESS</h2>
          <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold tabular-nums">
            You {scores[me] || 0} · {scores[other] || 0}
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-3 pb-6">
          {error ? (
            <div className="mx-4 rounded-2xl bg-amber-500/15 p-4 text-center text-sm text-amber-200">{error}</div>
          ) : loading || !game ? (
            <p className="text-sm text-white/60">Setting up the board…</p>
          ) : (
            <>
              <p className="text-xs font-medium text-white/55">You play {myColor === 'w' ? '♙ White' : '♟ Black'}</p>
              <ChessBoard game={game} me={me} onMove={chessMove} />
              <div className="text-center">
                {winner ? (
                  <p className="text-lg font-extrabold">{chessResult}</p>
                ) : (
                  <p className={`text-base font-bold ${checking ? 'text-red-300' : 'text-white/80'}`}>
                    {checking ? '⚠️ Check! ' : ''}
                    {myTurn ? 'Your move' : `${otherName} is thinking…`}
                  </p>
                )}
              </div>
              {winner && (
                <button onClick={playAgain} className="rounded-2xl bg-white/15 px-7 py-3 text-sm font-bold active:scale-95">
                  🔄 Rematch
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- Cricket: full-screen ------------------------------------------------
  if (type === 'cricket') {
    const st = game?.state;
    const iBat = st?.batter === me;
    const iPicked = st?.picks?.[me] != null;
    const myRuns = st?.scores?.[me] || 0;
    const theirRuns = st?.scores?.[other] || 0;
    const result =
      winner === 'draw' ? "It's a tie 🤝" : winner === me ? 'You won! 🎉' : winner ? `${otherName} won 😤` : '';
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#0f3d24] via-[#14532d] to-[#1b6b3a] text-white">
        <header className="safe-top flex items-center justify-between px-4 py-3">
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg active:scale-90">
            ←
          </button>
          <h2 className="text-base font-extrabold tracking-widest">🏏 CRICKET</h2>
          <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold tabular-nums">
            You {myRuns} · {theirRuns}
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-3 pb-6">
          {error ? (
            <div className="mx-4 rounded-2xl bg-amber-500/15 p-4 text-center text-sm text-amber-200">{error}</div>
          ) : loading || !game ? (
            <p className="text-sm text-white/60">Setting up…</p>
          ) : (
            <>
              <CricketField batting={iBat} lastText={st?.lastBall?.text} />
              <div className="text-center">
                <p className="text-xs font-medium text-white/60">
                  Innings {st?.innings}
                  {st?.innings === 2 && st?.target != null ? ` · Target ${st.target}` : ''}
                </p>
                <p className="text-lg font-extrabold">
                  {winner ? result : iBat ? '🏏 You are batting' : '🎯 You are bowling'}
                </p>
              </div>

              {!winner &&
                (iPicked ? (
                  <p className="text-sm text-white/70">Waiting for {otherName}…</p>
                ) : (
                  <div className="grid grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        onClick={() => cricketPick(n)}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-extrabold text-slate-900 shadow active:scale-90"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                ))}
              {!winner && (
                <p className="text-xs text-white/50">{iBat ? 'Pick your shot — avoid the bowler’s number!' : 'Pick a ball — match to take the wicket!'}</p>
              )}

              {winner && (
                <button onClick={playAgain} className="rounded-2xl bg-white/15 px-7 py-3 text-sm font-bold active:scale-95">
                  🔄 Play again
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- Football: penalty shootout ------------------------------------------
  if (type === 'football') {
    const st = game?.state;
    const iShoot = st?.shooter === me;
    const iPicked = st?.picks?.[me] != null;
    const myG = st?.goals?.[me] || 0;
    const theirG = st?.goals?.[other] || 0;
    const kicks = ((st?.taken?.[me] || 0) + (st?.taken?.[other] || 0)) + 1;
    const result = winner === me ? 'You won! 🏆' : winner ? `${otherName} won 😤` : '';
    const ZONES = ['↖️', '⬆️', '↗️', '↙️', '⬇️', '↘️'];
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#0c2a4a] via-[#123a63] to-[#1b5136] text-white">
        <header className="safe-top flex items-center justify-between px-4 py-3">
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg active:scale-90">
            ←
          </button>
          <h2 className="text-base font-extrabold tracking-widest">⚽ PENALTIES</h2>
          <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold tabular-nums">
            You {myG} · {theirG}
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-3 pb-6">
          {error ? (
            <div className="mx-4 rounded-2xl bg-amber-500/15 p-4 text-center text-sm text-amber-200">{error}</div>
          ) : loading || !game ? (
            <p className="text-sm text-white/60">Setting up…</p>
          ) : (
            <>
              <GoalScene last={st?.last} />
              <p className="text-lg font-extrabold">
                {winner ? result : iShoot ? '⚽ You shoot' : '🧤 You dive'}
              </p>
              {!winner &&
                (iPicked ? (
                  <p className="text-sm text-white/70">Waiting for {otherName}…</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {ZONES.map((z, i) => (
                      <button
                        key={i}
                        onClick={() => footballPick(i)}
                        className="flex h-14 w-16 items-center justify-center rounded-2xl bg-white/90 text-2xl shadow active:scale-90"
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                ))}
              {!winner && (
                <p className="text-xs text-white/50">Kick #{kicks} · {iShoot ? 'aim for an open corner' : 'guess where they’ll shoot'}</p>
              )}
              {winner && (
                <button onClick={playAgain} className="rounded-2xl bg-white/15 px-7 py-3 text-sm font-bold active:scale-95">
                  🔄 Play again
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

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
        ) : type === 'trivia' ? (
          <TriviaBoard game={game} me={me} winner={winner} onAnswer={triviaAnswer} />
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
            ) : type === 'ttt' || type === 'c4' || type === 'guess' ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {game.turn === me ? 'Your turn' : `${otherName}'s turn…`}
              </p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {(type === 'rps' ? game.state?.choices?.[me] : game.state?.answers?.[me] != null)
                  ? `Waiting for ${otherName}…`
                  : type === 'trivia'
                  ? 'Pick your answer'
                  : 'Make your move'}
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

function TriviaBoard({
  game,
  me,
  winner,
  onAnswer,
}: {
  game: any;
  me: string;
  winner: string | null;
  onAnswer: (idx: number) => void;
}) {
  const s = game.state || {};
  const options: string[] = s.options || [];
  const myAnswer = s.answers?.[me];
  const revealed = !!winner;
  if (!s.question) return <p className="py-8 text-center text-sm text-slate-400">Loading question…</p>;
  return (
    <div>
      <p className="mb-3 text-center font-semibold text-slate-800 dark:text-white">{s.question}</p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const isCorrect = i === s.correct;
          const isMine = myAnswer === i;
          let cls = 'bg-slate-100 dark:bg-white/[0.06]';
          if (revealed) {
            if (isCorrect) cls = 'bg-green-100 text-green-800 dark:bg-green-500/25 dark:text-green-200';
            else if (isMine) cls = 'bg-red-100 text-red-800 dark:bg-red-500/25 dark:text-red-200';
          } else if (isMine) {
            cls = 'bg-brand-100 ring-2 ring-brand-500 dark:bg-brand-500/20';
          }
          return (
            <button
              key={i}
              onClick={() => onAnswer(i)}
              disabled={myAnswer != null || revealed}
              className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition active:scale-[0.98] disabled:cursor-default ${cls}`}
            >
              {revealed && isCorrect ? '✅ ' : revealed && isMine ? '❌ ' : ''}
              {opt}
            </button>
          );
        })}
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
