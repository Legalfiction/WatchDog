import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Calendar, Wifi, Signal, 
  Dog, Activity, Moon, ShieldCheck 
} from 'lucide-react';

// --- CONFIGURATIE ---
const ENDPOINTS = [
  'http://192.168.1.38:5000',  // 1. Wifi
  'https://barkr.nl'           // 2. 4G / Tunnel
];

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

const autoFormatPhone = (input: string) => {
  let p = input.replace(/\s/g, '').replace(/-/g, '').replace(/\./g, '');
  if (p.startsWith('06') && p.length === 10) return '+316' + p.substring(2);
  return p;
};

// --- ICONEN COMPONENTEN ---
const BarkingDogIcon = () => (
  <svg viewBox="0 0 100 100" className="w-40 h-40 fill-white drop-shadow-lg">
    <path d="M30,70 L25,85 M35,70 L40,85 M70,50 C80,50 85,40 85,30 C85,20 75,15 65,15 C55,15 45,25 45,40 L45,70 L70,70 Z M55,40 A5,5 0 1,1 54.9,40 Z M85,45 Q95,45 95,55 M85,55 Q92,55 92,62 M85,65 Q89,65 89,69" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none"/>
    <circle cx="55" cy="35" r="3" fill="white"/>
  </svg>
);

