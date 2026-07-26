// A user is considered "online" only if they are flagged online AND their
// last_seen heartbeat is recent. This self-heals the old "stuck online" bug:
// if an app is killed without a clean disconnect, its is_online flag may stay
// true, but the heartbeat stops, so last_seen goes stale and we show offline.
export const ONLINE_WINDOW_MS = 45_000;

export function isOnlineFresh(isOnline: boolean | undefined | null, lastSeen: string | null | undefined): boolean {
  if (!isOnline || !lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_MS;
}
