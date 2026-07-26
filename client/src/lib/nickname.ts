// A private, per-device nickname you give the other person. It only changes how
// their name shows on *your* device — nothing is sent to the server or to them.

const key = (userId: string) => `pronto_nick_${userId}`;

export function getNickname(userId?: string | null): string | null {
  if (!userId) return null;
  try {
    return localStorage.getItem(key(userId)) || null;
  } catch {
    return null;
  }
}

export function setNickname(userId: string, name: string): void {
  try {
    const v = name.trim();
    if (v) localStorage.setItem(key(userId), v);
    else localStorage.removeItem(key(userId));
  } catch {
    /* ignore */
  }
}
