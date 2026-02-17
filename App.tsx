import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Plus, Trash2, X, Calendar, Wifi, Signal, Activity, ShieldCheck, Dog, Clock, Info, ExternalLink, Mail, AlertTriangle } from 'lucide-react';

const ENDPOINTS = ['http://192.168.1.38:5000', 'https://barkr.nl'];
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
      myPhone: '', name: '', vacationMode: false, useCustomSchedule: false, 
      activeDays: [0, 1, 2, 3, 4, 5, 6], startTime: '', endTime: '', 
      contacts: [], schedules: {} 
    };
  });

  const findConnection = useCallback(async () => {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) { setActiveUrl(url); setStatus('connected'); setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})); return; }
      } catch (e) {}
    }
    setStatus('offline');
  }, []);

  useEffect(() => {
    findConnection();
    const interval = setInterval(findConnection, 5000);
    return () => clearInterval(interval);
  }, [findConnection]);

  // HEARTBEAT LOOP (10s)
  useEffect(() => {
    if (status !== 'connected' || !activeUrl || settings.vacationMode || !settings.name) return;
    const sendPing = () => fetch(`${activeUrl}/ping`, { method: 'POST' }).catch(() => {});
    sendPing();
    const interval = setInterval(sendPing, 10000);
    return () => clearInterval(interval);
  }, [status, activeUrl, settings.vacationMode, settings.name]);

  const handleSave = () => {
    if (!settings.name || !settings.startTime || !settings.endTime) {
      alert("Naam, Start en Deadline zijn verplicht.");
      return;
    }
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
    if (activeUrl) fetch(`${activeUrl}/save_settings`, { 
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify(settings) 
    }).then(() => setShowSettings(false)).catch(() => alert("Fout bij opslaan"));
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <style>{`@keyframes bounce-zz {0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-15px); opacity: 1; }} .animate-zz { animation: bounce-zz 2.5s infinite ease-in-out; }`}</style>
      <header className="px-6 py-4 bg-white border-b flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg"><Dog size={20} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-black italic text-slate-800">BARKR</h1>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? (settings.vacationMode ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-red-500'}`} />
              <span className={status === 'connected' ? (settings.vacationMode ? 'text-blue-600' : 'text-emerald-600') : 'text-red-500'}>
                {status === 'offline' ? 'Offline' : settings.vacationMode ? 'Rust' : 'Waakzaam'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="p-2.5 bg-slate-100 rounded-xl"><Info size={20}/></button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl"><Settings size={20}/></button>
        </div>
      </header>

      {!showSettings && !showManual && (
        <main className="flex-1 p-6 flex flex-col items-center pt-16 space-y-12">
          <button onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})} className={`relative w-72 h-72 rounded-full flex items-center justify-center border-[10px] shadow-2xl overflow-hidden ${settings.vacationMode ? 'bg-slate-900 border-slate-700' : 'bg-orange-600 border-orange-700'}`}>
             {settings.vacationMode ? (
                <div className="flex flex-col items-center justify-center relative w-full h-full">
                  <div className="absolute top-16 right-20 flex font-black text-blue-300 pointer-events-none z-10"><span className="text-3xl animate-zz" style={{animationDelay: '0s'}}>Z</span><span className="text-2xl animate-zz ml-1" style={{animationDelay: '0.4s'}}>z</span><span className="text-xl animate-zz ml-1" style={{animationDelay: '0.8s'}}>z</span></div>
                  <img src="/logo.png" className="w-full h-full object-cover scale-[1.02] opacity-40 grayscale" />
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center w-full h-full relative">
                   <img src="/logo.png" className="w-full h-full object-cover scale-[1.02] drop-shadow-xl" />
                   <div className="absolute bottom-6 inset-x-0 text-center"><span className="text-[11px] font-black uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] tracking-widest">Tik om te slapen</span></div>
                </div>
             )}
          </button>
          <div className="bg-white p-6 rounded-2xl border w-full max-w-xs text-center shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Laatste Controle</p>
             <p className="text-4xl font-black text-slate-800 tabular-nums">{lastPing}</p>
          </div>
        </main>
      )}

      {/* Manual & Setup (placeholder Naam, lege tijden) */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20">
          <header className="flex justify-between items-center mb-4"><h2 className="text-xl font-black uppercase italic tracking-tighter">Barkr Setup</h2><button onClick={() => setShowSettings(false)} className="p-2 bg-white rounded-full"><X size={20}/></button></header>
          <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
            <h3 className="font-bold text-sm">Gebruiker</h3>
            <input placeholder="Naam" value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} className="w-full bg-white border p-3 rounded-xl font-bold outline-none"/>
            <input placeholder="06..." value={settings.myPhone} onChange={e=>setSettings({...settings, myPhone:autoFormatPhone(e.target.value)})} className="w-full bg-white border p-3 rounded-xl font-mono outline-none"/>
            <h3 className="font-bold text-sm">Globale Planning</h3>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-slate-400 uppercase">Start</label><input type="time" value={settings.startTime} onChange={e=>setSettings({...settings, startTime:e.target.value})} className="w-full mt-1 bg-slate-50 border rounded-xl p-3 font-bold"/></div><div><label className="text-[10px] font-bold text-red-400 uppercase">Deadline</label><input type="time" value={settings.endTime} onChange={e=>setSettings({...settings, endTime:e.target.value})} className="w-full mt-1 bg-slate-50 border rounded-xl p-3 font-bold text-red-600"/></div></div>
          </div>
          <button onClick={handleSave} className="w-full bg-orange-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-200">Instellingen Opslaan</button>
          {/* Rest van de contactensectie... */}
        </div>
      )}
    </div>
  );
}
