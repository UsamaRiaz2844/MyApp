import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { supabase } from '../lib/supabase';

interface Props {
  conversationId: string;
  me: string;
  other: string;
  otherName: string;
  onClose: () => void;
}

type Tab = 'plans' | 'split' | 'polls';

export default function SharedPanel({ conversationId, me, other, otherName, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('plans');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'plans', label: 'Plans', icon: '📝' },
    { id: 'split', label: 'Split', icon: '💰' },
    { id: 'polls', label: 'Polls', icon: '📊' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-white p-5 shadow-2xl animate-sheet-up dark:bg-[#15161d]"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />
        <div className="mb-3 flex gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-white/[0.06]">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                tab === t.id ? 'bg-white shadow dark:bg-white/10 dark:text-white' : 'text-slate-500'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === 'plans' && <PlansTab conversationId={conversationId} />}
          {tab === 'split' && <SplitTab conversationId={conversationId} me={me} other={other} otherName={otherName} />}
          {tab === 'polls' && <PollsTab conversationId={conversationId} me={me} />}
        </div>
      </div>
    </div>
  );
}

function useRealtime(conversationId: string, table: string, reload: () => void) {
  useEffect(() => {
    reload();
    const ch = supabase
      .channel(`${table}-${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `conversation_id=eq.${conversationId}` }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, table]);
}

// ---- Plans / to-do --------------------------------------------------------
function PlansTab({ conversationId }: { conversationId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const load = () =>
    api
      .listChecklist(conversationId)
      .then(setItems)
      .catch((e) => setErr(e?.message || 'Run RUN_ALL.sql to enable this.'));
  useRealtime(conversationId, 'checklist_items', load);

  async function add() {
    const t = text.trim();
    if (!t) return;
    setText('');
    await api.addChecklist(conversationId, t).catch(() => {});
    load();
  }

  if (err) return <p className="py-8 text-center text-sm text-amber-600 dark:text-amber-400">{err}</p>;
  return (
    <div>
      <div className="mb-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a plan or to-do…"
          className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-white/10 dark:text-white"
        />
        <button onClick={add} className="rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white">
          Add
        </button>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No plans yet — add one 🎯</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.05]">
              <button
                onClick={() => api.toggleChecklist(it.id, !it.done).then(load)}
                className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs ${
                  it.done ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 dark:border-white/20'
                }`}
              >
                {it.done ? '✓' : ''}
              </button>
              <span className={`flex-1 text-sm ${it.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                {it.text}
              </span>
              <button onClick={() => api.deleteChecklist(it.id).then(load)} className="text-slate-300 hover:text-red-500">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- Split / who owes who -------------------------------------------------
function SplitTab({
  conversationId,
  me,
  other,
  otherName,
}: {
  conversationId: string;
  me: string;
  other: string;
  otherName: string;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [payer, setPayer] = useState(me);
  const [err, setErr] = useState('');
  const load = () =>
    api
      .listExpenses(conversationId)
      .then(setRows)
      .catch((e) => setErr(e?.message || 'Run RUN_ALL.sql to enable this.'));
  useRealtime(conversationId, 'expenses', load);

  async function add() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setAmount('');
    setNote('');
    await api.addExpense(conversationId, payer, amt, note.trim()).catch(() => {});
    load();
  }

  const paidMe = rows.filter((r) => r.payer === me).reduce((s, r) => s + Number(r.amount), 0);
  const paidOther = rows.filter((r) => r.payer === other).reduce((s, r) => s + Number(r.amount), 0);
  const total = paidMe + paidOther;
  const net = paidMe - total / 2; // >0 => other owes me
  const settle =
    Math.abs(net) < 0.005
      ? 'All settled 🤝'
      : net > 0
      ? `${otherName} owes you ₹${net.toFixed(2)}`
      : `You owe ${otherName} ₹${(-net).toFixed(2)}`;

  if (err) return <p className="py-8 text-center text-sm text-amber-600 dark:text-amber-400">{err}</p>;
  return (
    <div>
      <div className="mb-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4 text-center dark:from-emerald-500/10 dark:to-teal-500/10">
        <p className="text-lg font-black text-slate-800 dark:text-white">{settle}</p>
        <p className="mt-0.5 text-xs text-slate-400">₹{total.toFixed(2)} spent together</p>
      </div>

      <div className="mb-3 space-y-2">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/[0.06]">
          <button
            onClick={() => setPayer(me)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${payer === me ? 'bg-white shadow dark:bg-white/10 dark:text-white' : 'text-slate-500'}`}
          >
            You paid
          </button>
          <button
            onClick={() => setPayer(other)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${payer === other ? 'bg-white shadow dark:bg-white/10 dark:text-white' : 'text-slate-500'}`}
          >
            {otherName} paid
          </button>
        </div>
        <div className="flex gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Amount ₹"
            className="w-28 rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-white/10 dark:text-white"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="For what?"
            className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-white/10 dark:text-white"
          />
          <button onClick={add} className="rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white">
            Add
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No expenses logged yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.05]">
              <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">
                <span className="font-semibold">{r.payer === me ? 'You' : otherName}</span> paid{' '}
                <span className="font-semibold">₹{Number(r.amount).toFixed(2)}</span>
                {r.note ? ` · ${r.note}` : ''}
              </span>
              <button onClick={() => api.deleteExpense(r.id).then(load)} className="text-slate-300 hover:text-red-500">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- Polls ----------------------------------------------------------------
function PollsTab({ conversationId, me }: { conversationId: string; me: string }) {
  const [polls, setPolls] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [opts, setOpts] = useState(['', '']);
  const [err, setErr] = useState('');
  const load = () =>
    api
      .listPolls(conversationId)
      .then(setPolls)
      .catch((e) => setErr(e?.message || 'Run RUN_ALL.sql to enable this.'));
  useRealtime(conversationId, 'polls', load);

  async function create() {
    const q = question.trim();
    const options = opts.map((o) => o.trim()).filter(Boolean);
    if (!q || options.length < 2) return;
    await api.createPoll(conversationId, q, options).catch(() => {});
    setQuestion('');
    setOpts(['', '']);
    setCreating(false);
    load();
  }
  async function vote(poll: any, idx: number) {
    const votes = { ...(poll.votes || {}), [me]: idx };
    setPolls((prev) => prev.map((p) => (p.id === poll.id ? { ...p, votes } : p))); // optimistic
    await api.votePoll(poll.id, votes).catch(() => {});
  }

  if (err) return <p className="py-8 text-center text-sm text-amber-600 dark:text-amber-400">{err}</p>;
  return (
    <div>
      {creating ? (
        <div className="mb-3 space-y-2 rounded-2xl bg-slate-50 p-3 dark:bg-white/[0.05]">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question…"
            className="w-full rounded-xl bg-white px-3 py-2 text-sm outline-none dark:bg-white/10 dark:text-white"
          />
          {opts.map((o, i) => (
            <input
              key={i}
              value={o}
              onChange={(e) => setOpts((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder={`Option ${i + 1}`}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm outline-none dark:bg-white/10 dark:text-white"
            />
          ))}
          <div className="flex gap-2">
            {opts.length < 4 && (
              <button onClick={() => setOpts((p) => [...p, ''])} className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold dark:bg-white/10 dark:text-white">
                + Option
              </button>
            )}
            <button onClick={create} className="flex-1 rounded-xl bg-brand-500 py-2 text-sm font-semibold text-white">
              Create poll
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="mb-3 w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white">
          ＋ New poll
        </button>
      )}

      {polls.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No polls yet.</p>
      ) : (
        <ul className="space-y-3">
          {polls.map((p) => {
            const votes: Record<string, number> = p.votes || {};
            const totalVotes = Object.keys(votes).length;
            const myVote = votes[me];
            return (
              <li key={p.id} className="rounded-2xl bg-slate-50 p-3 dark:bg-white/[0.05]">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-800 dark:text-white">{p.question}</p>
                  {p.created_by === me && (
                    <button onClick={() => api.deletePoll(p.id).then(load)} className="text-slate-300 hover:text-red-500">
                      ✕
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {(p.options as string[]).map((opt, idx) => {
                    const count = Object.values(votes).filter((v) => v === idx).length;
                    const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                    const mine = myVote === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => vote(p, idx)}
                        className="relative w-full overflow-hidden rounded-xl border border-black/5 bg-white px-3 py-2 text-left text-sm dark:border-white/10 dark:bg-white/5"
                      >
                        <span
                          className="absolute inset-y-0 left-0 bg-brand-100 dark:bg-brand-500/25"
                          style={{ width: `${pct}%` }}
                        />
                        <span className="relative flex justify-between">
                          <span className={`${mine ? 'font-bold text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'}`}>
                            {mine ? '✓ ' : ''}
                            {opt}
                          </span>
                          <span className="text-slate-400">{count}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
