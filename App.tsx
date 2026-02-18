import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Plus, Trash2, X, Info, Dog, Activity, Globe, ShieldCheck, Clock, User, Bell, ChevronRight, Calendar, HeartPulse } from 'lucide-react';

// --- CONFIGURATIE ---
const DEFAULT_URL = 'https://barkr.nl'; 

export default function App() {
  const [url, setUrl] = useState(() => localStorage.getItem('barkr_url') || DEFAULT_URL);
  const [status, setStatus] = useState<'SEARCHING' | 'CONNECTED' | 'ERROR'>('SEARCHING');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [lastPingTime, setLastPingTime] = useState('--:--');
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_full_v10');
    return saved ? JSON.parse(saved) : { 
      name: '', 
      vacationMode: false, 
      startTime: '09:00', 
      endTime: '21:00', 
      contacts: [], 
      activeDays: [0, 1, 2, 3, 4, 5, 6],
      useCustomSchedule: false,
      schedules: {}
    };
  });

  // 1. NETWERK MONITORING
  const checkConnection = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${url.replace(/\/$/, "")}/status`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) setStatus('CONNECTED');
      else setStatus('ERROR');
    } catch (e) {
      setStatus('ERROR');
    }
  }, [url]);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  // 2. WAAKZAAM ENGINE (PING LOOP)
  useEffect(() => {
    if (status !== 'CONNECTED' || settings.vacationMode || !settings.name) return;

    const sendPing = () => {
      // Signaal alleen verzenden als app op de voorgrond is
      if (document.visibilityState !== 'visible') return;

      fetch(`${url.replace(/\/$/, "")}/ping`, { method: 'POST' })
        .then(() => setLastPingTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })))
        .catch(() => setStatus('ERROR'));
    };

    sendPing();
    const interval = setInterval(sendPing, 5000);
    return () => clearInterval(interval);
  }, [status, url, settings.vacationMode, settings.name]);

  const handleSave = () => {
    localStorage.setItem('barkr_url', url);
    localStorage.setItem('barkr_full_v10', JSON.stringify(settings));
    
    fetch(`${url.replace(/\/$/, "")}/save_settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    }).catch(console.error);
    
    setShowSettings(false);
  };

  return (
    <div className={`max-w-md mx-auto min-h-screen font-sans flex flex-col transition-all duration-700 ${settings.vacationMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      
      {/* ANIMATIE DEFINITIES */}
      <style>{`
        @keyframes float-z { 0% { transform: translate(0,0); opacity: 0; } 50% { opacity: 1; } 100% { transform: translate(25px, -60px); opacity: 0; } }
        .z1 { animation: float-z 3s infinite; }
        .z2 { animation: float-z 3s infinite 1s; }
        .z3 { animation: float-z 3s infinite 2s; }
      `}</style>

      {/* BOVENBALK */}
      <header className={`px-6 py-5 border-b flex justify-between items-center sticky top-0 z-40 ${settings.vacationMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2.5 rounded-2xl shadow-lg shadow-orange-200"><Dog size={24} className="text-white" /></div>
          <div>
            <h1 className={`text-2xl font-black italic uppercase tracking-tighter ${settings.vacationMode ? 'text-white' : 'text-slate-800'}`}>Barkr</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status === 'CONNECTED' ? (settings.vacationMode ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-red-500'}`} />
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${settings.vacationMode ? 'text-blue-400' : (status === 'CONNECTED' ? 'text-emerald-600' : 'text-slate-400')}`}>
                {status !== 'CONNECTED' ? 'Offline' : (settings.vacationMode ? 'Rust' : 'Waakzaam')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className={`p-2.5 rounded-xl transition-all ${settings.vacationMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Info size={22}/></button>
          <button onClick={() => setShowSettings(true)} className={`p-2.5 rounded-xl transition-all ${settings.vacationMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Settings size={22}/></button>
        </div>
      </header>

      {/* DASHBOARD */}
      {!showSettings && !showManual && (
        <main className="flex-1 p-8 flex flex-col items-center justify-center space-y-16">
          <div className="relative">
            {settings.vacationMode && (
              <div className="absolute -top-16 -right-8 font-black text-blue-400 flex flex-col leading-none pointer-events-none">
                <span className="text-5xl z1">Z</span>
                <span className="text-3xl z2 ml-6">z</span>
                <span className="text-2xl z3 ml-12">z</span>
              </div>
            )}
            <button 
              onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
              className={`w-72 h-72 rounded-full border-[14px] shadow-2xl transition-all duration-1000 overflow-hidden relative group active:scale-95
                ${settings.vacationMode ? 'bg-slate-800 border-slate-700 shadow-blue-900/40' : 'bg-orange-600 border-white shadow-orange-200'}`}
            >
              <img src="/logo.png" className={`w-full h-full object-cover transition-all duration-1000 ${settings.vacationMode ? 'grayscale opacity-10 scale-125' : 'opacity-100 scale-100'}`} alt="Barkr" />
              <div className={`absolute bottom-8 left-0 right-0 text-center font-black uppercase tracking-[0.3em] text-[10px] text-white/60 transition-opacity ${settings.vacationMode ? 'opacity-0' : 'opacity-100'}`}>
                Tik om te slapen
              </div>
            </button>
          </div>

          <div className={`w-full max-w-sm p-8 rounded-[40px] border shadow-2xl transition-all duration-500 ${settings.vacationMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="flex flex-col items-center space-y-3">
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-500">
                <HeartPulse size={14} className={status === 'CONNECTED' && !settings.vacationMode ? 'animate-pulse text-emerald-500' : ''} />
                <span className="text-[10px] font-black uppercase tracking-widest">Laatste Controle</span>
              </div>
              <span className={`text-6xl font-black tracking-tighter ${settings.vacationMode ? 'text-slate-700' : 'text-slate-900'}`}>
                {settings.vacationMode ? '--:--' : lastPingTime}
              </span>
              <div className={`mt-4 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em]
                ${status === 'CONNECTED' && !settings.vacationMode ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                {status === 'CONNECTED' && !settings.vacationMode ? 'Beveiligd' : 'Geen Contact'}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* VOLLEDIGE HANDLEIDING */}
      {showManual && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto animate-in fade-in duration-300">
          <div className="max-w-md mx-auto p-8 space-y-10">
            <header className="flex justify-between items-center">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">Handleiding</h2>
              <button onClick={() => setShowManual(false)} className="p-3 bg-slate-100 rounded-full text-slate-500"><X size={24}/></button>
            </header>

            <div className="space-y-8">
              <section className="space-y-6">
                <div className="flex gap-5">
                  <div className="p-4 bg-orange-100 text-orange-600 rounded-[20px] h-fit"><ShieldCheck size={28}/></div>
                  <div className="space-y-2">
                    <h4 className="font-black text-lg text-slate-800">Welzijnsbewaking</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">De Barkr applicatie fungeert als een actieve monitoringsbron. Zolang de applicatie zichtbaar is op uw scherm, communiceert deze elke paar seconden met uw centrale server om uw status te bevestigen.</p>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="p-4 bg-blue-100 text-blue-600 rounded-[20px] h-fit"><Globe size={28}/></div>
                  <div className="space-y-2">
                    <h4 className="font-black text-lg text-slate-800">Cloud Connectiviteit</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">Door gebruik te maken van uw eigen domein (<b>barkr.nl</b>) is het systeem wereldwijd bereikbaar. Het schakelt naadloos tussen Wifi en mobiele data (4G/5G) zonder onderbreking van de bewaking.</p>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="p-4 bg-emerald-100 text-emerald-600 rounded-[20px] h-fit"><Bell size={28}/></div>
                  <div className="space-y-2">
                    <h4 className="font-black text-lg text-slate-800">Escalatie Protocol</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">Indien er gedurende een vooraf ingesteld tijdsvenster géén activiteit wordt waargenomen, zal de server aan het einde van dit venster automatisch de geconfigureerde contactpersonen alarmeren via WhatsApp.</p>
                  </div>
                </div>
              </section>

              <div className="bg-slate-900 p-8 rounded-[32px] text-white space-y-4 shadow-xl">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-orange-500 font-bold">Gebruikersinstructies</h4>
                <ul className="space-y-4 text-sm text-slate-400 font-medium">
                  <li className="flex gap-3"><ChevronRight size={16} className="text-orange-500 shrink-0"/> Zorg dat de app op de voorgrond blijft tijdens actieve bewakingsuren.</li>
                  <li className="flex gap-3"><ChevronRight size={16} className="text-orange-500 shrink-0"/> Gebruik de grote knop om tussen de <b>Waakzaam</b> en <b>Rust</b> (slaapstand) modus te schakelen.</li>
                  <li className="flex gap-3"><ChevronRight size={16} className="text-orange-500 shrink-0"/> Controleer de statusindicator bovenin voor een actieve verbinding.</li>
                </ul>
              </div>
            </div>
            
            <button onClick={() => setShowManual(false)} className="w-full py-5 bg-orange-600 text-white font-black uppercase rounded-3xl tracking-widest shadow-xl shadow-orange-100">Begrepen</button>
          </div>
        </div>
      )}

      {/* VOLLEDIGE INSTELLINGEN */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto animate-in slide-in-from-bottom duration-500">
          <div className="max-w-md mx-auto p-8 space-y-8 pb-24">
            <header className="flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Instellingen</h2>
              <button onClick={() => setShowSettings(false)} className="p-3 bg-white border rounded-full text-slate-300"><X size={24}/></button>
            </header>

            {/* SYSTEEM URL */}
            <div className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-100 space-y-5">
              <div className="flex items-center gap-2 text-slate-400 mb-2 font-bold uppercase text-[10px] tracking-widest">
                <Globe size={16}/> Systeemdomein
              </div>
              <input 
                value={url} 
                onChange={e => setUrl(e.target.value)}
                placeholder="https://..." 
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-mono text-sm focus:border-orange-200 outline-none transition-all"
              />
            </div>

            {/* GEBRUIKER & SCHEMA */}
            <div className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-100 space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">Naam Gebruiker</label>
                <div className="relative">
                  <User className="absolute left-4 top-4 text-slate-300" size={20} />
                  <input 
                    value={settings.name} 
                    onChange={e => setSettings({...settings, name: e.target.value})}
                    placeholder="Voer naam in..." 
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold focus:border-orange-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2 text-center">Start Bewaking</label>
                  <input 
                    type="time" 
                    value={settings.startTime} 
                    onChange={e => setSettings({...settings, startTime: e.target.value})}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-black text-center text-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-red-400 tracking-widest block mb-2 text-center">Deadline</label>
                  <input 
                    type="time" 
                    value={settings.endTime} 
                    onChange={e => setSettings({...settings, endTime: e.target.value})}
                    className="w-full p-4 bg-red-50/50 border-2 border-red-50 rounded-2xl font-black text-center text-lg text-red-600"
                  />
                </div>
              </div>
            </div>

            {/* CONTACTPERSONEN */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-4">
                <label className="text-[10px] font-black uppercase text-orange-600 tracking-widest flex items-center gap-2">
                  <Bell size={14} /> Alarm Ontvangers
                </label>
                <button 
                  onClick={() => setSettings({...settings, contacts: [...settings.contacts, {name: '', phone: ''}]})} 
                  className="p-2.5 bg-orange-600 text-white rounded-xl shadow-lg active:scale-90 transition-all"
                >
                  <Plus size={20}/>
                </button>
              </div>
              
              <div className="space-y-3">
                {settings.contacts.map((c, i) => (
                  <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative animate-in slide-in-from-right-4">
                    <button onClick={() => { const n = [...settings.contacts]; n.splice(i, 1); setSettings({...settings, contacts: n}) }} className="absolute top-5 right-5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                    <div className="space-y-3 mt-2">
                      <input 
                        placeholder="Naam Contact" 
                        value={c.name} 
                        onChange={e => { const n = [...settings.contacts]; n[i].name = e.target.value; setSettings({...settings, contacts: n}) }}
                        className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold outline-none"
                      />
                      <input 
                        placeholder="0612345678" 
                        value={c.phone} 
                        onChange={e => { const n = [...settings.contacts]; n[i].phone = e.target.value; setSettings({...settings, contacts: n}) }}
                        className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-mono outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTIEVE DAGEN */}
            <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-4 flex items-center gap-2 font-bold"><Calendar size={14}/> Actieve Dagen</label>
               <div className="flex justify-between">
                 {['M','D','W','D','V','Z','Z'].map((d, i) => (
                   <button 
                     key={i}
                     onClick={() => {
                        const days = [...settings.activeDays];
                        if(days.includes(i)) days.splice(days.indexOf(i), 1);
                        else days.push(i);
                        setSettings({...settings, activeDays: days});
                     }}
                     className={`w-9 h-9 rounded-full text-[10px] font-black transition-all ${settings.activeDays.includes(i) ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}
                   >
                     {d}
                   </button>
                 ))}
               </div>
            </div>

            <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white font-black uppercase rounded-[28px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all">Configuratie Opslaan</button>
          </div>
        </div>
      )}
    </div>
  );
}
