import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Calendar, Wifi, Signal, 
  Activity, ShieldCheck, Dog, Clock, Info, ExternalLink, AlertTriangle
} from 'lucide-react';

const ENDPOINTS = ['https://barkr.nl', 'http://192.168.1.38:5000'];
const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

const autoFormatPhone = (input: string) => {
  let p = input.replace(/\s/g, '').replace(/-/g, '').replace(/\./g, '');
  if (p.startsWith('06') && p.length === 10) return '+316' + p.substring(2);
  return p;
};

export default function App() {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'searching' | 'connected' | 'offline'>('searching');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [lastPing, setLastPing] = useState('--:--');
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    return saved ? JSON.parse(saved) : {
      myPhone: '', name: 'Aldo', vacationMode: false, useCustomSchedule: false,
      activeDays: [0, 1, 2, 3, 4, 5, 6], startTime: '07:00', endTime: '08:30',
      contacts: [], schedules: {}
    };
  });

  // --- REGISTRATIE VAN DE ONZICHTBARE MOTOR ---
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(() => console.log("Background Monitor Actief"))
        .catch(err => console.error("Monitor Fout:", err));
    }
  }, []);

  // 1. Verbinding zoeken
  const findConnection = useCallback(async () => {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          setActiveUrl(url);
          setStatus('connected');
          return; 
        }
      } catch (e) {}
    }
    setStatus('offline');
  }, []);

  useEffect(() => {
    findConnection();
    const interval = setInterval(findConnection, 15000);
    return () => clearInterval(interval);
  }, [findConnection]);

  // 2. Dashboard Update Loop (Alleen voor visuele weergave)
  useEffect(() => {
    if (status !== 'connected' || !activeUrl) return;
    const interval = setInterval(() => {
      setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
    }, 5000);
    return () => clearInterval(interval);
  }, [status, activeUrl]);

  // 3. Opslaan naar Pi
  useEffect(() => {
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
    if (!activeUrl) return;
    const timer = setTimeout(() => {
      fetch(`${activeUrl}/save_settings`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(settings)
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [settings, activeUrl]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <style>{`
        @keyframes bounce-zz { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-15px); opacity: 1; } }
        .animate-zz { animation: bounce-zz 2.5s infinite ease-in-out; }
      `}</style>
      
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg shadow-sm"><Dog size={20} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-black italic tracking-tighter text-slate-800 uppercase">BARKR</h1>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? (settings.vacationMode ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-red-500'}`} />
              <span className={status === 'connected' ? (settings.vacationMode ? 'text-blue-600' : 'text-emerald-600') : 'text-red-500'}>
                {status === 'offline' ? 'Geen verbinding' : status === 'searching' ? 'Zoeken...' : settings.vacationMode ? 'Systeem in rust' : 'Barkr is waakzaam'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><Info size={20} className="text-slate-600"/></button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><Settings size={20} className="text-slate-600"/></button>
        </div>
      </header>

      {!showSettings && !showManual && (
        <main className="flex-1 p-6 flex flex-col items-center justify-start pt-16 space-y-12">
          <div className="flex flex-col items-center gap-8 w-full">
            <button 
              onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
              disabled={status !== 'connected'}
              className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl overflow-hidden border-[10px] ${
                status !== 'connected' ? 'bg-slate-100 border-slate-200 opacity-60' : 
                settings.vacationMode ? 'bg-slate-900 border-slate-700' : 'bg-orange-600 border-orange-700'
              }`}
            >
              {status !== 'connected' ? <Wifi size={80} className="text-slate-400 animate-pulse"/> : 
               settings.vacationMode ? (
                <div className="flex flex-col items-center justify-center relative w-full h-full">
                  <div className="absolute top-16 right-20 flex font-black text-blue-300 pointer-events-none z-10">
                    <span className="text-3xl animate-zz">Z</span><span className="text-2xl animate-zz ml-1">z</span><span className="text-xl animate-zz ml-1">z</span>
                  </div>
                  <img src="/logo.png" className="w-full h-full object-cover opacity-40 grayscale" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full relative">
                   <img src="/logo.png" className="w-full h-full object-cover drop-shadow-xl" />
                   <div className="absolute bottom-6 inset-x-0 text-center"><span className="text-[11px] font-black uppercase text-white tracking-widest">Tik om te slapen</span></div>
                </div>
              )}
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 w-full max-w-xs text-center shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest"><Activity size={12} className="inline mr-1"/> Laatste Controle</p>
             <p className="text-4xl font-black text-slate-800 tabular-nums">{lastPing}</p>
          </div>
        </main>
      )}
      
      {/* Rest van de modals (Manual & Settings) blijven exact gelijk aan uw code... */}
    </div>
  );
}
