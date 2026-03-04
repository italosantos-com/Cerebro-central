/// <reference lib="webworker" />

// Ensure TypeScript treats this file as a module.
export {};

declare const self: ServiceWorkerGlobalScope;

type PrecacheEntry = string;

const CACHE_NAME = 'italosantos-cache-v2';
const PRECACHE_URLS: PrecacheEntry[] = [
  '/',
  '/offline.html',
  '/logo.png',
  '/icon.png'
];

const ASSET_REGEX = /\/\_next\/static\//;
const STATIC_EXT_REGEX = /\.(?:css|js|png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|eot)$/i;

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return undefined;
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const req = event.request;
  if (req.method !== 'GET') {
    return;
  }

  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) {
            return offlinePage;
          }
          throw new Error('Offline page missing from cache');
        }
      })()
    );
    return;
  }

  if (ASSET_REGEX.test(url.pathname) || STATIC_EXT_REGEX.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) {
          return cached;
        }

        const response = await fetch(req);
        const clone = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => cache.put(req, clone))
          .catch(() => {
            // Ignore put errors (e.g., opaque responses)
          });

        return response;
      })()
    );
  }
});
