// NEF123123 Service Worker Shell (Safe Phase 1)
// Note: Does NOT auto-subscribe any visitor while LIVE_SUBSCRIBER_SYSTEM_ENABLED is false.
// Ready to handle breaking-news Web Push notifications once durable subscriber storage is verified.

const OFFICIAL_ORIGIN = 'https://www.nef123123.co.za';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function sanitizeNotificationUrl(rawUrl) {
  try {
    if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return `${OFFICIAL_ORIGIN}/`;
    }
    const parsed = new URL(rawUrl, self.location.origin);
    if (
      parsed.protocol === 'https:' &&
      (parsed.origin === OFFICIAL_ORIGIN || parsed.origin === self.location.origin)
    ) {
      return parsed.toString();
    }
    if (parsed.origin === self.location.origin && parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    // Fallback to safe homepage
  }
  return `${OFFICIAL_ORIGIN}/`;
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'NEF123123 Breaking News', body: event.data.text() };
  }

  const title =
    typeof payload.title === 'string' && payload.title.trim()
      ? payload.title.trim()
      : 'NEF123123 — Breaking News';
  const body =
    typeof payload.body === 'string' && payload.body.trim()
      ? payload.body.trim()
      : 'Read the latest report on NEF123123.';
  const targetUrl = sanitizeNotificationUrl(payload.url);
  const tag =
    typeof payload.tag === 'string' && payload.tag.trim()
      ? payload.tag.trim()
      : 'nef123123-breaking-news';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.png',
      badge: '/favicon-96x96.png',
      tag,
      renotify: false,
      data: { url: targetUrl },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = sanitizeNotificationUrl(event.notification?.data?.url);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
