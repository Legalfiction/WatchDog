const CACHE_NAME = 'barkr-v16-cache';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  // Voeg hier andere statische assets toe zoals icons
];

// Installatie: Bestanden opslaan in de cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activatie: Oude caches opruimen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Serveer vanuit cache, maar update op de achtergrond (Stale-while-revalidate)
self.addEventListener('fetch', (event) => {
  // Pings en save_settings NOOIT cachen, deze moeten altijd live gaan
  if (event.request.url.includes('/ping') || event.request.url.includes('/save_settings')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchRes) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, fetchRes.clone());
          return fetchRes;
        });
      });
    })
  );
});

// Push notificatie logica (voor toekomstige uitbreiding)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Barkr Update', body: 'Er is een statuswijziging.' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo.png',
      badge: '/logo.png'
    })
  );
});
