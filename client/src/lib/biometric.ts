// Convenience biometric gate for the app lock, via WebAuthn's platform
// authenticator (fingerprint / face). There is no server, so we don't verify
// the signature — a successful platform ceremony is the unlock gate. The PIN
// remains as the fallback/recovery method.

const CRED_KEY = 'pronto_bio_cred';

export function biometricSupported(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials?.create;
}

export function biometricEnabled(): boolean {
  try {
    return !!localStorage.getItem(CRED_KEY);
  } catch {
    return false;
  }
}

function rand(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n));
}
function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function registerBiometric(name = 'Pronto'): Promise<boolean> {
  if (!biometricSupported()) return false;
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: rand(32),
        rp: { name: 'Pronto', id: location.hostname },
        user: { id: rand(16), name, displayName: name },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;
    if (!cred) return false;
    localStorage.setItem(CRED_KEY, toB64(cred.rawId));
    return true;
  } catch {
    return false;
  }
}

export function forgetBiometric(): void {
  try {
    localStorage.removeItem(CRED_KEY);
  } catch {
    /* ignore */
  }
}

export async function authenticateBiometric(): Promise<boolean> {
  if (!biometricSupported()) return false;
  let idB64: string | null;
  try {
    idB64 = localStorage.getItem(CRED_KEY);
  } catch {
    idB64 = null;
  }
  if (!idB64) return false;
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: rand(32),
        allowCredentials: [{ id: fromB64(idB64), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}
