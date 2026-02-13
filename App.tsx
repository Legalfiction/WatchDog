import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Calendar, Wifi, Signal, 
  Dog, Activity, Moon, ShieldCheck
} from 'lucide-react';

// HARDCODED: We dwingen de app via de tunnel te praten.
const API_URL = 'https://barkr.nl';

const autoFormatPhone = (input: string) => {
  let p = input.replace(/\s/g, '').replace(/-/g, '').replace(/\./g, '');
  if (p.startsWith('06') && p.length === 10) return '+316' + p.substring(2);
  return p;
};

export default function App() {
  // We beginnen standaard op 'connected' zodat je DIRECT de hond ziet.
  // De status past zich vanzelf aan naar rood als het niet werkt.
  const [status, setStatus] = useState<'connected' | 'offline'>('connected'); 
  const [showSettings, setShowSettings] = useState(false);
  const [lastPing, setLastPing] = useState('--:--');

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('barkr_conf_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      myPhone: '', name: '', vacationMode: false, useCustomSchedule: false,
      activeDays: [0, 1, 2, 3, 4, 5, 6], startTime: '07:00', endTime: '08:30',
      contacts: [] as {name: string, phone: string}[], schedules: {} as any
    };
  });

  // Opslaan logic
  useEffect(() => {
    localStorage.setItem('barkr_conf_v3', JSON.stringify(settings));
    if (status === 'connected') {
        const timer = setTimeout(() => {
        fetch(`${API_URL}/save_settings`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(settings)
        }).catch(() => {}); // Stil falen is prima
        }, 1000);
        return () => clearTimeout(timer);
    }
  }, [settings, status]);

  // Verbinding checker
  const checkConnection = useCallback(async () => {
    try {
      // 1. Check status
      const res = await fetch(`${API_URL}/status`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        setStatus('connected');
        // 2. Stuur Ping
        await fetch(`${API_URL}/ping`, { 
            method: 'POST', headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(settings) 
        });
        setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
      } else {
        setStatus('offline');
      }
    } catch (e) {
      setStatus('offline');
    }
  }, [settings]);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  // Tekst helpers
  const getStatusText = () => {
    if (status === 'offline') return 'Geen verbinding';
    return settings.vacationMode ? 'Systeem in rust' : 'Barkr is waakzaam';
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      
      {/* HEADER */}
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg">
             <Dog size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black italic tracking-tighter text-slate-800">BARKR</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? (settings.vacationMode ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-red-500'}`} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${status === 'connected' ? (settings.vacationMode ? 'text-blue-600' : 'text-emerald-600') : 'text-red-500'}`}>
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
          <Settings size={20} className="text-slate-600"/>
        </button>
      </header>

      {/* DASHBOARD - NU ALTIJD ZICHTBAAR */}
      {!showSettings && (
        <main className="flex-1 p-6 flex flex-col items-center justify-start pt-12 space-y-8">
          
          <button 
            onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
            /* We disablen de knop NIET meer, zodat je altijd de hond ziet */
            className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center border-[8px] transition-all duration-500 shadow-xl active:scale-95 ${
              status === 'offline' ? 'bg-slate-100 border-slate-200 opacity-80' :
              settings.vacationMode 
                ? 'bg-slate-800 border-slate-600' 
                : 'bg-orange-600 border-orange-400'
            }`}
          >
            {/* Als Offline: Toon hond maar grijs */}
            {status === 'offline' ? (
               <>
                 <div className="relative">
                    <Dog size={100} className="text-slate-400" strokeWidth={2} />
                    <X size={32} className="text-red-400 absolute -top-2 -right-6" strokeWidth={3}/>
                 </div>
                <span className="text-xs font-black uppercase text-slate-400 tracking-widest mt-6">Geen Verbinding</span>
              </>
            ) : settings.vacationMode ? (
              <>
                <Moon size={80} className="text-blue-200 mb-2" strokeWidth={1.5} />
                <span className="text-sm font-black uppercase text-blue-200 tracking-widest mt-2">Systeem Uit</span>
              </>
            ) : (
              <>
                 <div className="relative">
                    <Dog size={100} className="text-white drop-shadow-md" strokeWidth={2} />
                    <Signal size={32} className="text-white absolute -top-2 -right-6 animate-pulse" strokeWidth={3}/>
                 </div>
                <span className="text-sm font-black uppercase text-white tracking-widest mt-6">Tik om te pauzeren</span>
              </>
            )}

            {/* Verbindings Label Onderaan */}
            <div className={`absolute -bottom-6 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-2 shadow-lg border ${
              status === 'connected' ? 'bg-white text-orange-600 border-orange-100' : 'bg-red-50 text-red-600 border-red-100'
            }`}>
               {status === 'connected' ? <Signal size={12}/> : <Wifi size={12}/>}
               {status === 'connected' ? 'Verbonden' : 'Offline'}
            </div>
          </button>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 w-full max-w-xs text-center shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center justify-center gap-1">
               <Activity size={12}/> Laatste Controle
             </p>
             <p className="text-4xl font-black text-slate-800 tabular-nums tracking-tight">{lastPing}</p>
          </div>
        </main>
      )}

      {/* SETUP */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto animate-in slide-in-from-bottom-5">
            <header className="px-6 py-4 bg-white border-b sticky top-0 z-10 flex justify-between items-center shadow-sm">
            <h2 className="text-xl font-black text-slate-800 uppercase italic">Barkr Setup</h2>
            <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20}/></button>
          </header>
          <div className="p-6 space-y-6 max-w-md mx-auto">
             <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Jouw Naam</label>
                    <input type="text" value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-white font-bold"/>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Jouw Nummer</label>
                    <input type="tel" value={settings.myPhone} onChange={e=>setSettings({...settings, myPhone:autoFormatPhone(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-white font-mono"/>
                </div>
                {/* Hier zouden de overige velden (Noodcontacten, Tijden etc.) moeten staan zoals in de eerdere versies */}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}