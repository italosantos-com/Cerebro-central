// Service Worker para Next.js: cache de assets e fallback offline
const CACHE_NAME = 'italosantos-cache-v3';
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/logo.png',
  '/icon.png'
];

// Regex para assets do Next e estáticos comuns
const ASSET_REGEX = /\/_next\/static\//;
const STATIC_EXT_REGEX = /\.(?:css|js|png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|eot)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  const data = (() => {
    try {
      return event?.data?.json?.() || {};
    } catch {
      return { title: 'Notificação', body: event?.data?.text?.() || '' };
    }
  })();

  const title = data.title || 'Notificação';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon.png',
    badge: data.badge || '/icon.png',
    tag: data.tag || 'push-message'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('sync', (event) => {
  if (event?.tag) {
    event.waitUntil(Promise.resolve());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event?.tag) {
    event.waitUntil(Promise.resolve());
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Navegação: network-first com fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Assets: cache-first
  if (ASSET_REGEX.test(url.pathname) || STATIC_EXT_REGEX.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            try {
              cache.put(req, resClone);
            } catch { }
          });
          return res;
        });
      })
    );
  }
});