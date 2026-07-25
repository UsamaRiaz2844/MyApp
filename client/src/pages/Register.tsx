import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-500 via-fuchsia-500 to-pink-500 px-6 dark:from-[#0b0c10] dark:via-[#14152b] dark:to-[#1a0f2e]">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl dark:bg-brand-500/20" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/20 blur-3xl dark:bg-fuchsia-500/20" />

      <ThemeToggle className="absolute right-5 top-5" />

      <div className="relative w-full max-w-sm animate-pop-in rounded-3xl bg-white/90 p-8 shadow-2xl backdrop-blur dark:bg-white/[0.06] dark:ring-1 dark:ring-white/10">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-pink-500 text-3xl shadow-lg shadow-brand-500/30">
            💬
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Join Pronto</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No email, no phone. Just a username.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Choose a username
            </label>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3-20 chars: letters, numbers, _"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-brand-500/40 transition focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 4 characters"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-brand-500/40 transition focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

          <button
            disabled={busy || !username || !password}
            className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-pink-500 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 dark:text-brand-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