const SleepingDogIcon = () => (
  <svg viewBox="0 0 100 100" className="w-40 h-40 fill-blue-200/80">
    <path d="M20,70 Q20,50 50,50 Q80,50 80,70 L80,80 L20,80 Z M65,55 Q75,55 75,65" stroke="currentColor" strokeWidth="3" fill="none" />
    <path d="M45,60 L55,60" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export default function App() {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'searching' | 'connected' | 'offline'>('searching');
  const [showSettings, setShowSettings] = useState(false);
  const [lastPing, setLastPing] = useState('--:--');

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    if (saved) return JSON.parse(saved);
    return {
      myPhone: '', name: '', vacationMode: false, useCustomSchedule: false,
      activeDays: [0, 1, 2, 3, 4, 5, 6], startTime: '07:00', endTime: '08:30',
      contacts: [] as {name: string, phone: string}[], schedules: {} as any
    };
  });

  useEffect(() => {
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
    if (!activeUrl) return;
    const timer = setTimeout(() => {
      fetch(`${activeUrl}/save_settings`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(settings)
      }).catch(e => {});
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
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col relative overflow-hidden">
      <style>{`
        @keyframes z-bounce {
          0%, 100% { transform: translate(0,0); opacity: 0.2; }
          50% { transform: translate(10px, -15px); opacity: 1; }
        }
        .animate-z { animation: z-bounce 2s infinite ease-in-out; }
      `}</style>
      
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg shadow-sm shadow-orange-200"><Dog size={20} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-black italic tracking-tighter text-slate-800">BARKR</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? (settings.vacationMode ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-red-500'}`} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${status === 'connected' ? (settings.vacationMode ? 'text-blue-600' : 'text-emerald-600') : 'text-red-500'}`}>
                {status === 'offline' ? 'Geen verbinding' : settings.vacationMode ? 'Systeem in rust' : 'Barkr is waakzaam'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
          <Settings size={20} className="text-slate-600"/>
        </button>
      </header>

      {!showSettings && (
        <main className="flex-1 p-6 flex flex-col items-center justify-center space-y-12">
          <div className="flex flex-col items-center gap-4 w-full">
            <button 
              onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
              disabled={status !== 'connected'}
              className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center border transition-all duration-500 shadow-2xl active:scale-95 group overflow-hidden ${
                status !== 'connected' ? 'bg-slate-100 border-slate-200 opacity-60' :
                settings.vacationMode ? 'bg-slate-900 border-blue-900/30' : 'bg-orange-600 border-orange-400'
              }`}
            >
              {status !== 'connected' ? (
                <Wifi size={80} className="text-slate-400 animate-pulse"/>
              ) : settings.vacationMode ? (
                <div className="flex flex-col items-center pt-8">
                  <div className="absolute top-16 right-16 flex text-blue-300 font-black">
                    <span className="animate-z text-2xl">Z</span>
                    <span className="animate-z text-xl" style={{animationDelay:'0.4s'}}>z</span>
                    <span className="animate-z text-lg" style={{animationDelay:'0.8s'}}>z</span>
                  </div>
                  <SleepingDogIcon />
                  <span className="text-blue-200/60 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Wakker worden</span>
                </div>
              ) : (
                <div className="flex flex-col items-center pt-4">
                  <BarkingDogIcon />
                  <span className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em]">Tik om te slapen</span>
                </div>
              )}
            </button>

            {activeUrl && status === 'connected' && (
              <div className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase flex items-center gap-2 border shadow-sm ${
                settings.vacationMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-orange-600 border-orange-100'
              }`}>
                {activeUrl.includes('barkr') ? <Signal size={10}/> : <Wifi size={10}/>}
                {activeUrl.includes('barkr') ? '4G Verbinding' : 'Wifi Verbinding'}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 w-full max-w-[280px] text-center shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center justify-center gap-1">
               <Activity size={12}/> Laatste Controle
             </p>
             <p className="text-4xl font-black text-slate-800 tabular-nums tracking-tight">{lastPing}</p>
          </div>
        </main>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto animate-in slide-in-from-bottom-5">
          <header className="px-6 py-4 bg-white border-b sticky top-0 z-10 flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Barkr Setup</h2>
            <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
          </header>
          <div className="p-6 space-y-6 max-w-md mx-auto pb-20">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Actieve Dagen</label>
              <div className="flex justify-between gap-1">
                {DAYS.map((d, i) => (
                  <button key={d} onClick={() => {
                      const days = settings.activeDays.includes(i) ? settings.activeDays.filter(x=>x!==i) : [...settings.activeDays, i];
                      setSettings({...settings, activeDays: days});
                    }}
                    className={`h-11 w-11 rounded-xl text-xs font-bold transition-all ${settings.activeDays.includes(i) ? 'bg-orange-600 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}
                  >{d}</button>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-slate-800 text-sm">Slimme Planning</h3>
                 <button onClick={() => setSettings({...settings, useCustomSchedule: !settings.useCustomSchedule})} className={`w-12 h-7 rounded-full relative transition-colors ${settings.useCustomSchedule ? 'bg-orange-600' : 'bg-slate-300'}`}>
                   <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.useCustomSchedule ? 'translate-x-5' : ''}`}/>
                 </button>
              </div>
              {!settings.useCustomSchedule ? (
                <div className="grid grid-cols-2 gap-4">
                  <input type="time" value={settings.startTime} onChange={e=>setSettings({...settings, startTime:e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold"/>
                  <input type="time" value={settings.endTime} onChange={e=>setSettings({...settings, endTime:e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-red-600"/>
                </div>
              ) : (
                <div className="space-y-2">
                   {settings.activeDays.sort().map(d => (
                     <div key={d} className="flex justify-between items-center bg-white p-2 px-4 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold uppercase">{DAYS[d]}</span>
                        <input type="time" value={settings.schedules[d]?.endTime || settings.endTime} onChange={e=>{
                          setSettings({...settings, schedules: {...settings.schedules, [d]: {endTime:e.target.value}}});
                        }} className="text-xs font-bold text-red-600"/>
                     </div>
                   ))}
                </div>
              )}
            </div>
            <div className="space-y-4">
                <input type="text" value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-white font-bold" placeholder="Naam Gebruiker"/>
                <input type="tel" value={settings.myPhone} onChange={e=>setSettings({...settings, myPhone:autoFormatPhone(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-white font-mono" placeholder="Mobiel Nummer"/>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                 <label className="text-[10px] font-bold text-orange-600 uppercase">Noodcontacten</label>
                 <button onClick={()=>setSettings({...settings, contacts:[...settings.contacts, {name:'', phone:''}]})} className="bg-orange-600 text-white p-2 rounded-lg"><Plus size={16}/></button>
              </div>
              <div className="space-y-3">
                {settings.contacts.map((c, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                     <button onClick={()=> {const n=[...settings.contacts]; n.splice(i,1); setSettings({...settings, contacts:n})}} className="absolute top-4 right-4 text-slate-300"><Trash2 size={16}/></button>
                     <input placeholder="Naam" value={c.name} onChange={e=>{const n=[...settings.contacts]; n[i].name=e.target.value; setSettings({...settings, contacts:n})}} className="w-full font-bold text-sm mb-1 outline-none"/>
                     <input placeholder="Telefoon" value={c.phone} onChange={e=>{const n=[...settings.contacts]; n[i].phone=autoFormatPhone(e.target.value); setSettings({...settings, contacts:n})}} className="w-full font-mono text-xs text-slate-500 outline-none"/>
                     <button onClick={() => activeUrl && fetch(`${activeUrl}/test_contact`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(c)})} className="mt-3 bg-emerald-50 text-emerald-600 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"><ShieldCheck size={12}/> TEST VERBINDING</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}