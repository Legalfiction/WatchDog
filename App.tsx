import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Activity, ShieldCheck, Dog, Clock, Info, ExternalLink, AlertTriangle
} from 'lucide-react';

const URL = 'https://barkr.nl';
const APP_SECRET = 'BARKR_SECURE_V1';

export default function App() {
  const [status, setStatus] = useState('searching');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [lastPing, setLastPing] = useState('--:--');
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    return saved ? JSON.parse(saved) : {
      name: '', vacationMode: false, startTime: '07:00', endTime: '08:30', contacts: []
    };
  });

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch(`${URL}/status`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        setStatus('connected');
        return; 
      }
    } catch (e) {}
    setStatus('offline');
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  // --- HARTSLAG & WAKE LOCK (Voorkomt dat het scherm uitgaat) ---
  useEffect(() => {
    if (status !== 'connected' || settings.vacationMode) return;

    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {}
    };
    requestWakeLock();

    const sendPing = () => {
      fetch(`${URL}/ping`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: APP_SECRET })
      })
      .then(res => {
        if(res.ok) setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
      })
      .catch(() => {});
    };

    sendPing();
    const pingInterval = setInterval(sendPing, 5000); 

    // Herstel de wakelock als we terugkomen in de app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(pingInterval);
      if (wakeLock) wakeLock.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, settings.vacationMode]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg shadow-sm"><Dog size={20} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-black italic tracking-tighter text-slate-800">BARKR</h1>
            <div className={`text-[10px] font-bold uppercase ${status === 'connected' ? 'text-emerald-600' : 'text-red-500'}`}>
              {status === 'offline' ? 'Geen verbinding' : status === 'searching' ? 'Zoeken...' : settings.vacationMode ? 'Systeem in rust' : 'Barkr is waakzaam'}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="p-2.5 bg-slate-100 rounded-xl"><Info size={20}/></button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl"><Settings size={20}/></button>
        </div>
      </header>

      {!showSettings && !showManual && (
        <main className="flex-1 p-6 flex flex-col items-center justify-start pt-16 space-y-12">
          <button onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})} className={`w-72 h-72 rounded-full border-[10px] transition-all duration-500 shadow-2xl ${settings.vacationMode ? 'bg-slate-900 border-slate-700' : 'bg-orange-600 border-orange-700'}`}>
            <img src="/logo.png" className={`w-full h-full object-cover scale-[1.02] ${settings.vacationMode ? 'opacity-40 grayscale' : ''}`} alt="Barkr Logo" />
          </button>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 w-full max-w-xs text-center shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest"><Activity size={12} className="inline mr-1"/> Laatste Controle</p>
             <p className="text-4xl font-black text-slate-800 tabular-nums">{lastPing}</p>
          </div>
        </main>
      )}

      {showManual && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-8 pb-20">
          <header className="flex justify-between items-center mb-6"><h2 className="text-xl font-black uppercase italic tracking-tight">Handleiding</h2><button onClick={() => setShowManual(false)} className="p-2 bg-white rounded-full"><X size={20}/></button></header>
          <section className="bg-orange-50 p-6 rounded-3xl border border-orange-200"><p className="text-sm text-orange-900 font-medium">De app moet geopend blijven op het scherm om verbinding te houden met de server. Het scherm zal automatisch aan blijven.</p></section>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20">
          <header className="flex justify-between items-center mb-4"><h2 className="text-xl font-black uppercase italic tracking-tighter">Setup</h2><button onClick={() => setShowSettings(false)} className="p-2 bg-white rounded-full"><X size={20}/></button></header>
          <div className="bg-white p-5 rounded-2xl border space-y-4">
            <input value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} placeholder="Naam" className="w-full bg-slate-50 border rounded-xl p-3 font-bold"/>
          </div>
        </div>
      )}
    </div>
  );
}
