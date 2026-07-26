import { useEffect, useState } from 'react';
import VoiceNote from './VoiceNote';
import { decryptFile } from '../lib/crypto';

interface Props {
  type: 'image' | 'audio';
  url: string;
  durationMs: number | null;
  encrypted: boolean;
  cryptoKey: CryptoKey | null;
  mine: boolean;
  blurred: boolean;
}

// Renders an image or voice note. For encrypted messages it fetches the
// ciphertext from Storage and decrypts it in the browser to a local object URL;
// plaintext (pre-encryption) messages render straight from their URL.
export default function MediaAttachment({ type, url, durationMs, encrypted, cryptoKey, mine, blurred }: Props) {
  const [resolved, setResolved] = useState<string | null>(encrypted ? null : url);
  const [state, setState] = useState<'ok' | 'loading' | 'locked' | 'error'>(encrypted ? 'loading' : 'ok');

  useEffect(() => {
    if (!encrypted) {
      setResolved(url);
      setState('ok');
      return;
    }
    if (!cryptoKey) {
      setResolved(null);
      setState('locked');
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const { url: decUrl } = await decryptFile(cryptoKey, blob);
        if (cancelled) {
          URL.revokeObjectURL(decUrl);
          return;
        }
        objectUrl = decUrl;
        setResolved(decUrl);
        setState('ok');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, encrypted, cryptoKey]);

  if (state === 'locked' || state === 'error') {
    const label = state === 'locked' ? '🔒 Encrypted — unlock to view' : '⚠️ Could not decrypt';
    return (
      <div
        className={`flex items-center gap-2 rounded-xl px-3 py-4 text-xs ${
          mine ? 'bg-white/15 text-white/90' : 'bg-black/5 text-slate-500 dark:bg-white/5 dark:text-slate-300'
        }`}
      >
        <span>{type === 'audio' ? '🎤' : '🖼️'}</span>
        <span>{label}</span>
      </div>
    );
  }

  if (state === 'loading' || !resolved) {
    return (
      <div
        className={`flex items-center gap-2 rounded-xl px-3 py-4 text-xs ${
          mine ? 'bg-white/15 text-white/90' : 'bg-black/5 text-slate-500 dark:bg-white/5 dark:text-slate-300'
        }`}
      >
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span>Decrypting…</span>
      </div>
    );
  }

  if (type === 'image') {
    return (
      <img
        src={resolved}
        alt="shared"
        loading="lazy"
        onClick={(e) => {
          if (blurred) return;
          e.stopPropagation();
          window.open(resolved, '_blank', 'noopener');
        }}
        className={`block max-h-72 w-full max-w-[260px] rounded-xl object-cover ${blurred ? 'whisper-hidden' : 'whisper-shown'}`}
      />
    );
  }

  return (
    <div className={blurred ? 'whisper-hidden' : 'whisper-shown'}>
      <VoiceNote src={resolved} durationMs={durationMs} mine={mine} />
    </div>
  );
}
