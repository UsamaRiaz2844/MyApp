// Imported by the generated service worker (see vite.config workbox.importScripts).
// Focuses an existing app window when a notification is tapped, or opens one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/MyApp/');
    })()
  );
});
