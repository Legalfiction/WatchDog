import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldCheck, Activity, Settings, Plus, Trash2, X, 
  Battery, User, Calendar, Plane, Phone 
} from 'lucide-react';

// --- CONFIGURATIE ---
const ENDPOINTS = [
  'http://94.157.47.162:5000', // Publiek
  'http://192.168.1.38:5000'   // Lokaal
];

const DOG_ICON = (
  <svg width="40" height="40" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="100" fill="#EA580C"/>
    <path d="M368 160C336 160 304 192 288 224L240 192L160 160C128 160 96 192 96 224C96 256 128 288 160 288L240 320L288 384C304 416 336 448 368 448C400 448 432 416 432 384C432 352 400 320 368 320H288L368 160Z" fill="white"/>
    <path d="M160 224C149.4 224 140 214.6 140 204C140 193.4 149.4 184 160 184C170.6 184 180 193.4 180 204C180 214.6 170.6 224 160 224Z" fill="#EA580C"/>
  </svg>
);

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

// Hulpfunctie: 06 naar +316
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
  
  // --- STATE MET LOCALSTORAGE BACKUP (Data verdwijnt nooit meer) ---
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v11_data');
    if (saved) return JSON.parse(saved);
    return {
      myPhone: '', name: '', vacationMode: false, useCustomSchedule: false,
      activeDays: [0, 1, 2, 3, 4, 5, 6], startTime: '07:00', endTime: '08:30',
      contacts: [], schedules: {}
    };
  });

  // --- AUTO-SAVE LOGICA ---
  // Dit zorgt ervoor dat elke wijziging na 1 seconde automatisch naar de Pi gaat
  useEffect(() => {
    localStorage.setItem('barkr_v11_data', JSON.stringify(settings));
    
    if (!activeUrl) return;
    
    const timer = setTimeout(() => {
      fetch(`${activeUrl}/save_settings`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(settings),
        mode: 'cors'
      }).catch(e => console.log("Save failed silent"));
    }, 800); // 800ms vertraging voor rust

    return () => clearTimeout(timer);
  }, [settings, activeUrl]);

  // --- CONNECTIE ZOEKEN ---
  const findConnection = useCallback(async () => {
    let connected = false;
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(`${url}/status`, { 
          mode: 'cors',
          signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(1500) : undefined 
        });
        if (res.ok) {
          setActiveUrl(url);
          setStatus('connected');
          connected = true;
          // Ping direct bij verbinding
          fetch(`${url}/ping`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(settings),
            mode: 'cors'
          }).catch(() => {});
          
          setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
          break;
        }
      } catch (e) {}
    }
    if (!connected) {
      setStatus('offline');
      setActiveUrl(null);
    }
  }, [settings]);

  useEffect(() => {
    findConnection();
    const interval = setInterval(findConnection, 5000);
    return () => clearInterval(interval);
  }, [findConnection]);

  // --- UI ---
  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      
      {/* HEADER */}
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {DOG_ICON}
          <div>
            <h1 className="text-lg font-black italic tracking-tighter text-slate-800">BARKR</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${status === 'connected' ? 'text-emerald-600' : 'text-red-500'}`}>
                {status === 'connected' ? 'Verbonden' : 'Geen Verbinding'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 active:scale-95 transition-transform">
          <Settings size={20} className="text-slate-600"/>
        </button>
      </header>

      {/* DASHBOARD */}
      {!showSettings && (
        <main className="p-6 flex flex-col items-center space-y-6">
          
          {/* Status Ring */}
          <div className={`relative w-48 h-48 rounded-full flex items-center justify-center border-[8px] transition-all shadow-xl ${status === 'connected' ? 'bg-orange-50 border-orange-500' : 'bg-white border-slate-200'}`}>
            {status === 'connected' ? <ShieldCheck size={80} className="text-orange-600"/> : <Activity size={80} className="text-slate-300 animate-pulse"/>}
            {settings.vacationMode && (
              <div className="absolute inset-0 bg-white/90 rounded-full flex flex-col items-center justify-center z-10">
                <Plane size={40} className="text-blue-500 mb-2"/>
                <span className="text-xs font-black uppercase text-blue-600">Vakantiemodus</span>
              </div>
            )}
          </div>

          <div className="text-center">
             <p className="text-xs font-bold text-slate-400 uppercase">Laatste Check</p>
             <p className="text-3xl font-black text-slate-800 tabular-nums">{lastPing}</p>
          </div>

          {/* Snel Actie: Vakantie */}
          <div className="w-full bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
             <div className="flex items-center gap-3">
               <div className={`p-2 rounded-lg ${settings.vacationMode ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                 <Plane size={20}/>
               </div>
               <div>
                 <p className="font-bold text-sm">Vakantiemodus</p>
                 <p className="text-[10px] text-slate-400">Pauzeer alle alarmen</p>
               </div>
             </div>
             <button 
               onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
               className={`w-12 h-7 rounded-full transition-colors relative ${settings.vacationMode ? 'bg-blue-500' : 'bg-slate-200'}`}
             >
               <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.vacationMode ? 'translate-x-5' : ''}`}/>
             </button>
          </div>
        </main>
      )}

      {/* SETTINGS SCHERM */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto">
          <header className="px-6 py-4 bg-white border-b sticky top-0 z-10 flex justify-between items-center">
            <h2 className="text-xl font-black">Instellingen</h2>
            <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
          </header>

          <div className="p-6 space-y-8">
            {/* Persoonsgegevens */}
            <section className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Jouw Naam</label>
                <input 
                  type="text" value={settings.name} 
                  onChange={e => setSettings({...settings, name: e.target.value})}
                  className="w-full p-4 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-orange-500 outline-none bg-white" placeholder="Naam"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Jouw 06-Nummer</label>
                <input 
                  type="tel" value={settings.myPhone} 
                  onChange={e => setSettings({...settings, myPhone: autoFormatPhone(e.target.value)})}
                  className="w-full p-4 rounded-xl border border-slate-200 font-mono text-lg tracking-wider focus:ring-2 focus:ring-orange-500 outline-none bg-white" 
                  placeholder="06..."
                />
                <p className="text-[10px] text-slate-400 mt-1 ml-1">Wordt automatisch omgezet naar +316</p>
              </div>
            </section>

            {/* Dagen & Tijd */}
            <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-black uppercase mb-4 flex items-center gap-2"><Calendar size={14}/> Bewakingsrooster</h3>
              <div className="flex justify-between gap-1 mb-6">
                {DAYS.map((d, i) => (
                  <button 
                    key={d} 
                    onClick={() => {
                      const days = settings.activeDays.includes(i) ? settings.activeDays.filter(x => x!==i) : [...settings.activeDays, i];
                      setSettings({...settings, activeDays: days});
                    }}
                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${settings.activeDays.includes(i) ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-slate-100 text-slate-400'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Start</label>
                   <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border border-slate-200"/>
                </div>
                <div>
                   <label className="text-[10px] font-bold text-red-400 uppercase">Deadline</label>
                   <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border border-slate-200 text-red-600"/>
                </div>
              </div>
            </section>

            {/* Contacten */}
            <section>
              <div className="flex justify-between items-center mb-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase">Noodcontacten</label>
                 <button onClick={() => setSettings({...settings, contacts: [...settings.contacts, {name:'', phone:''}]})} className="bg-orange-100 text-orange-700 p-2 rounded-lg active:scale-95 transition-transform"><Plus size={18}/></button>
              </div>
              <div className="space-y-3">
                {settings.contacts.map((c, i) => (
                  <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 flex gap-2 items-center shadow-sm">
                    <div className="flex-1 space-y-2">
                      <input placeholder="Naam" value={c.name} onChange={e => {
                        const n = [...settings.contacts]; n[i].name = e.target.value; setSettings({...settings, contacts: n});
                      }} className="w-full text-sm font-bold outline-none"/>
                      <input placeholder="06..." value={c.phone} onChange={e => {
                        const n = [...settings.contacts]; n[i].phone = autoFormatPhone(e.target.value); setSettings({...settings, contacts: n});
                      }} className="w-full text-xs font-mono text-slate-500 outline-none"/>
                    </div>
                    <button onClick={() => {
                      if(activeUrl) fetch(`${activeUrl}/test_contact`, {
                        method:'POST', 
                        headers:{'Content-Type':'application/json'}, 
                        body:JSON.stringify(c),
                        mode: 'cors'
                      }).then(() => alert('Test verstuurd naar ' + c.name)).catch(() => alert('Verzenden mislukt'));
                    }} className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded">TEST</button>
                    <button onClick={() => {
                       const n = settings.contacts.filter((_, idx) => idx !== i); setSettings({...settings, contacts: n});
                    }} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                  </div>
                ))}
                {settings.contacts.length === 0 && (
                  <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs bg-white">
                    Nog geen noodcontacten toegevoegd.
                  </div>
                )}
              </div>
            </section>
            
            <div className="text-center text-[10px] text-slate-400 pt-10 pb-4">
              Wijzigingen worden automatisch opgeslagen op je Pi
            </div>
          </div>
        </div>
      )}
    </div>
  );
}