import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import {
  clearPassphrase,
  deriveKey,
  loadPassphrase,
  makeCheck,
  randomSaltB64,
  savePassphrase,
  verifyCheck,
} from './crypto';

export type CryptoStatus = 'loading' | 'off' | 'locked' | 'ready';

export interface ConversationCrypto {
  status: CryptoStatus;
  key: CryptoKey | null;
  error: string | null;
  /** Turn encryption ON for this conversation (first-time setup). */
  enable: (passphrase: string) => Promise<boolean>;
  /** Unlock an already-encrypted conversation on this device. */
  unlock: (passphrase: string) => Promise<boolean>;
  /** Forget the passphrase on this device (re-lock). */
  lock: () => void;
  /** Re-check server metadata (e.g. after the partner enables encryption). */
  refresh: () => void;
}

// Manages the AES key lifecycle for one conversation: fetches the (public) salt
// + verifier, derives/verifies the key from a locally-stored passphrase, and
// exposes enable/unlock/lock actions. The passphrase never leaves the device.
export function useConversationCrypto(conversationId: string): ConversationCrypto {
  const [status, setStatus] = useState<CryptoStatus>('loading');
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const checkRef = useRef<string | null>(null);
  const saltRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { salt, check } = await api.getEncryption(conversationId);
    saltRef.current = salt;
    checkRef.current = check;
    if (!salt || !check) {
      setKey(null);
      setStatus('off');
      return;
    }
    const stored = loadPassphrase(conversationId);
    if (!stored) {
      setKey(null);
      setStatus('locked');
      return;
    }
    try {
      const k = await deriveKey(stored, salt);
      if (await verifyCheck(k, check)) {
        setKey(k);
        setStatus('ready');
      } else {
        clearPassphrase(conversationId); // stale/wrong passphrase on this device
        setKey(null);
        setStatus('locked');
      }
    } catch {
      setKey(null);
      setStatus('locked');
    }
  }, [conversationId]);

  useEffect(() => {
    setStatus('loading');
    setKey(null);
    load();
  }, [load]);

  const enable = useCallback(
    async (passphrase: string): Promise<boolean> => {
      setError(null);
      if (passphrase.length < 4) {
        setError('Use at least 4 characters.');
        return false;
      }
      try {
        // If the partner already enabled it (salt exists), treat this as unlock.
        const { salt: existingSalt, check: existingCheck } = await api.getEncryption(conversationId);
        if (existingSalt && existingCheck) {
          saltRef.current = existingSalt;
          checkRef.current = existingCheck;
          return unlockWith(passphrase, existingSalt, existingCheck);
        }
        const salt = randomSaltB64();
        const k = await deriveKey(passphrase, salt);
        const check = await makeCheck(k);
        await api.enableEncryption(conversationId, salt, check);
        saltRef.current = salt;
        checkRef.current = check;
        savePassphrase(conversationId, passphrase);
        setKey(k);
        setStatus('ready');
        return true;
      } catch (e: any) {
        setError(e?.message || 'Could not enable encryption.');
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId]
  );

  async function unlockWith(passphrase: string, salt: string, check: string): Promise<boolean> {
    const k = await deriveKey(passphrase, salt);
    if (!(await verifyCheck(k, check))) {
      setError("That doesn't match your partner's secret.");
      return false;
    }
    savePassphrase(conversationId, passphrase);
    setKey(k);
    setStatus('ready');
    setError(null);
    return true;
  }

  const unlock = useCallback(
    async (passphrase: string): Promise<boolean> => {
      setError(null);
      const salt = saltRef.current;
      const check = checkRef.current;
      if (!salt || !check) {
        setError('Encryption is not set up yet.');
        return false;
      }
      try {
        return await unlockWith(passphrase, salt, check);
      } catch (e: any) {
        setError(e?.message || 'Could not unlock.');
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId]
  );

  const lock = useCallback(() => {
    clearPassphrase(conversationId);
    setKey(null);
    setStatus('locked');
  }, [conversationId]);

  return { status, key, error, enable, unlock, lock, refresh: load };
}
