
const CACHE_NAME = 'safeguard-v4';

// Forceer activatie
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 1. PERIODIC SYNC (De 'Zelf-Wekker')
// Dit draait op de achtergrond, getriggerd door Android/iOS zelf
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'safeguard-ping') {
    event.waitUntil(executeSilentPing());
  }
});

// 2. SILENT PUSH (De 'Server-Wekker')
// Jouw Pi stuurt een push, de telefoon voert direct de ping uit
self.addEventListener('push', (event) => {
  event.waitUntil(executeSilentPing());
});

async function executeSilentPing() {
  // We halen de instellingen op uit de cache of IndexedDB
  // In een echte scenario zouden we hier de URL van de Pi aanroepen
  console.log('[SafeGuard SW] Uitvoeren van achtergrond-ping...');
  
  // We proberen de laatste opgeslagen webhook URL te vinden
  // Voor nu simuleren we de fetch naar de Pi
  try {
    // Hier zou de fetch naar ${settings.webhookUrl}/ping komen
    // Omdat SW geen toegang heeft tot localStorage, gebruiken we een fallback of cache
    return true;
  } catch (err) {
    console.error('SW Ping gefaald', err);
  }
}
