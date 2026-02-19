// service-worker.js
const VERSION = "v12-background";
const PING_URL = "https://barkr.nl/ping";

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// De onzichtbare loop
setInterval(() => {
  fetch(PING_URL, { 
    method: 'POST', 
    mode: 'no-cors',
    cache: 'no-store'
  }).catch(() => {});
}, 10000); // Elke 10 seconden, zelfs in stand-by
