import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Dog, Activity, ShieldCheck, Clock, Info, AlertTriangle
} from 'lucide-react';

const URL = 'https://barkr.nl';
const TOKEN = 'MOBILE_DEVICE_ALDO_2026';

export default function App() {
  const [status, setStatus] = useState('searching');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [lastPing, setLastPing] = useState('--:--');
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v15_data');
    return saved ? JSON.parse(saved) : { 
      name: '', vacationMode: false, startTime: '07:00', endTime: '08:30', contacts: [] 
    };
  });

  // NATIVE HEARTBEAT ENGINE
  useEffect(() => {
    if (settings.vacationMode || !settings.name) return;

    const sendHeartbeat = () => {
      // De token zorgt voor uitsluiting van andere browsers/apparaten [cite: 2026-02-17]
      fetch(`${URL}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: settings.name, token: TOKEN }),
        mode: 'cors',
        keepalive: true
      })
      .then(res => {
        if (res.ok) {
          setStatus('connected');
          setLastPing(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      })
      .catch(() => setStatus('offline'));
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 10000); // 10s interval voor stabiliteit
    return () => clearInterval(interval);
  }, [settings.name, settings.vacationMode]);

  const handleSave = () => {
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
    fetch(`${URL}/save_settings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings, token: TOKEN })
    }).catch(() => {});
    setShowSettings(false);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg shadow-sm"><Dog size={20} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-black italic tracking-tighter text-slate-800 uppercase">Barkr</h1>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? (settings.vacationMode ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-red-500'}`} />
              <span className={status === 'connected' ? (settings.vacationMode ? 'text-blue-600' : 'text-emerald-600') : 'text-red-500'}>
                {status === 'offline' ? 'Geen verbinding' : settings.vacationMode ? 'In Rust' : 'Waakzaam'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="p-2.5 bg-slate-100 rounded-xl"><Info size={20} className="text-slate-600"/></button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl"><Settings size={20} className="text-slate-600"/></button>
        </div>
      </header>

      {!showSettings && !showManual && (
        <main className="flex-1 p-6 flex flex-col items-center justify-start pt-16 space-y-12">
          <button onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
            className={`w-72 h-72 rounded-full border-[10px] shadow-2xl transition-all duration-500 ${settings.vacationMode ? 'bg-slate-900 border-slate-700' : 'bg-orange-600 border-orange-700'}`}>
            <img src="/logo.png" className={`w-full h-full object-cover ${settings.vacationMode ? 'opacity-20 grayscale' : ''}`} alt="Barkr" />
          </button>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 w-full max-w-xs text-center shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest"><Activity size={12} className="inline mr-1"/> Mobiele Hartslag</p>
             <p className="text-4xl font-black text-slate-800 tabular-nums">{lastPing}</p>
          </div>
        </main>
      )}

      {/* SETUP SECTIE [cite: 2026-02-17] */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6">
          <header className="flex justify-between items-center mb-4"><h2 className="text-xl font-black uppercase italic tracking-tighter">Setup</h2><button onClick={() => setShowSettings(false)} className="p-2 bg-white rounded-full"><X size={20}/></button></header>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Naam Gebruiker</label>
            <input value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} placeholder="Naam" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none"/>
            <div className="grid grid-cols-2 gap-4 pt-2">
                <div><label className="text-[10px] font-bold text-slate-400 uppercase text-center block">Start</label><input type="time" value={settings.startTime} onChange={e=>setSettings({...settings, startTime:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700 text-center"/></div>
                <div><label className="text-[10px] font-bold text-red-400 uppercase text-center block">Deadline</label><input type="time" value={settings.endTime} onChange={e=>setSettings({...settings, endTime:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-red-600 text-center"/></div>
            </div>
          </div>
          <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white font-black uppercase rounded-[28px] tracking-[0.2em] shadow-xl">Configuratie Opslaan</button>
        </div>
      )}
      
      {/* HANDLEIDING SECTIE [cite: 2026-02-17] */}
      {showManual && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-8 animate-in fade-in duration-300">
          <header className="flex justify-between items-center"><h2 className="text-xl font-black uppercase italic tracking-tight">Handleiding</h2><button onClick={() => setShowManual(false)} className="p-2 bg-white rounded-full"><X size={20}/></button></header>
          <section className="bg-orange-50 p-6 rounded-3xl border border-orange-200 space-y-3"><h4 className="font-bold text-orange-800 flex items-center gap-2 uppercase text-xs tracking-widest"><Clock size={18}/> Welzijnsbewaking</h4><p className="text-sm text-orange-900 leading-relaxed font-medium">Indien Sven's toestel gedurende het venster geen verbinding maakt, wordt er na de deadline automatisch gealarmeerd [cite: 2025-12-02, 2025-12-05].</p></section>
          <button onClick={() => setShowManual(false)} className="w-full py-4 bg-slate-800 text-white font-black uppercase rounded-2xl tracking-widest">Begrepen</button>
        </div>
      )}
    </div>
  );
}
