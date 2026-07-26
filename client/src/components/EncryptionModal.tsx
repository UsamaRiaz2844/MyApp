import { useState } from 'react';

interface Props {
  mode: 'enable' | 'unlock';
  otherName?: string;
  error?: string | null;
  onSubmit: (passphrase: string) => Promise<boolean>;
  onClose: () => void;
}

// Bottom-sheet for turning on E2EE (enter a shared secret) or unlocking an
// already-encrypted chat on a new device (enter the same secret).
export default function EncryptionModal({ mode, otherName, error, onSubmit, onClose }: Props) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const enabling = mode === 'enable';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value || busy) return;
    setBusy(true);
    const ok = await onSubmit(value);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom w-full max-w-md animate-pop-in rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-[#15161d]"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xl">🔐</span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {enabling ? 'Turn on encryption' : 'Unlock this chat'}
          </h2>
        </div>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {enabling ? (
            <>
              Pick a secret phrase you and {otherName ? `@${otherName}` : 'your partner'} both know. New messages, photos
              and voice notes are encrypted on your device — Pronto's servers only see scrambled data.
            </>
          ) : (
            <>
              Enter the shared secret you set with {otherName ? `@${otherName}` : 'your partner'} to read and send
              encrypted messages on this device.
            </>
          )}
        </p>

        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Shared secret phrase"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none ring-brand-500/40 focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

        {enabling && (
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            ⚠️ There's no password reset. If you both forget this phrase, encrypted messages can't be recovered.
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!value || busy}
            className="flex-1 rounded-xl bg-gradient-to-br from-brand-500 to-pink-500 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
          >
            {busy ? 'Working…' : enabling ? 'Enable' : 'Unlock'}
          </button>
        </div>
      </form>
    </div>
  );
}
