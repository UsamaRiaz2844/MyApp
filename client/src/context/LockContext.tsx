import React, { createContext, useContext, useEffect, useState } from 'react';
import { authenticateBiometric, biometricEnabled, forgetBiometric, registerBiometric } from '../lib/biometric';

interface LockContextValue {
  enabled: boolean;
  locked: boolean;
  bioEnabled: boolean;
  setPin: (pin: string) => Promise<void>;
  disable: () => void;
  unlock: (pin: string) => Promise<boolean>;
  lockNow: () => void;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => void;
  unlockWithBiometric: () => Promise<boolean>;
}

const LockContext = createContext<LockContextValue | null>(null);

const KEY = 'pronto_lock_hash';
// Survives page refreshes and quick app-switches (same browsing session), but is
// cleared when the app is fully closed — so we only ask for the PIN on a genuine
// cold start, never on refresh or when returning from the background.
const SESSION_OK = 'pronto_session_unlocked';

function markUnlocked() {
  try {
    sessionStorage.setItem(SESSION_OK, '1');
  } catch {
    /* ignore */
  }
}
function clearUnlocked() {
  try {
    sessionStorage.removeItem(SESSION_OK);
  } catch {
    /* ignore */
  }
}
function sessionUnlocked() {
  try {
    return sessionStorage.getItem(SESSION_OK) === '1';
  } catch {
    return false;
  }
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(() => !!localStorage.getItem(KEY));
  // Locked only on a cold start: PIN set AND this browsing session hasn't been
  // unlocked yet. Refreshing or returning from the background keeps us unlocked
  // (privacy is handled separately by the blur screen).
  const [locked, setLocked] = useState(() => !!localStorage.getItem(KEY) && !sessionUnlocked());
  const [bioEnabled, setBioEnabled] = useState(() => biometricEnabled());

  async function setPin(pin: string) {
    localStorage.setItem(KEY, await sha256(pin));
    markUnlocked();
    setEnabled(true);
    setLocked(false);
  }
  function disable() {
    localStorage.removeItem(KEY);
    clearUnlocked();
    setEnabled(false);
    setLocked(false);
    forgetBiometric();
    setBioEnabled(false);
  }
  async function unlock(pin: string) {
    const ok = (await sha256(pin)) === localStorage.getItem(KEY);
    if (ok) {
      markUnlocked();
      setLocked(false);
    }
    return ok;
  }
  function lockNow() {
    if (localStorage.getItem(KEY)) {
      clearUnlocked();
      setLocked(true);
    }
  }
  function disableBio() {
    forgetBiometric();
    setBioEnabled(false);
  }
  async function enableBiometric() {
    const ok = await registerBiometric();
    if (ok) setBioEnabled(true);
    return ok;
  }
  async function unlockWithBiometric() {
    const ok = await authenticateBiometric();
    if (ok) {
      markUnlocked();
      setLocked(false);
    }
    return ok;
  }

  return (
    <LockContext.Provider
      value={{
        enabled,
        locked,
        bioEnabled,
        setPin,
        disable,
        unlock,
        lockNow,
        enableBiometric,
        disableBiometric: disableBio,
        unlockWithBiometric,
      }}
    >
      {children}
    </LockContext.Provider>
  );
}

export function useLock() {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used within LockProvider');
  return ctx;
}
