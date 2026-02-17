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
      <header className="px-6 py-4 bg-white border-b flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg"><Dog size={20} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-black italic tracking-tighter text-slate-800">BARKR</h1>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className={status === 'connected' ? 'text-emerald-600' : 'text-red-500'}>{status === 'connected' ? 'Systeem waakzaam' : 'Offline'}</span>
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
             <img src="/logo.png" className={`w-full h-full object-cover scale-[1.02] ${settings.vacationMode ? 'opacity-40 grayscale' : 'drop-shadow-xl'}`} />
             <span className="absolute bottom-6 text-[11px] font-black uppercase text-white tracking-widest">{settings.vacationMode ? 'WAKKER WORDEN' : 'TIK OM TE SLAPEN'}</span>
          </button>
          <div className="bg-white p-6 rounded-2xl border w-full max-w-xs text-center">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Laatste Controle</p>
             <p className="text-4xl font-black text-slate-800">{lastPing}</p>
          </div>
        </main>
      )}

      {showManual && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-8 pb-20">
          <header className="flex justify-between items-center mb-6"><h2 className="text-xl font-black uppercase italic tracking-tight">Handleiding</h2><button onClick={() => setShowManual(false)} className="p-2 bg-white rounded-full"><X size={20}/></button></header>
          <section className="bg-orange-50 p-6 rounded-3xl border border-orange-200 space-y-3"><h4 className="font-bold text-orange-800 flex items-center gap-2"><Clock size={18}/> Belangrijke werking</h4><p className="text-sm text-orange-900 leading-relaxed font-medium">Als de mobiel van de gebruiker **niet is aangezet** tijdens het ingestelde tijdswindow, wordt er automatisch een **WhatsApp-bericht** naar de contacten verstuurd.</p></section>
          <section className="bg-blue-50 p-6 rounded-3xl border border-blue-200 space-y-3"><h4 className="font-bold text-blue-800 flex items-center gap-2"><AlertTriangle size={18}/> Versie Instructie</h4><p className="text-sm text-blue-900 leading-relaxed font-medium">In deze versie moet de app **altijd eenmalig handmatig opgestart worden**. In de volgende update wordt dit geautomatiseerd.</p></section>
          <section className="space-y-3"><h4 className="font-bold text-slate-800 flex items-center gap-2 px-2"><ShieldCheck size={18} className="text-orange-600"/> Waarom Barkr?</h4><p className="text-sm text-slate-600 px-2 leading-relaxed">Barkr (blaffer) is een digitale waakhond voor vrienden en familie. Het systeem houdt de activiteit van kwetsbare personen, zoals Sven Brouwers (22), in de gaten om tijdig hulp te kunnen inschakelen.</p></section>
          <section className="bg-slate-800 p-6 rounded-3xl text-white space-y-3"><h4 className="font-bold flex items-center gap-2"><ExternalLink size={18} className="text-orange-400"/> Contact</h4><div className="space-y-1 text-sm"><p>www.barkr.nl</p><p>info@barkr.nl</p></div></section>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20">
          <header className="flex justify-between items-center mb-4"><h2 className="text-xl font-black uppercase italic tracking-tighter">Barkr Setup</h2><button onClick={() => setShowSettings(false)} className="p-2 bg-white rounded-full"><X size={20}/></button></header>
          <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
            <div className="flex justify-between items-center"><div><h3 className="font-bold text-sm">Slimme Planning</h3><p className="text-[10px] text-slate-400">Volledige windows per dag</p></div><button onClick={() => setSettings({...settings, useCustomSchedule: !settings.useCustomSchedule})} className={`w-12 h-7 rounded-full relative transition-colors ${settings.useCustomSchedule ? 'bg-orange-600' : 'bg-slate-200'}`}><div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.useCustomSchedule ? 'translate-x-5' : ''}`}/></button></div>
            {!settings.useCustomSchedule ? (
              <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-slate-400 uppercase">Start</label><input type="time" value={settings.startTime} onChange={e=>setSettings({...settings, startTime:e.target.value})} className="w-full mt-1 bg-slate-50 border rounded-xl p-3 font-bold"/></div><div><label className="text-[10px] font-bold text-red-400 uppercase">Deadline</label><input type="time" value={settings.endTime} onChange={e=>setSettings({...settings, endTime:e.target.value})} className="w-full mt-1 bg-slate-50 border rounded-xl p-3 font-bold text-red-600"/></div></div>
            ) : (
              <div className="space-y-3">{settings.activeDays.sort().map(d => (<div key={d} className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 space-y-2"><span className="text-xs font-black uppercase text-orange-800 block border-b pb-1">{DAYS[d]}</span><div className="grid grid-cols-2 gap-3"><div><p className="text-[9px] font-bold text-slate-400 uppercase">Start</p><input type="time" value={settings.schedules[d]?.startTime || settings.startTime} onChange={e=>{setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], startTime:e.target.value}}})}} className="w-full bg-white px-2 py-1.5 rounded-lg border text-xs font-bold"/></div><div><p className="text-[9px] font-bold text-red-400 uppercase">Deadline</p><input type="time" value={settings.schedules[d]?.endTime || settings.endTime} onChange={e=>{setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], endTime:e.target.value}}})}} className="w-full bg-white px-2 py-1.5 rounded-lg border text-xs font-bold text-red-600"/></div></div></div>))}</div>
            )}
          </div>
          <div><label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block mb-2">Contacten</label><button onClick={()=>setSettings({...settings, contacts:[...settings.contacts, {name:'', phone:''}]})} className="w-full bg-orange-600 text-white p-3 rounded-xl flex justify-center mb-4"><Plus size={20}/></button>
            <div className="space-y-4">{settings.contacts.map((c, i) => (<div key={i} className="bg-white p-5 rounded-2xl border shadow-sm relative space-y-4"><button onClick={()=> {const n=[...settings.contacts]; n.splice(i,1); setSettings({...settings, contacts:n})}} className="absolute top-4 right-4 text-slate-300"><Trash2 size={18}/></button><div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Naam</label><input placeholder="Naam" value={c.name} onChange={e=>{const n=[...settings.contacts]; n[i].name=e.target.value; setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border rounded-xl p-3 text-sm font-bold outline-none"/></div><div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Telefoonnummer</label><input placeholder="06..." value={c.phone} onChange={e=>{const n=[...settings.contacts]; n[i].phone=autoFormatPhone(e.target.value); setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border rounded-xl p-3 text-sm font-mono outline-none"/></div><button onClick={() => activeUrl && fetch(`${activeUrl}/test_contact`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(c)})} className="w-full bg-emerald-50 text-emerald-600 text-[10px] font-black py-2 rounded-lg border flex items-center justify-center gap-2"><ShieldCheck size={14}/> TEST VERBINDING</button></div>))}</div>
          </div>
        </div>
      )}
    </div>
  );
}
