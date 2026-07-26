// Lightweight, content-free message notifications.
//
// No backend: these fire from the app's own realtime subscription, so they only
// arrive while the app is running (foreground, or briefly in the background
// before the OS freezes it). On Android/Chrome, notifications must come from the
// service worker registration — `new Notification()` throws there — so we always
// go through registration.showNotification when a SW is available.
//
// The notification body is intentionally generic (no sender, no message text).

// The conversation the user is currently looking at (set by ChatRoom). Used to
// avoid notifying for the chat that's already on screen and focused.
export const activeChat: { id: string | null } = { id: null };

export function notifySupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export function notifyPermission(): NotificationPermission {
  return notifySupported() ? Notification.permission : 'denied';
}

// Ask for permission (best from a user gesture). Safe to call repeatedly.
export async function ensureNotifyPermission(): Promise<NotificationPermission> {
  if (!notifySupported()) return 'denied';
  if (Notification.permission === 'default') {
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }
  return Notification.permission;
}

let lastNotify = 0;

// Show a casual "new message" notification (no content) and buzz the device.
export async function showMessageNotification(): Promise<void> {
  if (!notifySupported() || Notification.permission !== 'granted') return;

  // Collapse bursts: at most one banner every ~1.5s (the tag also replaces).
  const now = Date.now();
  const buzz = () => navigator.vibrate?.([60, 40, 60]);
  if (now - lastNotify < 1500) {
    buzz();
    return;
  }
  lastNotify = now;

  const icon = `${import.meta.env.BASE_URL}icons/icon-192.png`;
  const options: NotificationOptions = {
    body: 'You have a new message',
    tag: 'pronto-message',
    icon,
    badge: icon,
    // renotify isn't in the TS lib types but is honoured by browsers.
    ...( { renotify: true } as object ),
  };

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) await reg.showNotification('Pronto', options);
  } catch {
    /* ignore — notifications are best-effort */
  }
  buzz();
}
