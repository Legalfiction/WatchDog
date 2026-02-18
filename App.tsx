import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Plus, Trash2, X, Info, Dog, Activity, Globe, ShieldCheck, Clock, User, Heart } from 'lucide-react';

// --- CONFIGURATIE ---
const DEFAULT_URL = 'https://barkr.nl'; 

export default function App() {
  const [url, setUrl] = useState(() => localStorage.getItem('barkr_url') || DEFAULT_URL);
  const [status, setStatus] = useState<'SEARCHING' | 'CONNECTED' | 'ERROR'>('SEARCHING');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [lastPingTime, setLastPingTime] = useState('--:--');
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v9_data');
    return saved ? JSON.parse(saved) : { 
      name: 'Sven Brouwers', 
      vacationMode: false, 
      startTime: '09:00', 
      endTime: '21:00', 
      contacts: [], 
      activeDays: [0, 1, 2, 3, 4, 5, 6] 
    };
  });

  // 1. VERBINDING CONTROLE
  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/status`, { signal: AbortSignal.timeout(3000) });
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

  // 2. REALTIME PING LOGICA
  useEffect(() => {
    if (status !== 'CONNECTED' || settings.vacationMode || !settings.name) return;

    const sendPing = () => {
      // Alleen pingen als app zichtbaar is (bespaart data/batterij)
      if (document.visibilityState !== 'visible') return;

      fetch(`${url.replace(/\/$/, "")}/ping`, { method: 'POST' })
        .then(() => setLastPingTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })))
        .catch(() => setStatus('ERROR'));
    };

    sendPing();
    const interval = setInterval(sendPing, 4000); // 4 seconden interval
    return () => clearInterval(interval);
  }, [status, url, settings.vacationMode, settings.name]);

  // 3. OPSLAAN
  const handleSave = () => {
    localStorage.setItem('barkr_url', url);
    localStorage.setItem('barkr_v9_data', JSON.stringify(settings));
    
    // Sync met Pi
    fetch(`${url.replace(/\/$/, "")}/save_settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    }).catch(console.error);
    
    setShowSettings(false);
  };

  return (
    <div className={`max-w-md mx-auto min-h-screen font-sans flex flex-col transition-colors duration-500 ${settings.vacationMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      
      {/* CSS VOOR ANIMATIES */}
      <style>{`
        @keyframes z-float { 0%, 100% { transform: translateY(0) translateX(0); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-40px) translateX(20px); opacity: 0; } }
        .animate-z1 { animation: z-float 3s infinite; }
        .animate-z2 { animation: z-float 3s infinite 1s; }
        .animate-z3 { animation: z-float 3s infinite 2s; }
      `}</style>

      {/* HEADER */}
      <header className={`px-6 py-4 border-b flex justify-between items-center sticky top-0 z-30 ${settings.vacationMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-xl shadow-lg shadow-orange-200"><Dog size={24} className="text-white" /></div>
          <div>
            <h1 className={`text-xl font-black italic uppercase tracking-tighter ${settings.vacationMode ? 'text-white' : 'text-slate-800'}`}>Barkr</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${settings.vacationMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {status === 'CONNECTED' ? 'Systeem Online' : 'Geen Verbinding'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className={`p-2 rounded-xl border ${settings.vacationMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600'}`}><Info size={20}/></button>
          <button onClick={() => setShowSettings(true)} className={`p-2 rounded-xl border ${settings.vacationMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600'}`}><Settings size={20}/></button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      {!showSettings && !showManual && (
        <main className="flex-1 p-8 flex flex-col items-center justify-center space-y-12">
          
          {/* DE GROTE KNOP */}
          <div className="relative">
            {settings.vacationMode && (
              <div className="absolute -top-12 -right-4 font-black text-blue-400 flex flex-col leading-none">
                <span className="text-4xl animate-z1">Z</span>
                <span className="text-2xl animate-z2 ml-4">z</span>
                <span className="text-xl animate-z3 ml-8">z</span>
              </div>
            )}
            
            <button 
              onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
              className={`w-72 h-72 rounded-full border-[12px] shadow-2xl transition-all duration-700 overflow-hidden relative group active:scale-95
                ${settings.vacationMode ? 'bg-slate-800 border-slate-700 shadow-blue-900/20' : 'bg-orange-600 border-white shadow-orange-200'}`}
            >
              <img 
                src="/logo.png" 
                className={`w-full h-full object-cover transition-all duration-1000 ${settings.vacationMode ? 'grayscale opacity-20 scale-110' : 'opacity-100 scale-100'}`}
                alt="Barkr" 
              />
              <div className={`absolute inset-0 flex items-center justify-center font-black uppercase tracking-widest text-white text-xs bg-black/10 transition-opacity ${settings.vacationMode ? 'opacity-100' : 'opacity-0'}`}>
                Slaapstand Actief
              </div>
            </button>
          </div>

          {/* STATUS KAART */}
          <div className={`w-full max-w-xs p-6 rounded-3xl border shadow-xl transition-all ${settings.vacationMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="flex flex-col items-center text-center space-y-2">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${settings.vacationMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <Activity size={12} className="inline mr-1 mb-0.5" /> Laatste Signaal
              </span>
              <span className={`text-5xl font-black ${settings.vacationMode ? 'text-slate-600' : 'text-slate-800'}`}>
                {settings.vacationMode ? '--:--' : lastPingTime}
              </span>
              <div className={`mt-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest
                ${status === 'CONNECTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {settings.name} is {status === 'CONNECTED' && !settings.vacationMode ? 'Beveiligd' : 'Niet Actief'}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* HELP / HANDLEIDING MODAL */}
      {showManual && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto p-6 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-sm mx-auto space-y-8 pb-12">
            <header className="flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Handleiding</h2>
              <button onClick={() => setShowManual(false)} className="p-3 bg-slate-100 rounded-full text-slate-400"><X size={24}/></button>
            </header>

            <section className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl"><ShieldCheck /></div>
                <div>
                  <h4 className="font-bold text-slate-800">Hoe het werkt</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">Barkr houdt toezicht op Sven door continu een digitaal signaal ("ping") naar de Raspberry Pi te sturen via de <b>barkr.nl</b> tunnel. Als het signaal binnen het window wegvalt, wordt er alarm geslagen.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Globe size={24}/></div>
                <div>
                  <h4 className="font-bold text-slate-800">Wifi & 5G</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">Dankzij de Cloudflare tunnel werkt dit overal ter wereld. Of Sven nu op de groep is bij Binnenhof 6 of op de dagbesteding bij Zonnewoud, de verbinding blijft actief.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl"><Clock size={24}/></div>
                <div>
                  <h4 className="font-bold text-slate-800">Tijdsvensters</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">Het alarm gaat alleen af na de ingestelde <b>Deadline</b>, mits er gedurende het hele venster geen enkele activiteit is gemeten.</p>
                </div>
              </div>
            </section>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <h4 className="text-xs font-black uppercase text-slate-400 mb-4">Belangrijke Contacten</h4>
              <div className="space-y-3 text-xs font-bold text-slate-600">
                <div className="flex justify-between"><span>Teammanager (Ivette)</span><Heart size={14} className="text-red-400"/></div>
                <div className="flex justify-between"><span>Gedragskundige (Sharon)</span><Heart size={14} className="text-red-400"/></div>
                <div className="flex justify-between"><span>Zonnewoud (Suus/Sandra)</span><Heart size={14} className="text-red-400"/></div>
              </div>
            </div>
            
            <button onClick={() => setShowManual(false)} className="w-full py-4 bg-slate-900 text-white font-black uppercase rounded-2xl tracking-widest">Begrepen</button>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-sm mx-auto space-y-6 pb-20">
            <header className="flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800">Instellingen</h2>
              <button onClick={() => setShowSettings(false)} className="p-3 bg-white border rounded-full text-slate-400"><X size={24}/></button>
            </header>

            {/* TUNNEL URL */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Systeem URL</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 text-slate-300" size={18} />
                  <input 
                    value={url} 
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://barkr.nl" 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-2xl font-mono text-xs focus:ring-2 ring-orange-100 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* GEBRUIKER & TIJDEN */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Naam Gebruiker</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-slate-300" size={18} />
                  <input 
                    value={settings.name} 
                    onChange={e => setSettings({...settings, name: e.target.value})}
                    placeholder="Naam" 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-2xl font-bold focus:ring-2 ring-orange-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Start Bewaking</label>
                  <input 
                    type="time" 
                    value={settings.startTime} 
                    onChange={e => setSettings({...settings, startTime: e.target.value})}
                    className="w-full p-3 bg-slate-50 border rounded-2xl font-bold text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-red-400 tracking-widest block mb-1">Deadline</label>
                  <input 
                    type="time" 
                    value={settings.endTime} 
                    onChange={e => setSettings({...settings, endTime: e.target.value})}
                    className="w-full p-3 bg-slate-50 border rounded-2xl font-bold text-center text-red-600 border-red-50"
                  />
                </div>
              </div>
            </div>

            {/* CONTACTEN */}
            <div className="space-y-4">
              <div className="flex justify-between items-end px-2">
                <label className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Alarm Contacten</label>
                <button onClick={() => setSettings({...settings, contacts: [...settings.contacts, {name: '', phone: ''}]})} className="p-2 bg-orange-600 text-white rounded-lg shadow-lg shadow-orange-100"><Plus size={16}/></button>
              </div>
              
              {settings.contacts.map((c, i) => (
                <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative space-y-4 animate-in fade-in zoom-in duration-200">
                  <button onClick={() => { const n = [...settings.contacts]; n.splice(i, 1); setSettings({...settings, contacts: n}) }} className="absolute top-4 right-4 text-slate-300 hover:text-red-400"><Trash2 size={16}/></button>
                  <div>
                    <input 
                      placeholder="Naam Contact" 
                      value={c.name} 
                      onChange={e => { const n = [...settings.contacts]; n[i].name = e.target.value; setSettings({...settings, contacts: n}) }}
                      className="w-full bg-slate-50 border rounded-xl p-3 text-sm font-bold outline-none"
                    />
                  </div>
                  <div>
                    <input 
                      placeholder="Telefoonnummer" 
                      value={c.phone} 
                      onChange={e => { const n = [...settings.contacts]; n[i].phone = e.target.value; setSettings({...settings, contacts: n}) }}
                      className="w-full bg-slate-50 border rounded-xl p-3 text-sm font-mono outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleSave} className="w-full py-5 bg-orange-600 text-white font-black uppercase rounded-3xl tracking-[0.2em] shadow-2xl shadow-orange-200 mt-6 active:scale-95 transition-transform">Instellingen Opslaan</button>
          </div>
        </div>
      )}
    </div>
  );
}
