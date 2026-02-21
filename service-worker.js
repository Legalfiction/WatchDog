// public/service-worker.js

// Zorgt ervoor dat een nieuwe versie van de app DIRECT wordt geïnstalleerd (helpt bij updates)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Neemt direct de controle over, zodat de gebruiker niet eerst hoeft te refreshen
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// LET OP: De 'setInterval' ping is hier verwijderd. 
// De betrouwbare ping-logica zit nu veilig verankerd in App.tsx, 
// die netjes stopt zodra het telefoonscherm op zwart gaat.
