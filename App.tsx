import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Calendar, Wifi, Signal, 
  Dog, Activity, Moon, ShieldCheck 
} from 'lucide-react';

// --- CONFIGURATIE ---
const ENDPOINTS = [
  'http://192.168.1.38:5000',  // 1. Wifi (Local IP van je Pi)
  'https://barkr.nl'           // 2. 4G / Tunnel
];

// Dagen van de week
const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

// Telefoonnummer formatter
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

  // Instellingen laden/opslaan
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    if (saved) return JSON.parse(saved);
    return {
      myPhone: '', name: '', vacationMode: false, useCustomSchedule: false,
      activeDays: [0, 1, 2, 3, 4, 5, 6], startTime: '07:00', endTime: '08:30',
      contacts: [] as {name: string, phone: string}[], schedules: {} as any
    };
  });

  // Auto-save naar Pi & LocalStorage
  useEffect(() => {
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
    if (!activeUrl) return;
    const timer = setTimeout(() => {
      fetch(`${activeUrl}/save_settings`, {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(settings)
      }).catch(e => console.error("Save error:", e));
    }, 800);
    return () => clearTimeout(timer);
  }, [settings, activeUrl]);

  // Verbinding zoeken
  const findConnection = useCallback(async () => {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          const data = await res.json();
          setActiveUrl(url);
          setStatus('connected');
          // Update lokale settings als de Pi nieuwere data heeft
          if (data.settings && data.settings.name) {
             // Optioneel: setSettings(data.settings);
          }
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

  const getStatusText = () => {
    if (status === 'offline') return 'Geen verbinding';
    if (status === 'searching') return 'Zoeken...';
    return settings.vacationMode ? 'Systeem in rust' : 'Barkr is waakzaam';
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      
      {/* HEADER */}
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg shadow-sm shadow-orange-200">
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

      {/* DASHBOARD */}
      {!showSettings && (
        <main className="flex-1 p-6 flex flex-col items-center justify-start pt-16 space-y-12">
          
          <button 
            onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
            disabled={status !== 'connected'}
            className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center border-[8px] transition-all duration-500 shadow-2xl active:scale-95 group ${
              status !== 'connected' ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' :
              settings.vacationMode 
                ? 'bg-slate-800 border-slate-600' 
                : 'bg-orange-600 border-orange-400' 
            }`}
          >
            {status !== 'connected' ? (
              <div className="flex flex-col items-center animate-pulse">
                <Wifi size={80} className="text-slate-400 mb-2"/>
                <span className="text-xs font-bold text-slate-400 uppercase">Verbinding zoeken...</span>
              </div>
            ) : settings.vacationMode ? (
              <>
                <Moon size={80} className="text-blue-200 mb-2" strokeWidth={1.5} />
                <div className="absolute top-20 right-20 flex font-black text-blue-200">
                  <span className="text-2xl animate-bounce" style={{animationDelay: '0s'}}>Z</span>
                  <span className="text-xl animate-bounce" style={{animationDelay: '0.2s'}}>z</span>
                </div>
                <span className="text-sm font-black uppercase text-blue-200 tracking-widest mt-2">Systeem Uit</span>
              </>
            ) : (
              <>
                 <div className="relative">
                    <Dog size={120} className="text-white drop-shadow-md" strokeWidth={2} />
                    <Signal size={40} className="text-white absolute -top-4 -right-8 animate-pulse" strokeWidth={3}/>
                 </div>
                <span className="text-sm font-black uppercase text-white tracking-widest mt-6">Tik om te pauzeren</span>
              </>
            )}

            {activeUrl && (
              <div className={`absolute -bottom-6 px-5 py-2 rounded-full text-[10px] font-bold uppercase flex items-center gap-2 shadow-lg border ${
                settings.vacationMode 
                  ? 'bg-slate-900 text-slate-400 border-slate-700' 
                  : 'bg-white text-orange-600 border-orange-100'
              }`}>
                {activeUrl.includes('barkr') ? <Signal size={12}/> : <Wifi size={12}/>}
                {activeUrl.includes('barkr') ? '4G Verbinding' : 'Wifi Verbinding'}
              </div>
            )}
          </button>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 w-full max-w-xs text-center shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center justify-center gap-1">
               <Activity size={12}/> Laatste Controle
             </p>
             <p className="text-4xl font-black text-slate-800 tabular-nums tracking-tight">{lastPing}</p>
          </div>
        </main>
      )}

      {/* SETUP SCHERM (Instellingen) */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto animate-in slide-in-from-bottom-5">
          <header className="px-6 py-4 bg-white border-b sticky top-0 z-10 flex justify-between items-center shadow-sm">
            <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Barkr Setup</h2>
            <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20}/></button>
          </header>

          <div className="p-6 space-y-6 max-w-md mx-auto pb-20">
            
            {/* DAGEN SELECTIE */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block"><Calendar size={10} className="inline mr-1"/> Actieve Dagen</label>
              <div className="flex justify-between gap-1">
                {DAYS.map((d, i) => (
                  <button key={d} onClick={() => {
                      const days = settings.activeDays.includes(i) ? settings.activeDays.filter(x=>x!==i) : [...settings.activeDays, i];
                      setSettings({...settings, activeDays: days});
                    }}
                    className={`h-11 w-11 rounded-xl text-xs font-bold transition-all ${settings.activeDays.includes(i) ? 'bg-orange-600 text-white shadow-md shadow-orange-200' : 'bg-white border border-slate-200 text-slate-400'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* TIJDSCHEMA */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                 <div>
                   <h3 className="font-bold text-slate-800 text-sm">Slimme Planning</h3>
                   <p className="text-[10px] text-slate-400">Afwijkende tijden per dag?</p>
                 </div>
                 <button onClick={() => setSettings({...settings, useCustomSchedule: !settings.useCustomSchedule})} className={`w-12 h-7 rounded-full relative transition-colors ${settings.useCustomSchedule ? 'bg-orange-600' : 'bg-slate-200'}`}>
                   <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.useCustomSchedule ? 'translate-x-5' : ''}`}/>
                 </button>
              </div>

              {!settings.useCustomSchedule ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase">Start Bewaking</label>
                     <input type="time" value={settings.startTime} onChange={e=>setSettings({...settings, startTime:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700"/>
                  </div>
                  <div>
                     <label className="text-[10px] font-bold text-red-400 uppercase">Deadline</label>
                     <input type="time" value={settings.endTime} onChange={e=>setSettings({...settings, endTime:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-red-600"/>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                   {settings.activeDays.sort().map(d => (
                     <div key={d} className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase text-orange-800 flex items-center gap-2"><Calendar size={12}/> {DAYS[d]}</span>
                        <input type="time" value={settings.schedules[d]?.endTime || settings.endTime} onChange={e=>{
                          const s = {...settings.schedules, [d]: {...settings.schedules[d], endTime:e.target.value}};
                          setSettings({...settings, schedules: s});
                        }} className="bg-white px-2 py-1 rounded border border-orange-200 text-xs font-bold text-red-600"/>
                     </div>
                   ))}
                </div>
              )}
            </div>

            {/* PERSOONSGEGEVENS */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Naam Gebruiker</label>
                <input type="text" value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-white font-bold" placeholder="Naam"/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Mobiel Gebruiker</label>
                <input type="tel" value={settings.myPhone} onChange={e=>setSettings({...settings, myPhone:autoFormatPhone(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-white font-mono text-slate-600" placeholder="06..."/>
              </div>
            </div>

            {/* NOODCONTACTEN */}
            <div>
              <div className="flex justify-between items-center mb-2">
                 <label className="text-[10px] font-bold text-orange-600 uppercase">Noodcontacten</label>
                 <button onClick={()=>setSettings({...settings, contacts:[...settings.contacts, {name:'', phone:''}]})} className="bg-orange-600 text-white p-2 rounded-lg shadow-md shadow-orange-200"><Plus size={16}/></button>
              </div>
              <div className="space-y-3">
                {settings.contacts.map((c, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                     <button onClick={()=> {const n=[...settings.contacts]; n.splice(i,1); setSettings({...settings, contacts:n})}} className="absolute top-4 right-4 text-slate-300"><Trash2 size={16}/></button>
                     <div className="space-y-2 pr-6">
                        <input placeholder="Naam Contact" value={c.name} onChange={e=>{const n=[...settings.contacts]; n[i].name=e.target.value; setSettings({...settings, contacts:n})}} className="w-full font-bold text-sm outline-none bg-transparent"/>
                        <input placeholder="Telefoonnummer" value={c.phone} onChange={e=>{const n=[...settings.contacts]; n[i].phone=autoFormatPhone(e.target.value); setSettings({...settings, contacts:n})}} className="w-full font-mono text-xs text-slate-500 outline-none bg-transparent"/>
                     </div>
                     <button onClick={() => {
                         if(activeUrl) fetch(`${activeUrl}/test_contact`, {
                           method:'POST', 
                           headers:{'Content-Type':'application/json'}, 
                           body:JSON.stringify(c)
                         });
                       }} className="mt-3 bg-emerald-50 text-emerald-600 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1.5 w-fit hover:bg-emerald-100 transition-colors">
                       <ShieldCheck size={12}/> TEST VERBINDING
                     </button>
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