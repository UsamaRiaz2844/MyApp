// ============================================================================
// Client-side end-to-end encryption for Pronto.
//
// Model: a conversation has a shared secret passphrase that BOTH people type in
// once per device. A key is derived from it with PBKDF2 and never leaves the
// browser; Supabase only ever stores ciphertext (for text, and for the bytes of
// images / voice notes). The passphrase is stored locally per device so the
// chat stays unlocked across reloads; it is never sent to the server.
//
// Old plaintext messages remain readable — encrypted payloads are tagged with
// the `e1:` prefix (text) or the message's is_encrypted flag (media), so the
// UI can tell the two apart and only decrypt what it must.
// ============================================================================

const te = new TextEncoder();
const td = new TextDecoder();

const TEXT_PREFIX = 'e1:'; // marks an encrypted text payload
const CHECK_TOKEN = 'pronto-e2ee-ok'; // used to verify a passphrase matches
const PBKDF2_ITERS = 200_000;

// ---- base64 helpers --------------------------------------------------------
function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToBytes(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---- key derivation --------------------------------------------------------
export function randomSaltB64(): string {
  return bytesToB64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function deriveKey(passphrase: string, saltB64: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', te.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64ToBytes(saltB64), iterations: PBKDF2_ITERS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ---- text ------------------------------------------------------------------
export function isEncryptedText(s: string | null | undefined): boolean {
  return typeof s === 'string' && s.startsWith(TEXT_PREFIX);
}

export async function encryptText(key: CryptoKey, plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(plain)));
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0);
  combined.set(ct, iv.length);
  return TEXT_PREFIX + bytesToB64(combined);
}

export async function decryptText(key: CryptoKey, payload: string): Promise<string> {
  const data = b64ToBytes(payload.slice(TEXT_PREFIX.length));
  const iv = data.slice(0, 12);
  const ct = data.slice(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return td.decode(pt);
}

// ---- files (image / voice) -------------------------------------------------
// The original MIME type is packed inside the encrypted payload so it stays
// private too and no extra column is needed:  iv(12) || AES-GCM( mimeLen(2) || mime || bytes ).
export async function encryptFile(key: CryptoKey, blob: Blob): Promise<Blob> {
  const mime = te.encode(blob.type || 'application/octet-stream');
  const fileBytes = new Uint8Array(await blob.arrayBuffer());
  const plain = new Uint8Array(2 + mime.length + fileBytes.length);
  plain[0] = (mime.length >> 8) & 0xff;
  plain[1] = mime.length & 0xff;
  plain.set(mime, 2);
  plain.set(fileBytes, 2 + mime.length);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return new Blob([out], { type: 'application/octet-stream' });
}

export async function decryptFile(key: CryptoKey, cipherBlob: Blob): Promise<{ url: string; mime: string }> {
  const data = new Uint8Array(await cipherBlob.arrayBuffer());
  const iv = data.slice(0, 12);
  const ct = data.slice(12);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct));
  const mimeLen = (pt[0] << 8) | pt[1];
  const mime = td.decode(pt.slice(2, 2 + mimeLen));
  const bytes = pt.slice(2 + mimeLen);
  const blob = new Blob([bytes], { type: mime });
  return { url: URL.createObjectURL(blob), mime };
}

// ---- passphrase verifier ---------------------------------------------------
// A token encrypted with the derived key, stored on the conversation, so a
// second device can confirm it typed the SAME passphrase the partner set up.
export function makeCheck(key: CryptoKey): Promise<string> {
  return encryptText(key, CHECK_TOKEN);
}
export async function verifyCheck(key: CryptoKey, check: string): Promise<boolean> {
  try {
    return (await decryptText(key, check)) === CHECK_TOKEN;
  } catch {
    return false;
  }
}

// ---- late-reply greet/bye detection ----------------------------------------
// Mirrors the SQL regexes in schema.sql. The server can't read encrypted text,
// so the client classifies hi/bye and sends the result as enc_marker; the DB
// trigger uses that to keep the late-reply timer working under encryption.
const GREET_RE = /^(hi+|hello+|hey+|yo|hiya|sup)[!.\s]*$/i;
const BYE_RE = /^(bye+|goodbye|good\s*bye|bbye|cya|see\s*ya|farewell|gn|good\s*night)[!.\s]*$/i;

export function greetMarker(text: string): 'greet' | 'bye' | null {
  const t = text.trim();
  if (GREET_RE.test(t)) return 'greet';
  if (BYE_RE.test(t)) return 'bye';
  return null;
}

// ---- local passphrase storage (per conversation, per device) ---------------
const lsKey = (conversationId: string) => `pronto:e2ee:${conversationId}`;
export function loadPassphrase(conversationId: string): string | null {
  try {
    return localStorage.getItem(lsKey(conversationId));
  } catch {
    return null;
  }
}
export function savePassphrase(conversationId: string, passphrase: string): void {
  try {
    localStorage.setItem(lsKey(conversationId), passphrase);
  } catch {
    /* ignore */
  }
}
export function clearPassphrase(conversationId: string): void {
  try {
    localStorage.removeItem(lsKey(conversationId));
  } catch {
    /* ignore */
  }
}
