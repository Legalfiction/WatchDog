// public/service-worker.js
const PING_URL = "https://barkr.nl/ping";

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Stuur elke 15 seconden een signaal, ongeacht of de app open is.
setInterval(() => {
  fetch(PING_URL, { 
    method: 'POST', 
    mode: 'no-cors',
    keepalive: true 
  }).catch(() => {});
}, 15000);
