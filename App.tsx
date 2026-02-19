import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Plus, Trash2, X, Dog, Activity, ShieldCheck, Clock } from 'lucide-react';

const URL = 'https://barkr.nl';

export default function App() {
  const [status, setStatus] = useState<'searching' | 'connected' | 'offline'>('searching');
  const [lastPing, setLastPing] = useState('--:--');
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    return saved ? JSON.parse(saved) : { name: 'Aldo', vacationMode: false, startTime: '07:00', endTime: '08:30', contacts: [] };
  });

  // --- DE OPLOSSING: KEEP-ALIVE MOTOR ---
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {}
    };

    const sendHeartbeat = () => {
      // We sturen de ping ALTIJD, ook als document.hidden true is.
      fetch(`${URL}/ping`, { method: 'POST', mode: 'no-cors', keepalive: true })
        .then(() => setLastPing(new Date().toLocaleTimeString()))
        .catch(() => setStatus('offline'));
    };

    requestWakeLock();
    const interval = setInterval(sendHeartbeat, 10000); // Elke 10 seconden

    // Heractiveer wake lock als de gebruiker terugkeert naar de app
    document.addEventListener('visibilitychange', () => {
      if (wakeLock !== null && document.visibilityState === 'visible') requestWakeLock();
    });

    return () => {
      clearInterval(interval);
      if (wakeLock) wakeLock.release();
    };
  }, []);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className="px-6 py-4 bg-white border-b flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg"><Dog size={20} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-black italic tracking-tighter text-slate-800 uppercase">Barkr</h1>
            <div className={`text-[10px] font-bold uppercase ${status === 'connected' ? 'text-emerald-600' : 'text-red-500'}`}>
               {status === 'connected' ? 'Waakzaam (Achtergrond Actief)' : 'Zoeken...'}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col items-center justify-center space-y-12">
        <button className="w-64 h-64 rounded-full bg-orange-600 border-[10px] border-orange-700 shadow-2xl flex items-center justify-center">
          <img src="/logo.png" className="w-full h-full object-cover scale-[1.02] drop-shadow-xl" alt="Logo" />
        </button>

        <div className="bg-white p-6 rounded-2xl border w-full max-w-xs text-center shadow-sm">
           <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest"><Activity size={12} className="inline mr-1"/> Systeem Hartslag</p>
           <p className="text-4xl font-black text-slate-800 tabular-nums">{lastPing}</p>
        </div>
      </main>
    </div>
  );
}
