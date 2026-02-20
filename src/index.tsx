import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// --- SERVICE WORKER REGISTRATIE ---
// Dit script zorgt ervoor dat de Barkr-app op de achtergrond kan blijven draaien
// en dat de browser de app als een betrouwbare applicatie herkent.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('✅ Barkr Service Worker succesvol geregistreerd op scope:', reg.scope);
      })
      .catch(err => {
        console.error('❌ Service Worker registratie mislukt:', err);
      });
  });
}
