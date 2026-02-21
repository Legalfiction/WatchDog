import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // HIER ZAT DE FOUT: Nu verwijzen we naar de juiste naam
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('SW Registered'))
      .catch(err => console.log('SW Failed', err));
  });
}
