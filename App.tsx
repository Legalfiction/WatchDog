import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Calendar, Wifi, Signal, User, Phone,
  Dog, BedDouble, ShieldCheck, Power, Activity
} from 'lucide-react';

// --- CONFIGURATIE: PRIORITEIT BEPALEN ---
const ENDPOINTS = [
  'http://192.168.1.38:5000',  // <--- 1. PROBEER EERST WIFI (Lokaal & Snel)
  'https://barkr.nl'           // <--- 2. BACKUP: INTERNET (Als Wifi faalt)
];

// Kleine logo in header
const DOG_ICON_SMALL = (
  <svg width="32" height="32" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="100" fill="#EA580C"/>
    <path d="M368 160C336 160 304 192 288 224L240 192L160 160C128 160 96 192 96 224C96 256 128 288 160 288L240 320L288 384C304 416 336 448 368 448C400 448 432 416 432 384C432 352 400 320 368 320H288L368 160Z" fill="white"/>
    <path d="M160 224C149.4 224 140 214.6 140 204C140 193.4 149.4 184 160 184C170.6 184 180 193.4 180 204C180 214.6 170.6 224 160 224Z" fill="#EA580C"/>
  </svg>
);

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
  const [lastPing, setLastPing] = useState('--:--');

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v15_data');
    if (saved) return JSON.parse(saved);
    return {
      myPhone: '', name: '', vacationMode: false, useCustomSchedule: false,
      activeDays: [0, 1, 2, 3, 4, 5, 6], startTime: '07:00', endTime: '08:30',
      contacts: [] as {name: string, phone: string}[], schedules: {} as any
    };
  });

  useEffect(() => {
    localStorage.setItem('barkr_v15_data', JSON.stringify(settings));
    if (!activeUrl) return;
    const timer = setTimeout(() => {
      fetch(`${activeUrl}/save_settings`, {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(settings),
        mode: 'cors'
      }).catch(e => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [settings, activeUrl]);

  const findConnection = useCallback(async () => {
    for (const url of ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        const res = await fetch(`${url}/status`, { 
          mode: 'cors',
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        if (res.ok) {
          setActiveUrl(url);
          setStatus('connected');
          fetch(`${url}/ping`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(settings),
            mode: 'cors'
          }).catch(() => {});
          setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
          return; 
        }
      } catch (e) {}
    }
    setStatus('offline');
  }, [settings]);

  useEffect(() => {
    findConnection();
    const interval = setInterval(findConnection, 5000);
    return () => clearInterval(interval);
  }, [findConnection]);

  // Helper voor de status tekst in header
  const getStatusText = () => {
    if (status === 'offline') return 'Geen verbinding';
    if (status === 'searching') return 'Zoeken...';
    return settings.vacationMode ? 'Systeem in rust' : 'Barkr is waakzaam';
  };

  // --- UI ---
  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* HEADER */}
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {DOG_ICON_SMALL}
          <div>
            <h1 className="text-lg font-black italic tracking-tighter text-slate-800">BARKR</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? (settings.vacationMode ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]') : 'bg-red-500 animate-pulse'}`} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${status === 'connected' ? (settings.vacationMode ? 'text-blue-600' : 'text-emerald-600') : 'text-red-500'}`}>
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-transform active:scale-95">
          <Settings size={20} className="text-slate-600"/>
        </button>
      </header>

      {/* DASHBOARD (Hoofdscherm) */}
      {!showSettings && (
        <main className="flex-1 p-6 flex flex-col items-center justify-start pt-12 space-y-10">
          
          {/* DE HOOFDKNOP (Toggle Aan/Uit) */}
          <button 
            onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
            disabled={status !== 'connected'}
            className={`relative w-64 h-64 rounded-full flex flex-col items-center justify-center border-[8px] transition-all duration-500 shadow-2xl active:scale-95 ${
              status !== 'connected' ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed' :
              settings.vacationMode 
                ? 'bg-slate-800 border-slate-600' // Uit/Slapend stijl
                : 'bg-orange-500 border-orange-400' // Aan/Wakend stijl
            }`}
          >
            {status !== 'connected' ? (
              <Wifi size={80} className="text-slate-400 animate-pulse"/>
            ) : settings.vacationMode ? (
              // SLAPENDE HOND (Vakantiemodus)
              <>
                <Dog size={100} className="text-slate-400 mb-2 opacity-50" strokeWidth={1.5}/>
                 <div className="absolute top-16 right-14 flex font-black text-slate-400 select-none">
                  <span className="text-xl animate-bounce" style={{animationDelay: '0s'}}>Z</span>
                  <span className="text-lg animate-bounce" style={{animationDelay: '0.2s'}}>z</span>
                  <span className="text-sm animate-bounce" style={{animationDelay: '0.4s'}}>z</span>
                </div>
                <span className="text-xs font-black uppercase text-slate-400 tracking-widest mt-2">Systeem Slaapt</span>
              </>
            ) : (
              // WAKENDE HOND (Actief)
              <>
                 <div className="relative">
                    <Dog size={110} className="text-white z-10 relative" strokeWidth={2} />
                    {/* Blaftoontjes effect */}
                    <Signal size={40} className="text-white absolute -top-2 -right-6 animate-pulse" strokeWidth={3}/>
                 </div>
                <span className="text-xs font-black uppercase text-white tracking-widest mt-4">Klik om te pauzeren</span>
              </>
            )}

            {/* Verbindings Label */}
            {activeUrl && (
              <div className={`absolute -bottom-5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-2 shadow-lg transition-colors ${settings.vacationMode ? 'bg-slate-900 text-slate-400' : 'bg-white text-orange-600'}`}>
                {activeUrl.includes('barkr') ? <Signal size={12}/> : <Wifi size={12}/>}
                {activeUrl.includes('barkr') ? '4G Verbinding' : 'Wifi Verbinding'}
              </div>
            )}
          </button>

          {/* Status Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 w-full text-center shadow-sm flex flex-col items-center">
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
               <Activity size={12}/> Laatste Levensteken
             </p>
             <p className="text-3xl font-black text-slate-800 tabular-nums">{lastPing}</p>
          </div>
        </main>
      )}

      {/* SETUP MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto animate-in slide-in-from-bottom-5">
          <header className="px-6 py-4 bg-white border-b sticky top-0 z-10 flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-800 uppercase italic">Barkr Setup</h2>
            <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-transform active:scale-95"><X size={20}/></button>
          </header>

          <div className="p-6 space-y-6">
            {/* DAGEN */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block flex items-center gap-1">
                <Calendar size={10} /> Bewakingsdagen
              </label>
              <div className="flex justify-between gap-1">
                {DAYS.map((d, i) => (
                  <button key={d} onClick={() => {
                      const days = settings.activeDays.includes(i) ? settings.activeDays.filter(x=>x!==i) : [...settings.activeDays, i];
                      setSettings({...settings, activeDays: days});
                    }}
                    className={`h-10 w-10 rounded-lg text-xs font-bold transition-all ${settings.activeDays.includes(i) ? 'bg-orange-600 text-white shadow-md shadow-orange-200' : 'bg-white border border-slate-200 text-slate-400'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* SLIMME PLANNING */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                 <div>
                   <h3 className="font-bold text-slate-800 text-sm">Slimme Planning</h3>
                   <p className="text-[10px] text-slate-400">Verschillende tijden per dag instellen</p>
                 </div>
                 <button onClick={() => setSettings({...settings, useCustomSchedule: !settings.useCustomSchedule})} className={`w-12 h-6 rounded-full relative transition-colors ${settings.useCustomSchedule ? 'bg-orange-600' : 'bg-slate-200'}`}>
                   <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.useCustomSchedule ? 'translate-x-6' : ''}`}/>
                 </button>
              </div>

              {!settings.useCustomSchedule ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase">Standaard Start</label>
                     <input type="time" value={settings.startTime} onChange={e=>setSettings({...settings, startTime:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold focus:ring-2 focus:ring-orange-500 outline-none"/>
                  </div>
                  <div>
                     <label className="text-[10px] font-bold text-red-400 uppercase">Standaard Deadline</label>
                     <input type="time" value={settings.endTime} onChange={e=>setSettings({...settings, endTime:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-red-600 focus:ring-2 focus:ring-orange-500 outline-none"/>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                   {settings.activeDays.sort((a,b)=>a-b).map(d => (
                     <div key={d} className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase text-orange-800 flex items-center gap-2"><Calendar size={12}/> {DAYS[d]}</span>
                        <input type="time" value={settings.schedules[d]?.endTime || settings.endTime} onChange={e=>{
                          const s = {...settings.schedules, [d]: {...settings.schedules[d], endTime:e.target.value}};
                          setSettings({...settings, schedules: s});
                        }} className="bg-white px-2 py-1 rounded border border-orange-200 text-xs font-bold text-red-600 focus:ring-1 focus:ring-orange-500 outline-none"/>
                     </div>
                   ))}
                </div>
              )}
            </div>

            {/* PERSOONSGEGEVENS */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Jouw Naam</label>
                <input type="text" value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-white font-bold focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Naam"/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Mijn Mobiel (Bewaakt Nummer)</label>
                <input type="tel" value={settings.myPhone} onChange={e=>setSettings({...settings, myPhone:autoFormatPhone(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-white font-mono text-slate-600 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Bijv. 0612345678"/>
              </div>
            </div>

            {/* NOODCONTACTEN */}
            <div>
              <div className="flex justify-between items-center mb-2">
                 <label className="text-[10px] font-bold text-orange-600 uppercase">Noodcontacten</label>
                 <button onClick={()=>setSettings({...settings, contacts:[...settings.contacts, {name:'', phone:''}]})} className="bg-orange-600 text-white p-2 rounded-lg shadow-md shadow-orange-200 transition-transform active:scale-95">
                   <Plus size={16}/>
                 </button>
              </div>
              <div className="space-y-3">
                {settings.contacts.map((c, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                     <button onClick={()=> {const n=[...settings.contacts]; n.splice(i,1); setSettings({...settings, contacts:n})}} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors">
                       <Trash2 size={16}/>
                     </button>
                     <div className="space-y-2 pr-6">
                        <input placeholder="Naam Contact" value={c.name} onChange={e=>{const n=[...settings.contacts]; n[i].name=e.target.value; setSettings({...settings, contacts:n})}} className="w-full font-bold text-sm outline-none bg-transparent"/>
                        <input placeholder="Nummer" value={c.phone} onChange={e=>{const n=[...settings.contacts]; n[i].phone=autoFormatPhone(e.target.value); setSettings({...settings, contacts:n})}} className="w-full font-mono text-xs text-slate-500 outline-none bg-transparent"/>
                     </div>
                     <button onClick={() => {
                         if(activeUrl) fetch(`${activeUrl}/test_contact`, {
                            method:'POST', 
                            headers:{'Content-Type':'application/json'}, 
                            body:JSON.stringify(c),
                            mode: 'cors'
                         }).then(() => alert('Testbericht verstuurd naar ' + c.name)).catch(() => alert('Kon testbericht niet verzenden.'));
                       }} className="mt-2 bg-emerald-50 text-emerald-600 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1 w-fit transition-all active:scale-95">
                       <ShieldCheck size={12}/> TEST VERBINDING
                     </button>
                  </div>
                ))}
                {settings.contacts.length === 0 && (
                  <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-[10px] font-bold uppercase bg-white">
                    Nog geen contacten toegevoegd
                  </div>
                )}
              </div>
            </div>
            <div className="h-10"></div>
          </div>
        </div>
      )}
    </div>
  );
}