import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Calendar, Wifi, Signal, 
  Activity, ShieldCheck, Dog, Clock, Info, ExternalLink, AlertTriangle
} from 'lucide-react';

const URL = 'https://barkr.nl';
// DIT IS DE SLEUTEL VOOR MULTI-USER GEBRUIK:
const APP_SECRET = 'BARKR_NATIVE_CLIENT_V1'; 

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

const autoFormatPhone = (input: string) => {
  let p = input.replace(/\s/g, '').replace(/-/g, '').replace(/\./g, '');
  if (p.startsWith('06') && p.length === 10) return '+316' + p.substring(2);
  return p;
};

export default function App() {
  const [status, setStatus] = useState('searching');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [lastPing, setLastPing] = useState('--:--');
  
  // Standaard instellingen (Leeg bij eerste gebruik voor multi-user support)
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v17_data');
    return saved ? JSON.parse(saved) : {
      name: '', 
      vacationMode: false, 
      useCustomSchedule: false,
      activeDays: [0, 1, 2, 3, 4, 5, 6], 
      startTime: '07:00', 
      endTime: '08:30',
      contacts: [], 
      schedules: {}
    };
  });

  // 1. DE ENGINE: Heartbeat met App Secret & Keep-Alive
  useEffect(() => {
    // Als er geen naam is ingevuld, kunnen we niet pingen (wie is het?)
    if (settings.vacationMode || !settings.name) return;

    const sendHeartbeat = () => {
      fetch(`${URL}/ping`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        // We sturen de naam én de geheime sleutel mee
        body: JSON.stringify({ 
          name: settings.name, 
          secret: APP_SECRET 
        }),
        mode: 'cors',
        keepalive: true // CRUCIAAL VOOR ACHTERGROND WERKING
      })
      .then(res => {
        if(res.ok) {
          setStatus('connected');
          setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
        } else {
          setStatus('offline');
        }
      })
      .catch(() => setStatus('offline'));
    };

    // Directe start en daarna interval
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 10000); 
    return () => clearInterval(interval);
  }, [settings.name, settings.vacationMode]);

  // 2. OPSLAAN: Sync instellingen naar de backend
  const handleSave = () => {
    localStorage.setItem('barkr_v17_data', JSON.stringify(settings));
    
    if (settings.name) {
      fetch(`${URL}/save_settings`, {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ ...settings, secret: APP_SECRET })
      }).catch(() => {});
    }
    setShowSettings(false);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <style>{`
        @keyframes bounce-zz { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-15px); opacity: 1; } }
        .animate-zz { animation: bounce-zz 2.5s infinite ease-in-out; }
      `}</style>
      
      {/* HEADER */}
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg shadow-sm"><Dog size={20} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-black italic tracking-tighter text-slate-800 uppercase">Barkr</h1>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? (settings.vacationMode ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-red-500'}`} />
              <span className={status === 'connected' ? (settings.vacationMode ? 'text-blue-600' : 'text-emerald-600') : 'text-red-500'}>
                {status === 'offline' ? 'Geen verbinding' : settings.vacationMode ? 'Systeem in rust' : 'Barkr is waakzaam'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><Info size={20} className="text-slate-600"/></button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><Settings size={20} className="text-slate-600"/></button>
        </div>
      </header>

      {/* DASHBOARD */}
      {!showSettings && !showManual && (
        <main className="flex-1 p-6 flex flex-col items-center justify-start pt-16 space-y-12">
          <button 
            onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
            className={`w-72 h-72 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl border-[10px] overflow-hidden relative ${
               settings.vacationMode ? 'bg-slate-900 border-slate-700' : 'bg-orange-600 border-orange-700'
            }`}
          >
             {settings.vacationMode ? (
                <>
                  <div className="absolute top-16 right-20 flex font-black text-blue-300 pointer-events-none z-10">
                    <span className="text-3xl animate-zz">Z</span><span className="text-2xl animate-zz ml-1">z</span><span className="text-xl animate-zz ml-1">z</span>
                  </div>
                  <img src="/logo.png" className="w-full h-full object-cover opacity-20 grayscale" alt="Sleep" />
                </>
             ) : (
                <img src="/logo.png" className="w-full h-full object-cover" alt="Active" />
             )}
          </button>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 w-full max-w-xs text-center shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest"><Activity size={12} className="inline mr-1"/> Systeem Hartslag</p>
             <p className="text-4xl font-black text-slate-800 tabular-nums">{lastPing}</p>
          </div>
        </main>
      )}

      {/* HANDLEIDING */}
      {showManual && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-8 animate-in fade-in duration-300">
          <header className="flex justify-between items-center mb-6"><h2 className="text-xl font-black uppercase italic tracking-tight">Handleiding</h2><button onClick={() => setShowManual(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button></header>
          <section className="bg-orange-50 p-6 rounded-3xl border border-orange-200 space-y-3"><h4 className="font-bold text-orange-800 flex items-center gap-2"><Clock size={18}/> Werking</h4><p className="text-sm text-orange-900 leading-relaxed font-medium">De app controleert of dit specifieke toestel actief is. Als er geen activiteit is tijdens het venster, wordt alarm geslagen.</p></section>
          <section className="bg-blue-50 p-6 rounded-3xl border border-blue-200 space-y-3"><h4 className="font-bold text-blue-800 flex items-center gap-2"><ShieldCheck size={18}/> Multi-User</h4><p className="text-sm text-blue-900 leading-relaxed font-medium">Vul uw unieke naam in bij Instellingen. Het systeem herkent u aan uw naam en de beveiligde app-sleutel.</p></section>
          <button onClick={() => setShowManual(false)} className="w-full py-4 bg-slate-800 text-white font-black uppercase rounded-2xl tracking-widest">Sluiten</button>
        </div>
      )}

      {/* SETUP */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 animate-in slide-in-from-bottom duration-300">
          <header className="flex justify-between items-center mb-4"><h2 className="text-xl font-black uppercase italic tracking-tighter">Setup</h2><button onClick={() => setShowSettings(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button></header>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Naam Gebruiker</label>
                <input value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} placeholder="Bijv. Aldo" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none"/>
            </div>
            
            <div className="flex justify-between items-center pt-2"><div><h3 className="font-bold text-slate-800 text-sm italic uppercase tracking-tighter">Planning</h3><p className="text-[10px] text-slate-400 uppercase font-bold">Vensters per dag</p></div><button onClick={() => setSettings({...settings, useCustomSchedule: !settings.useCustomSchedule})} className={`w-12 h-7 rounded-full relative transition-colors ${settings.useCustomSchedule ? 'bg-orange-600' : 'bg-slate-200'}`}><div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.useCustomSchedule ? 'translate-x-5' : ''}`}/></button></div>
            
            {!settings.useCustomSchedule ? (
              <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-slate-400 uppercase">Start</label><input type="time" value={settings.startTime} onChange={e=>setSettings({...settings, startTime:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700"/></div><div><label className="text-[10px] font-bold text-red-400 uppercase">Deadline</label><input type="time" value={settings.endTime} onChange={e=>setSettings({...settings, endTime:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-red-600"/></div></div>
            ) : (
              <div className="space-y-3">{settings.activeDays.sort().map(d => (<div key={d} className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 space-y-2"><span className="text-xs font-black uppercase text-orange-800 block border-b border-orange-100 pb-1">{DAYS[d]}</span><div className="grid grid-cols-2 gap-3"><div><p className="text-[9px] font-bold text-slate-400 uppercase">Start</p><input type="time" value={settings.schedules[d]?.startTime || settings.startTime} onChange={e=>{setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], startTime:e.target.value}}})}} className="w-full bg-white px-2 py-1.5 rounded-lg border border-orange-200 text-xs font-bold text-slate-700 text-center"/></div><div><p className="text-[9px] font-bold text-red-400 uppercase">Deadline</p><input type="time" value={settings.schedules[d]?.endTime || settings.endTime} onChange={e=>{setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], endTime:e.target.value}}})}} className="w-full bg-white px-2 py-1.5 rounded-lg border border-orange-200 text-xs font-bold text-red-600 text-center"/></div></div></div>))}</div>
            )}
          </div>

          <div><label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block mb-2 px-1">Contacten</label><button onClick={()=>setSettings({...settings, contacts:[...settings.contacts, {name:'', phone:''}]})} className="w-full bg-orange-600 text-white p-3 rounded-xl shadow-md flex justify-center mb-4"><Plus size={20}/></button>
            <div className="space-y-4">{settings.contacts.map((c, i) => (<div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative space-y-4"><button onClick={()=> {const n=[...settings.contacts]; n.splice(i,1); setSettings({...settings, contacts:n})}} className="absolute top-4 right-4 text-slate-300"><Trash2 size={18}/></button><div><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Naam</label><input placeholder="Naam" value={c.name} onChange={e=>{const n=[...settings.contacts]; n[i].name=e.target.value; setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none"/></div><div><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Telefoonnummer</label><input placeholder="06..." value={c.phone} onChange={e=>{const n=[...settings.contacts]; n[i].phone=autoFormatPhone(e.target.value); setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-mono text-slate-600 outline-none"/></div></div>))}</div>
          </div>
          <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white font-black uppercase rounded-[28px] tracking-[0.2em] shadow-xl">Opslaan & Starten</button>
        </div>
      )}
    </div>
  );
}
