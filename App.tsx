import React, { useState, useEffect, useCallback } from 'react';
import { Settings, X, Signal, Dog, Activity, Moon } from 'lucide-react';

const API_URL = 'https://barkr.nl';

export default function App() {
  const [status, setStatus] = useState<'connected' | 'offline'>('offline'); 
  const [showSettings, setShowSettings] = useState(false);
  const [lastPing, setLastPing] = useState('--:--');
  const [settings, setSettings] = useState({
    myPhone: '', name: '', vacationMode: false, contacts: []
  });

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/status`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        setStatus('connected');
        setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
      } else {
        setStatus('offline');
      }
    } catch (e) {
      setStatus('offline');
    }
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <header className="px-6 py-4 bg-white border-b flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg"><Dog size={20} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-black italic text-slate-800">BARKR</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {status === 'connected' ? 'Systeem Actief' : 'Geen Verbinding'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl"><Settings size={20}/></button>
      </header>

      <main className="flex-1 p-6 flex flex-col items-center justify-center space-y-8">
        <button 
          onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
          className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center border-[8px] transition-all duration-500 shadow-xl ${
            status === 'offline' ? 'bg-slate-200 border-slate-300' :
            settings.vacationMode ? 'bg-slate-800 border-slate-600' : 'bg-orange-600 border-orange-400'
          }`}
        >
          {status === 'offline' ? (
            <div className="relative"><Dog size={100} className="text-slate-400" /><X size={40} className="text-red-500 absolute -top-2 -right-6"/></div>
          ) : settings.vacationMode ? (
            <Moon size={80} className="text-blue-200" />
          ) : (
            <div className="relative"><Dog size={100} className="text-white" /><Signal size={32} className="text-white absolute -top-2 -right-6 animate-pulse" /></div>
          )}
        </button>

        <div className="bg-white p-6 rounded-2xl border w-full max-w-xs text-center shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Laatste Controle</p>
          <p className="text-4xl font-black text-slate-800">{lastPing}</p>
        </div>
      </main>
    </div>
  );
}