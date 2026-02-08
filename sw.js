
const CACHE_NAME = 'safeguard-guardian-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through voor API calls naar de Pi
  if (event.request.url.includes('/ping') || event.request.url.includes('/status')) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
