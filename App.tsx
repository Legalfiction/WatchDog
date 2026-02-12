import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, Activity, Settings, Plus, Trash2, X, 
  Battery, Wifi, Signal, Smartphone, Calendar, User, Clock 
} from 'lucide-react';

// --- CONFIGURATIE ---
const ENDPOINTS = [
  'http://94.157.47.162:5000', // Publiek (4G)
  'http://192.168.1.38:5000'   // Lokaal (Wi-Fi)
];

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

export default function App() {
  // --- STATE ---
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'searching' | 'connected' | 'offline'>('searching');
  const [showSettings, setShowSettings] = useState(false);
  const [lastPing, setLastPing] = useState<string>('--:--');
  const [battery, setBattery] = useState(100);

  // Instellingen Object
  const [settings, setSettings] = useState({
    myPhone: '',
    name: '',
    vacationMode: false,
    useCustomSchedule: false,
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    startTime: '07:00',
    endTime: '08:30',
    schedules: {
      0: { startTime: '07:00', endTime: '08:30' },
      1: { startTime: '07:00', endTime: '08:30' },
      2: { startTime: '07:00', endTime: '08:30' },
      3: { startTime: '07:00', endTime: '08:30' },
      4: { startTime: '07:00', endTime: '08:30' },
      5: { startTime: '09:00', endTime: '10:00' },
      6: { startTime: '09:00', endTime: '10:00' }
    } as Record<number, { startTime: string; endTime: string }>,
    contacts: [] as { name: string; phone: string }[]
  });

  // --- CONNECTIE INTELLIGENTIE ---
  const findConnection = useCallback(async () => {
    // Sequentiële check om console 'Failed to fetch' ruis te minimaliseren
    let winner = null;
    
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
          winner = url;
          break; 
        }
      } catch (e) {
        // Stille fail voor individuele checks
      }
    }
    
    if (winner) {
      setActiveUrl(winner);
      setStatus('connected');
      pingServer(winner);
    } else {
      setStatus('offline');
      setActiveUrl(null);
    }
  }, [settings, battery]);

  // Ping Functie
  const pingServer = async (url: string) => {
    if (!url) return;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      await fetch(`${url}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: settings.myPhone, battery, ...settings }),
        mode: 'cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      setLastPing(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      // Stille fail bij ping
    }
  };

  // Instellingen Opslaan
  const saveSettings = async () => {
    if (!activeUrl) return alert("Geen verbinding met basisstation!");
    try {
      const res = await fetch(`${activeUrl}/save_settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        mode: 'cors'
      });
      if (res.ok) {
        setShowSettings(false);
      } else {
        alert("Server weigerde de instellingen.");
      }
    } catch (e) { 
      alert("Kon verbinding niet voltooien."); 
    }
  };

  // Test Contact
  const testContact = async (contact: {name: string, phone: string}) => {
    if (!activeUrl) return;
    try {
      await fetch(`${activeUrl}/test_contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact),
        mode: 'cors'
      });
      alert(`Test verstuurd naar ${contact.name}`);
    } catch (e) {
      alert("Test verzenden mislukt.");
    }
  };

  // Lifecycle
  useEffect(() => {
    findConnection();
    const interval = setInterval(() => {
        if (activeUrl) pingServer(activeUrl);
        else findConnection();
    }, 10000);
    return () => clearInterval(interval);
  }, [activeUrl, findConnection]);

  // --- UI RENDER ---
  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* HOME DASHBOARD */}
      {!showSettings && (
        <>
          <header className="p-6 flex justify-between items-center bg-white border-b border-slate-100">
            <div>
               <h1 className="text-xl font-black italic tracking-tight text-orange-600">BARKR</h1>
               <div className="flex items-center gap-2 mt-1">
                 <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                   {status === 'connected' ? 'Systeem Actief' : 'Zoeken...'}
                 </span>
               </div>
            </div>
            <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition">
              <Settings size={20} className="text-slate-600" />
            </button>
          </header>

          <main className="p-6 flex flex-col items-center space-y-8 mt-4">
            <div className={`relative w-48 h-48 rounded-full flex items-center justify-center border-[6px] shadow-2xl transition-all duration-700 ${status === 'connected' ? 'bg-orange-50 border-orange-500' : 'bg-white border-slate-200'}`}>
               {status === 'connected' ? (
                 <ShieldCheck size={80} className="text-orange-600" strokeWidth={1.5} />
               ) : (
                 <Activity size={80} className="text-slate-300 animate-pulse" strokeWidth={1.5} />
               )}
               
               {activeUrl && (
                 <div className="absolute -bottom-4 bg-slate-800 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-2 shadow-lg">
                   {activeUrl.includes('192.168') ? <Wifi size={12}/> : <Signal size={12}/>}
                   {activeUrl.includes('192.168') ? 'Wifi Mode' : '4G Mode'}
                 </div>
               )}
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Laatste Levensteken</p>
              <p className="text-4xl font-black text-slate-800 tabular-nums tracking-tight">{lastPing}</p>
            </div>
            
            <div className="flex gap-4 w-full">
               <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
                  <Battery size={24} className="text-emerald-500 mb-2"/>
                  <span className="text-lg font-bold">{battery}%</span>
                  <span className="text-[10px] text-slate-400 uppercase">Batterij</span>
               </div>
               <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
                  <User size={24} className="text-blue-500 mb-2"/>
                  <span className="text-lg font-bold">{settings.contacts.length}</span>
                  <span className="text-[10px] text-slate-400 uppercase">Contacten</span>
               </div>
            </div>
          </main>
        </>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto pb-32">
          <header className="p-6 bg-white border-b sticky top-0 z-10 flex justify-between items-center shadow-sm">
            <h2 className="text-xl font-black text-slate-800">BARKR <span className="text-slate-400 font-normal">SETUP</span></h2>
            <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
          </header>

          <div className="p-6 space-y-8">
            <section>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Calendar size={12}/> Bewakingsdagen
              </h3>
              <div className="flex justify-between gap-1">
                {DAYS.map((day, i) => (
                  <button 
                    key={day}
                    onClick={() => {
                       const newDays = settings.activeDays.includes(i) 
                         ? settings.activeDays.filter(d => d !== i)
                         : [...settings.activeDays, i];
                       setSettings({...settings, activeDays: newDays});
                    }}
                    className={`h-10 w-10 rounded-lg text-xs font-bold transition-all ${
                      settings.activeDays.includes(i) 
                      ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' 
                      : 'bg-white border border-slate-200 text-slate-400'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
               <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="font-bold text-slate-800">Slimme Planning</h3>
                   <p className="text-xs text-slate-400">Verschillende tijden per dag instellen</p>
                 </div>
                 <button 
                   onClick={() => setSettings({...settings, useCustomSchedule: !settings.useCustomSchedule})}
                   className={`w-12 h-7 rounded-full transition-colors relative ${settings.useCustomSchedule ? 'bg-orange-600' : 'bg-slate-200'}`}
                 >
                   <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full transition-transform ${settings.useCustomSchedule ? 'translate-x-5' : ''}`}/>
                 </button>
               </div>

               {!settings.useCustomSchedule ? (
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase">Standaard Start</label>
                     <input type="time" value={settings.startTime} onChange={e=>setSettings({...settings, startTime:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 rounded-xl font-bold border border-slate-200"/>
                   </div>
                   <div>
                     <label className="text-[10px] font-bold text-red-400 uppercase">Standaard Deadline</label>
                     <input type="time" value={settings.endTime} onChange={e=>setSettings({...settings, endTime:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 rounded-xl font-bold border border-slate-200 text-red-600"/>
                   </div>
                 </div>
               ) : (
                 <div className="space-y-4">
                   {DAYS.map((day, i) => (
                     settings.activeDays.includes(i) && (
                       <div key={day} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                         <div className="flex items-center gap-2 mb-2">
                           <Calendar size={12} className="text-orange-600"/>
                           <span className="text-xs font-bold uppercase">{day === 'Zo' || day === 'Za' ? day + ' (Weekend)' : day}</span>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                           <input type="time" value={settings.schedules[i]?.endTime || '08:30'} onChange={(e) => {
                             const newSched = {...settings.schedules};
                             newSched[i] = { ...newSched[i], endTime: e.target.value };
                             setSettings({...settings, schedules: newSched});
                           }} className="p-2 rounded-lg text-xs font-bold border border-slate-200 text-red-600 w-full"/>
                         </div>
                       </div>
                     )
                   ))}
                 </div>
               )}
            </section>

            <section className="space-y-4">
               <div>
                 <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Jouw Naam</label>
                 <input 
                   type="text" 
                   value={settings.name} 
                   onChange={e => setSettings({...settings, name: e.target.value})}
                   className="w-full mt-1 p-4 bg-white border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-orange-500 outline-none" 
                   placeholder="Naam gebruiker"
                 />
               </div>
               <div>
                 <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Mijn Mobiel (Bewaakt Nummer)</label>
                 <input 
                   type="tel" 
                   value={settings.myPhone} 
                   onChange={e => setSettings({...settings, myPhone: e.target.value})}
                   className="w-full mt-1 p-4 bg-white border border-slate-200 rounded-2xl font-mono text-slate-600 focus:ring-2 focus:ring-orange-500 outline-none" 
                   placeholder="+316..."
                 />
               </div>
            </section>

            <section>
               <div className="flex justify-between items-end mb-3">
                 <label className="text-[10px] font-bold text-orange-600 uppercase">Noodcontacten</label>
                 <button 
                   onClick={() => setSettings({...settings, contacts: [...settings.contacts, {name: '', phone: ''}]})}
                   className="bg-orange-600 text-white p-2 rounded-xl shadow-lg shadow-orange-200 active:scale-95 transition-transform"
                 >
                   <Plus size={20}/>
                 </button>
               </div>
               
               <div className="space-y-3">
                 {settings.contacts.map((contact, index) => (
                   <div key={index} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm relative">
                      <button onClick={() => {
                        const newC = settings.contacts.filter((_, i) => i !== index);
                        setSettings({...settings, contacts: newC});
                      }} className="absolute top-4 right-4 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                      
                      <div className="space-y-3 pr-8">
                        <div>
                          <label className="text-[10px] font-bold text-slate-300 uppercase">Naam</label>
                          <input type="text" value={contact.name} onChange={e => {
                            const newC = [...settings.contacts]; newC[index].name = e.target.value;
                            setSettings({...settings, contacts: newC});
                          }} className="w-full font-bold text-slate-700 outline-none placeholder:text-slate-200" placeholder="Naam"/>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-300 uppercase">Nummer</label>
                          <div className="flex gap-2">
                            <input type="tel" value={contact.phone} onChange={e => {
                              const newC = [...settings.contacts]; newC[index].phone = e.target.value;
                              setSettings({...settings, contacts: newC});
                            }} className="flex-1 font-mono text-sm outline-none placeholder:text-slate-200" placeholder="+316..."/>
                            <button onClick={() => testContact(contact)} className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase">Test</button>
                          </div>
                        </div>
                      </div>
                   </div>
                 ))}
                 {settings.contacts.length === 0 && (
                   <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 text-xs">
                     Nog geen noodcontacten toegevoegd.
                   </div>
                 )}
               </div>
            </section>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
             <button onClick={saveSettings} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl active:scale-[0.98] transition-transform">
               Instellingen Opslaan
             </button>
          </div>
        </div>
      )}
    </div>
  );
}