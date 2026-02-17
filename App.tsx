import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Calendar, Wifi, Signal, 
  Activity, ShieldCheck, Dog, Clock, Info, ExternalLink, Mail, AlertTriangle
} from 'lucide-react';

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
      activeDays: [0, 1, 2, 3, 4, 5, 6], startTime: '07:00', endTime: '08:30',
      contacts: [], schedules: {}
    };
  });

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

  const findConnection = useCallback(async () => {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          setActiveUrl(url);
          setStatus('connected');
          setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
          return; 
        }
      } catch (e) {}
    }
    setStatus('offline');
  }, []);

  useEffect(() => {
    findConnection();
    const interval = setInterval(findConnection, 5000);
    return () => clearInterval(interval);
  }, [findConnection]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <style>{`@keyframes bounce-zz {0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-15px); opacity: 1; }} .animate-zz { animation: bounce-zz 2.5s infinite ease-in-out; }`}</style>
      
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg shadow-sm"><Dog size={20} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-black italic tracking-tighter text-slate-800">BARKR</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? (settings.vacationMode ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-red-500'}`} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${status === 'connected' ? (settings.vacationMode ? 'text-blue-600' : 'text-emerald-600') : 'text-red-500'}`}>
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
          <button onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})} disabled={status !== 'connected'} className={`relative w-72 h-72 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl overflow-hidden border-[10px] ${status !== 'connected' ? 'bg-slate-100 border-slate-200 opacity-60' : settings.vacationMode ? 'bg-slate-900 border-slate-700' : 'bg-orange-600 border-orange-700'}`}>
            {status !== 'connected' ? <Wifi size={80} className="text-slate-400 animate-pulse"/> : settings.vacationMode ? (
              <div className="flex flex-col items-center"><img src="/logo.png" className="w-full h-full object-cover scale-[1.02] opacity-40 grayscale" /><span className="absolute mt-24 text-xs font-black uppercase text-blue-100 tracking-widest">Wakker worden</span></div>
            ) : (
              <div className="flex flex-col items-center"><img src="/logo.png" className="w-full h-full object-cover scale-[1.02] drop-shadow-xl" /><span className="absolute bottom-6 text-[11px] font-black uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] tracking-widest">Tik om te slapen</span></div>
            )}
          </button>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 w-full max-w-xs text-center shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest"><Activity size={12} className="inline mr-1"/> Laatste Controle</p>
             <p className="text-4xl font-black text-slate-800 tabular-nums">{lastPing}</p>
          </div>
        </main>
      )}

      {showManual && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-8 pb-20">
          <header className="flex justify-between items-center mb-6"><h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">Handleiding</h2><button onClick={() => setShowManual(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button></header>
          <section className="bg-orange-50 p-6 rounded-3xl border border-orange-200 space-y-3"><h4 className="font-bold text-orange-800 flex items-center gap-2"><Clock size={18}/> Belangrijke werking</h4><p className="text-sm text-orange-900 leading-relaxed font-medium">Als de mobiel van de gebruiker **niet is aangezet** tijdens het ingestelde tijdswindow, wordt er automatisch een **WhatsApp-bericht** naar de contacten verstuurd.</p></section>
          <section className="bg-blue-50 p-6 rounded-3xl border border-blue-200 space-y-3"><h4 className="font-bold text-blue-800 flex items-center gap-2"><AlertTriangle size={18}/> Versie Instructie</h4><p className="text-sm text-blue-900 leading-relaxed font-medium">In deze versie moet de app **altijd eenmalig handmatig opgestart worden**. Bij de volgende update zal dit automatisch gaan.</p></section>
          <section className="space-y-3"><h4 className="font-bold text-slate-800 flex items-center gap-2 px-2"><ShieldCheck size={18} className="text-orange-600"/> Waarom Barkr?</h4><p className="text-sm text-slate-600 leading-relaxed px-2">Barkr (blaffer) is jouw digitale waakhond voor vrienden en familie. Het houdt de activiteit in de gaten om te zorgen dat iedereen veilig is.</p></section>
          <section className="bg-slate-800 p-6 rounded-3xl text-white space-y-3"><h4 className="font-bold flex items-center gap-2"><ExternalLink size={18} className="text-orange-400"/> Contact</h4><div className="space-y-2 text-sm"><p>Website: www.barkr.nl</p><p>E-mail: info@barkr.nl</p></div></section>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20">
          <header className="flex justify-between items-center mb-4"><h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Barkr Setup</h2><button onClick={() => setShowSettings(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button></header>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center"><div><h3 className="font-bold text-slate-800 text-sm">Slimme Planning</h3><p className="text-[10px] text-slate-400">Vensters per dag instellen</p></div><button onClick={() => setSettings({...settings, useCustomSchedule: !settings.useCustomSchedule})} className={`w-12 h-7 rounded-full relative transition-colors ${settings.useCustomSchedule ? 'bg-orange-600' : 'bg-slate-200'}`}><div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.useCustomSchedule ? 'translate-x-5' : ''}`}/></button></div>
            {!settings.useCustomSchedule ? (
              <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-slate-400 uppercase">Start</label><input type="time" value={settings.startTime} onChange={e=>setSettings({...settings, startTime:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700"/></div><div><label className="text-[10px] font-bold text-red-400 uppercase">Deadline</label><input type="time" value={settings.endTime} onChange={e=>setSettings({...settings, endTime:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-red-600"/></div></div>
            ) : (
              <div className="space-y-3">{settings.activeDays.sort().map(d => (<div key={d} className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 space-y-2"><span className="text-xs font-black uppercase text-orange-800 block border-b border-orange-100 pb-1">{DAYS[d]}</span><div className="grid grid-cols-2 gap-3"><div><p className="text-[9px] font-bold text-slate-400 uppercase">Start</p><input type="time" value={settings.schedules[d]?.startTime || settings.startTime} onChange={e=>{setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], startTime:e.target.value}}})}} className="w-full bg-white px-2 py-1.5 rounded-lg border border-orange-200 text-xs font-bold text-slate-700"/></div><div><p className="text-[9px] font-bold text-red-400 uppercase">Deadline</p><input type="time" value={settings.schedules[d]?.endTime || settings.endTime} onChange={e=>{setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], endTime:e.target.value}}})}} className="w-full bg-white px-2 py-1.5 rounded-lg border border-orange-200 text-xs font-bold text-red-600"/></div></div></div>))}</div>
            )}
          </div>
          <div><label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block mb-2">Contacten</label><button onClick={()=>setSettings({...settings, contacts:[...settings.contacts, {name:'', phone:''}]})} className="w-full bg-orange-600 text-white p-3 rounded-xl shadow-md flex justify-center mb-4"><Plus size={20}/></button>
            <div className="space-y-4">{settings.contacts.map((c, i) => (<div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative space-y-4"><button onClick={()=> {const n=[...settings.contacts]; n.splice(i,1); setSettings({...settings, contacts:n})}} className="absolute top-4 right-4 text-slate-300"><Trash2 size={18}/></button><div><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Naam</label><input placeholder="Naam" value={c.name} onChange={e=>{const n=[...settings.contacts]; n[i].name=e.target.value; setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none"/></div><div><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Telefoonnummer</label><input placeholder="06..." value={c.phone} onChange={e=>{const n=[...settings.contacts]; n[i].phone=autoFormatPhone(e.target.value); setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-mono text-slate-600 outline-none"/></div><button onClick={() => activeUrl && fetch(`${activeUrl}/test_contact`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(c)})} className="w-full bg-emerald-50 text-emerald-600 text-[10px] font-black py-2 rounded-lg border border-emerald-100 flex items-center justify-center gap-2"><ShieldCheck size={14}/> TEST VERBINDING</button></div>))}</div>
          </div>
        </div>
      )}
    </div>
  );
}
