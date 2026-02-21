// public/service-worker.js

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Zodra de nieuwe versie activeert, vernietigt hij álle oude vastgelopen caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return clients.claim();
    })
  );
});
