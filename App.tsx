import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, Activity, Settings, Plus, Trash2, X, 
  Battery, Calendar, Plane, Wifi, Signal, User, Phone 
} from 'lucide-react';

// --- CONFIGURATIE ---
const ENDPOINTS = [
  'https://barkr.nl',          // <--- JOUW WERKENDE LINK (Cloudflare Tunnel)
  'http://192.168.1.38:5000'   // Lokaal (Wi-Fi backup)
];

const DOG_ICON = (
  <svg width="32" height="32" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="100" fill="#EA580C"/>
    <path d="M368 160C336 160 304 192 288 224L240 192L160 160C128 160 96 192 96 224C96 256 128 288 160 288L240 320L288 384C304 416 336 448 368 448C400 448 432 416 432 384C432 352 400 320 368 320H288L368 160Z" fill="white"/>
    <path d="M160 224C149.4 224 140 214.6 140 204C140 193.4 149.4 184 160 184C170.6 184 180 193.4 180 204C180 214.6 170.6 224 160 224Z" fill="#EA580C"/>
  </svg>
);

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

// Hulpfunctie: Zet 06... om naar +316...
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
  const [batteryLevel, setBatteryLevel] = useState(100);

  // --- STATE (Met automatische opslag in telefoon-geheugen) ---
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v12_data');
    if (saved) return JSON.parse(saved);
    return {
      myPhone: '', 
      name: '', 
      vacationMode: false, 
      useCustomSchedule: false,
      activeDays: [0, 1, 2, 3, 4, 5, 6], 
      startTime: '07:00', 
      endTime: '08:30',
      contacts: [] as {name: string, phone: string}[], 
      schedules: {} as Record<number, {startTime: string, endTime: string}>
    };
  });

  // --- AUTO-SAVE NAAR PI ---
  useEffect(() => {
    localStorage.setItem('barkr_v12_data', JSON.stringify(settings));
    
    if (!activeUrl) return;
    
    // Wacht 800ms na typen voordat we sturen (debounce)
    const timer = setTimeout(() => {
      fetch(`${activeUrl}/save_settings`, {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(settings),
        mode: 'cors'
      }).catch(e => console.log("Save failed silent"));
    }, 800);

    return () => clearTimeout(timer);
  }, [settings, activeUrl]);

  // --- INTELLIGENTE VERBINDING (Silent Failover) ---
  const findConnection = useCallback(async () => {
    // We proberen NIET te resetten naar 'searching' als we al verbonden zijn, 
    // tenzij de check faalt. Dit voorkomt knipperen.
    
    for (const url of ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        
        const res = await fetch(`${url}/status`, { 
          mode: 'cors',
          signal: controller.signal 
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          setActiveUrl(url);
          setStatus('connected');
          
          // Stuur direct een ping als we verbinding hebben
          fetch(`${url}/ping`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({...settings, battery: batteryLevel}),
            mode: 'cors'
          }).catch(() => {});
          
          setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
          return; // Stop zodra we een werkende verbinding hebben
        }
      } catch (e) {
        // Probeer volgende endpoint
      }
    }
    // Als geen enkele endpoint werkt:
    setStatus('offline');
    setActiveUrl(null);
  }, [settings, batteryLevel]);

  useEffect(() => {
    findConnection(); // Direct bij start
    const interval = setInterval(findConnection, 5000); // Herhaal elke 5 sec
    return () => clearInterval(interval);
  }, [findConnection]);

  // --- UI RENDER ---
  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      
      {/* HEADER */}
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          {DOG_ICON}
          <div>
            <h1 className="text-lg font-black italic tracking-tighter text-slate-800">BARKR</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${status === 'connected' ? 'text-emerald-600' : 'text-red-500'}`}>
                {status === 'connected' ? 'Systeem Actief' : 'Zoeken...'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
          <Settings size={20} className="text-slate-600"/>
        </button>
      </header>

      {/* DASHBOARD (Hoofdscherm) */}
      {!showSettings && (
        <main className="flex-1 p-6 flex flex-col items-center justify-center space-y-8">
          
          {/* Status Cirkel */}
          <div className={`relative w-64 h-64 rounded-full flex items-center justify-center border-[8px] transition-all duration-700 shadow-2xl ${
            settings.vacationMode 
              ? 'bg-blue-50 border-blue-400' 
              : status === 'connected' 
                ? 'bg-orange-50 border-orange-500' 
                : 'bg-white border-slate-200'
          }`}>
            
            {settings.vacationMode ? (
              <div className="flex flex-col items-center animate-pulse">
                <Plane size={80} className="text-blue-500 mb-2"/>
                <span className="text-xs font-black uppercase text-blue-600 tracking-widest">Vakantiemodus</span>
              </div>
            ) : status === 'connected' ? (
              <ShieldCheck size={100} className="text-orange-600" strokeWidth={1.5}/>
            ) : (
              <Activity size={100} className="text-slate-300 animate-pulse"/>
            )}

            {/* Verbindingstype Label */}
            {activeUrl && !settings.vacationMode && (
              <div className="absolute -bottom-5 bg-slate-800 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-2 shadow-lg">
                {activeUrl.includes('barkr.nl') ? <Signal size={12}/> : <Wifi size={12}/>}
                {activeUrl.includes('barkr.nl') ? '4G / Extern' : 'Thuis Wifi'}
              </div>
            )}
          </div>

          {/* Info Kaarten */}
          <div className="grid grid-cols-2 gap-4 w-full">
             <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Laatste Check</p>
                <p className="text-2xl font-black text-slate-800 tabular-nums">{lastPing}</p>
             </div>
             <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</p>
                <p className={`text-sm font-black uppercase mt-1 ${settings.vacationMode ? 'text-blue-500' : 'text-emerald-500'}`}>
                  {settings.vacationMode ? 'Gepauzeerd' : 'Bewaking Aan'}
                </p>
             </div>
          </div>
        </main>
      )}

      {/* SETUP / INSTELLINGEN MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto animate-in slide-in-from-bottom-10">
          <header className="px-6 py-4 bg-white border-b sticky top-0 z-10 flex justify-between items-center shadow-sm">
            <h2 className="text-xl font-black text-slate-800">Barkr Setup</h2>
            <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-transform active:scale-95"><X size={20}/></button>
          </header>

          <div className="p-6 space-y-8">
            
            {/* 1. VAKANTIEMODUS */}
            <section className={`p-5 rounded-2xl border flex justify-between items-center transition-all ${settings.vacationMode ? 'bg-blue-50 border-blue-200 shadow-md' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${settings.vacationMode ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <Plane size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Vakantiemodus</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Zet bewaking tijdelijk uit</p>
                </div>
              </div>
              <button 
                onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
                className={`w-14 h-8 rounded-full transition-colors relative ${settings.vacationMode ? 'bg-blue-500' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${settings.vacationMode ? 'translate-x-6' : ''}`}/>
              </button>
            </section>

            {/* 2. GEGEVENS */}
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 ml-1">Gebruiker</h3>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="flex items-center px-4 py-1 border-b border-slate-100">
                  <User size={16} className="text-slate-400 mr-3"/>
                  <input 
                    type="text" value={settings.name} 
                    onChange={e => setSettings({...settings, name: e.target.value})}
                    className="w-full py-4 bg-transparent font-bold outline-none text-sm" 
                    placeholder="Naam"
                  />
                </div>
                <div className="flex items-center px-4 py-1">
                  <Phone size={16} className="text-slate-400 mr-3"/>
                  <input 
                    type="tel" value={settings.myPhone} 
                    onChange={e => setSettings({...settings, myPhone: autoFormatPhone(e.target.value)})}
                    className="w-full py-4 bg-transparent font-mono text-slate-600 outline-none text-sm" 
                    placeholder="06-nummer (wordt +31)"
                  />
                </div>
              </div>
            </section>

            {/* 3. ROOSTER */}
            <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xs font-black uppercase flex items-center gap-2"><Calendar size={14}/> Bewakingsrooster</h3>
                 
                 {/* Slimme Planning Toggle */}
                 <div className="flex items-center gap-2">
                   <span className="text-[10px] font-bold text-slate-400">Slimme Planning</span>
                   <button 
                     onClick={() => setSettings({...settings, useCustomSchedule: !settings.useCustomSchedule})}
                     className={`w-8 h-5 rounded-full relative transition-colors ${settings.useCustomSchedule ? 'bg-orange-600' : 'bg-slate-200'}`}
                   >
                     <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.useCustomSchedule ? 'translate-x-3' : ''}`}/>
                   </button>
                 </div>
              </div>

              {/* Dagen Selectie */}
              <div className="flex justify-between gap-1 mb-6">
                {DAYS.map((d, i) => (
                  <button 
                    key={d} 
                    onClick={() => {
                      const days = settings.activeDays.includes(i) ? settings.activeDays.filter(x => x!==i) : [...settings.activeDays, i];
                      setSettings({...settings, activeDays: days});
                    }}
                    className={`flex-1 h-9 rounded-lg text-[10px] font-bold transition-all ${settings.activeDays.includes(i) ? 'bg-orange-600 text-white shadow-md shadow-orange-100' : 'bg-slate-50 text-slate-400'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Tijden */}
              {!settings.useCustomSchedule ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase">Standaard Start</label>
                     <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-none ring-1 ring-slate-200 mt-1 focus:ring-2 focus:ring-orange-500 outline-none"/>
                  </div>
                  <div>
                     <label className="text-[10px] font-bold text-red-400 uppercase">Standaard Deadline</label>
                     <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-none ring-1 ring-slate-200 text-red-600 mt-1 focus:ring-2 focus:ring-orange-500 outline-none"/>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                   {settings.activeDays.sort().map(dayIdx => (
                     <div key={dayIdx} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                       <span className="font-bold w-10">{DAYS[dayIdx]}</span>
                       <input type="time" 
                         value={settings.schedules[dayIdx]?.endTime || settings.endTime} 
                         onChange={e => {
                           const newSched = {...settings.schedules, [dayIdx]: {...settings.schedules[dayIdx], endTime: e.target.value}};
                           setSettings({...settings, schedules: newSched});
                         }}
                         className="bg-slate-50 rounded p-1 text-red-600 font-bold focus:ring-1 focus:ring-orange-500 outline-none"
                       />
                     </div>
                   ))}
                </div>
              )}
            </section>

            {/* 4. CONTACTEN */}
            <section>
              <div className="flex justify-between items-center mb-2 px-1">
                 <label className="text-xs font-black uppercase text-slate-400">Noodcontacten</label>
                 <button onClick={() => setSettings({...settings, contacts: [...settings.contacts, {name:'', phone:''}]})} className="bg-orange-100 text-orange-700 p-1.5 rounded-lg hover:bg-orange-200 active:scale-95 transition-transform"><Plus size={18}/></button>
              </div>
              <div className="space-y-3">
                {settings.contacts.map((c, i) => (
                  <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 flex gap-3 items-center shadow-sm">
                    <div className="flex-1 space-y-1">
                      <input placeholder="Naam Contact" value={c.name} onChange={e => {
                        const n = [...settings.contacts]; n[i].name = e.target.value; setSettings({...settings, contacts: n});
                      }} className="w-full text-sm font-bold outline-none"/>
                      <input placeholder="06..." value={c.phone} onChange={e => {
                        const n = [...settings.contacts]; n[i].phone = autoFormatPhone(e.target.value); setSettings({...settings, contacts: n});
                      }} className="w-full text-xs font-mono text-slate-400 outline-none"/>
                    </div>
                    <div className="flex flex-col gap-2">
                       <button onClick={() => {
                         if(activeUrl) fetch(`${activeUrl}/test_contact`, {
                            method:'POST', 
                            headers:{'Content-Type':'application/json'}, 
                            body:JSON.stringify(c),
                            mode: 'cors'
                         }).then(() => alert('Test verstuurd')).catch(() => alert('Fout bij test'));
                       }} className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded border border-emerald-100 active:scale-95 transition-transform">TEST</button>
                       <button onClick={() => {
                          const n = settings.contacts.filter((_, idx) => idx !== i); setSettings({...settings, contacts: n});
                       }} className="text-slate-300 hover:text-red-500 self-center transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
                {settings.contacts.length === 0 && (
                   <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-[10px] font-bold uppercase bg-white">
                     Geen contacten
                   </div>
                )}
              </div>
            </section>
            
            <div className="text-center text-[10px] text-slate-400 pt-6 pb-10">
              Wijzigingen worden automatisch opgeslagen
            </div>
          </div>
        </div>
      )}
    </div>
  );
}