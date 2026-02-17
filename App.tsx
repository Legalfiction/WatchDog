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
    return saved ? JSON.parse(saved) : { name: '', myPhone: '', vacationMode: false, useCustomSchedule: false, activeDays: [0, 1, 2, 3, 4, 5, 6], startTime: '', endTime: '', contacts: [], schedules: {} };
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

  // STRIKTE REALTIME HEARTBEAT: Elke 5 seconden pingen
  useEffect(() => {
    if (status !== 'connected' || !activeUrl || settings.vacationMode || !settings.name) return;
    const sendPing = () => fetch(`${activeUrl}/ping`, { method: 'POST' }).catch(() => {});
    sendPing();
    const interval = setInterval(sendPing, 5000);
    return () => clearInterval(interval);
  }, [status, activeUrl, settings.vacationMode, settings.name]);

  const handleSave = () => {
    if (!settings.name || !settings.startTime || !settings.endTime) return alert("Naam en tijden zijn verplicht.");
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
    if (activeUrl) fetch(`${activeUrl}/save_settings`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(settings) }).then(() => setShowSettings(false));
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <style>{`@keyframes bounce-zz {0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-15px); opacity: 1; }} .animate-zz { animation: bounce-zz 2.5s infinite ease-in-out; }`}</style>
      
      <header className="px-6 py-4 bg-white border-b flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg"><Dog size={20} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-black italic text-slate-800 uppercase">Barkr</h1>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? (settings.vacationMode ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-red-500'}`} />
              <span className={status === 'connected' ? (settings.vacationMode ? 'text-blue-600' : 'text-emerald-600') : 'text-red-500'}>{status === 'offline' ? 'Offline' : settings.vacationMode ? 'Rust' : 'Waakzaam'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><Info size={20}/></button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><Settings size={20}/></button>
        </div>
      </header>

      {!showSettings && !showManual && (
        <main className="flex-1 p-6 flex flex-col items-center pt-16 space-y-12">
          <button onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})} className={`relative w-72 h-72 rounded-full flex items-center justify-center border-[10px] shadow-2xl overflow-hidden ${settings.vacationMode ? 'bg-slate-900 border-slate-700' : 'bg-orange-600 border-orange-700'}`}>
             {settings.vacationMode ? (
                <div className="flex flex-col items-center relative w-full h-full">
                  <div className="absolute top-16 right-20 flex font-black text-blue-300 pointer-events-none z-10"><span className="text-3xl animate-zz" style={{animationDelay: '0s'}}>Z</span><span className="text-2xl animate-zz ml-1" style={{animationDelay: '0.4s'}}>z</span><span className="text-xl animate-zz ml-1" style={{animationDelay: '0.8s'}}>z</span></div>
                  <img src="/logo.png" className="w-full h-full object-cover scale-[1.02] opacity-40 grayscale" />
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center w-full h-full relative">
                   <img src="/logo.png" className="w-full h-full object-cover scale-[1.02] drop-shadow-xl" />
                   <div className="absolute bottom-6 text-[11px] font-black uppercase text-white tracking-widest">Tik om te slapen</div>
                </div>
             )}
          </button>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 w-full max-w-xs text-center shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2"><Activity size={12} className="inline mr-1"/> Laatste Controle</p>
             <p className="text-4xl font-black text-slate-800">{lastPing}</p>
          </div>
        </main>
      )}

      {showManual && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-8 pb-20">
          <header className="flex justify-between items-center mb-6"><h2 className="text-xl font-black uppercase italic tracking-tight">Handleiding</h2><button onClick={() => setShowManual(false)} className="p-2 bg-white rounded-full"><X size={20}/></button></header>
          <section className="bg-orange-50 p-6 rounded-3xl border border-orange-200 space-y-3"><h4 className="font-bold text-orange-800 flex items-center gap-2"><Clock size={18}/> Belangrijke werking</h4><p className="text-sm text-orange-900 leading-relaxed font-medium">Als de mobiel van de gebruiker **niet is aangezet** tijdens het ingestelde tijdswindow, wordt er automatisch een **WhatsApp-bericht** naar de contacten verstuurd.</p></section>
          <section className="bg-blue-50 p-6 rounded-3xl border border-blue-200 space-y-3"><h4 className="font-bold text-blue-800 flex items-center gap-2"><AlertTriangle size={18}/> Versie Instructie</h4><p className="text-sm text-blue-900 leading-relaxed font-medium">In deze versie moet de app **altijd eenmalig handmatig opgestart worden**.</p></section>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20">
          <header className="flex justify-between items-center mb-4"><h2 className="text-xl font-black uppercase italic tracking-tighter">Setup</h2><button onClick={() => setShowSettings(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button></header>
          <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
            <input placeholder="Naam" value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} className="w-full bg-white border p-3 rounded-xl font-bold outline-none"/>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-slate-400 uppercase">Start</label><input type="time" value={settings.startTime} onChange={e=>setSettings({...settings, startTime:e.target.value})} className="w-full mt-1 bg-slate-50 border rounded-xl p-3 font-bold"/></div><div><label className="text-[10px] font-bold text-red-400 uppercase">Deadline</label><input type="time" value={settings.endTime} onChange={e=>setSettings({...settings, endTime:e.target.value})} className="w-full mt-1 bg-slate-50 border rounded-xl p-3 font-bold text-red-600"/></div></div>
          </div>
          <button onClick={handleSave} className="w-full bg-orange-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-200">Opslaan</button>
          
          <label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block mt-6">Contacten</label>
          <button onClick={()=>setSettings({...settings, contacts:[...settings.contacts, {name:'', phone:''}]})} className="w-full bg-orange-600 text-white p-3 rounded-xl shadow-md flex justify-center mb-4"><Plus size={20}/></button>
          <div className="space-y-4">{settings.contacts.map((c, i) => (<div key={i} className="bg-white p-5 rounded-2xl border shadow-sm relative space-y-4"><button onClick={()=> {const n=[...settings.contacts]; n.splice(i,1); setSettings({...settings, contacts:n})}} className="absolute top-4 right-4 text-slate-300"><Trash2 size={18}/></button><div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Naam</label><input placeholder="Naam" value={c.name} onChange={e=>{const n=[...settings.contacts]; n[i].name=e.target.value; setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border rounded-xl p-3 text-sm font-bold outline-none"/></div><div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Telefoonnummer</label><input placeholder="06..." value={c.phone} onChange={e=>{const n=[...settings.contacts]; n[i].phone=autoFormatPhone(e.target.value); setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border rounded-xl p-3 text-sm font-mono outline-none"/></div></div>))}</div>
        </div>
      )}
    </div>
  );
}
