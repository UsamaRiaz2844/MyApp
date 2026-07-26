import { useEffect, useRef, useState } from 'react';
import { useLock } from '../context/LockContext';
import PinPad from './PinPad';

// Full-screen lock shown whenever the app is locked. Rendered at app root.
export default function ScreenLock() {
  const { locked, unlock, bioEnabled, unlockWithBiometric } = useLock();
  const [error, setError] = useState('');
  const tried = useRef(false);

  // Offer biometrics automatically when the lock appears.
  useEffect(() => {
    if (locked && bioEnabled && !tried.current) {
      tried.current = true;
      unlockWithBiometric();
    }
    if (!locked) tried.current = false;
  }, [locked, bioEnabled, unlockWithBiometric]);

  if (!locked) return null;

  async function tryUnlock(pin: string) {
    const ok = await unlock(pin);
    if (!ok) setError('Wrong PIN, try again');
    else setError('');
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-brand-500 via-fuchsia-500 to-pink-500 px-6 dark:from-[#0b0c10] dark:via-[#14152b] dark:to-[#1a0f2e]">
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/90 text-3xl shadow-lg dark:bg-white/10">
        🔒
      </div>
      <div className="w-full max-w-xs rounded-3xl bg-white/90 p-6 shadow-2xl backdrop-blur dark:bg-white/[0.06] dark:ring-1 dark:ring-white/10">
        <PinPad title="Enter PIN" subtitle="Pronto is locked" onSubmit={tryUnlock} error={error} />
        {bioEnabled && (
          <button
            onClick={() => unlockWithBiometric()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200"
          >
            ☝️ Unlock with fingerprint / Face
          </button>
        )}
      </div>
    </div>
  );
}
