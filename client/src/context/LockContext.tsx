import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface LockContextValue {
  enabled: boolean;
  locked: boolean;
  setPin: (pin: string) => Promise<void>;
  disable: () => void;
  unlock: (pin: string) => Promise<boolean>;
  lockNow: () => void;
}

const LockContext = createContext<LockContextValue | null>(null);

const KEY = 'pronto_lock_hash';
const RELOCK_MS = 15000; // re-lock if app was backgrounded longer than this

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(() => !!localStorage.getItem(KEY));
  const [locked, setLocked] = useState(() => !!localStorage.getItem(KEY));
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now();
      } else if (localStorage.getItem(KEY) && hiddenAt.current && Date.now() - hiddenAt.current > RELOCK_MS) {
        setLocked(true);
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  async function setPin(pin: string) {
    localStorage.setItem(KEY, await sha256(pin));
    setEnabled(true);
    setLocked(false);
  }
  function disable() {
    localStorage.removeItem(KEY);
    setEnabled(false);
    setLocked(false);
  }
  async function unlock(pin: string) {
    const ok = (await sha256(pin)) === localStorage.getItem(KEY);
    if (ok) setLocked(false);
    return ok;
  }
  function lockNow() {
    if (localStorage.getItem(KEY)) setLocked(true);
  }

  return (
    <LockContext.Provider value={{ enabled, locked, setPin, disable, unlock, lockNow }}>
      {children}
    </LockContext.Provider>
  );
}

export function useLock() {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used within LockProvider');
  return ctx;
}
