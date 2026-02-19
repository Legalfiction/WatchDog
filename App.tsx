import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Activity, ShieldCheck, Dog, Clock, Info, ExternalLink, Mail, AlertTriangle, Wifi, Smartphone, BellRing, HeartPulse
} from 'lucide-react';

const ENDPOINTS = ['https://barkr.nl', 'http://192.168.1.38:5000'];
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
      name: '', vacationMode: false, useCustomSchedule: false,
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

  useEffect(() => {
    if (status !== 'connected' || !activeUrl || settings.vacationMode) return;

    const sendPing = () => {
      if (document.visibilityState === 'visible') {
        fetch(`${activeUrl}/ping`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: settings.name, secret: 'BARKR_SECURE_V1' })
        })
        .then(res => {
          if(res.ok) setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
        })
        .catch(() => {});
      }
    };

    if (document.visibilityState === 'visible') sendPing();
    const pingInterval = setInterval(sendPing, 5000); 
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') sendPing();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(pingInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, activeUrl, settings.vacationMode, settings.name]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <style>{`
        @keyframes bounce-zz { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-15px); opacity: 1; } }
        .animate-zz { animation: bounce-zz 2.5s infinite ease-in-out; }
      `}</style>
      
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg shadow-sm"><Dog size={20} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-black italic tracking-tighter text-slate-800 uppercase">Barkr</h1>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? (settings.vacationMode ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-red-500'}`} />
              <span className={status === 'connected' ? (settings.vacationMode ? 'text-blue-600' : 'text-emerald-600') : 'text-red-500'}>
                {status === 'offline' ? 'Geen verbinding' : status === 'searching' ? 'Zoeken...' : settings.vacationMode ? 'Systeem in rust' : 'Barkr is waakzaam'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><Info size={20} className="text-slate-600"/></button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><Settings size={20} className="text-slate-600"/></button>
        </div>
      </header>

      {!showSettings && !showManual && (
        <main className="flex-1 p-6 flex flex-col items-center justify-start pt-16 space-y-12">
          <div className="flex flex-col items-center gap-8 w-full">
            <button 
              onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
              disabled={status !== 'connected'}
              className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl overflow-hidden border-[10px] ${
                status !== 'connected' ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' : 
                settings.vacationMode ? 'bg-slate-900 border-slate-700' : 'bg-orange-600 border-orange-700'
              }`}
            >
              {status !== 'connected' ? (
                <Wifi size={80} className="text-slate-400 animate-pulse"/>
              ) : settings.vacationMode ? (
                <div className="flex flex-col items-center justify-center relative w-full h-full">
                  <div className="absolute top-16 right-20 flex font-black text-blue-300 pointer-events-none z-10">
                    <span className="text-3xl animate-zz">Z</span><span className="text-2xl animate-zz ml-1">z</span><span className="text-xl animate-zz ml-1">z</span>
                  </div>
                  <img src="/logo.png" alt="Barkr Logo" className="w-full h-full object-cover scale-[1.02] opacity-40 grayscale" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full relative">
                   <img src="/logo.png" alt="Barkr Logo" className="w-full h-full object-cover scale-[1.02] drop-shadow-xl" />
                   <div className="absolute bottom-6 inset-x-0 text-center">
                      <span className="text-[11px] font-black uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] tracking-widest text-center px-4 leading-tight">Tik om te slapen</span>
                   </div>
                </div>
              )}
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 w-full max-w-xs text-center shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest"><Activity size={12} className="inline mr-1"/> Systeem Hartslag</p>
             <p className="text-4xl font-black text-slate-800 tabular-nums">{lastPing}</p>
          </div>
        </main>
      )}

      {showManual && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-8 pb-20">
          {/* Header is nu NIET meer sticky en scrollt mee */}
          <header className="flex justify-between items-center py-2">
            <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-800">Handleiding</h2>
            <button onClick={() => setShowManual(false)} className="p-2 bg-white rounded-full shadow-md border border-slate-100"><X size={24}/></button>
          </header>

          <section className="bg-blue-600 p-6 rounded-[32px] text-white shadow-lg space-y-3 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-20"><Smartphone size={100}/></div>
            <h4 className="font-black flex items-center gap-2 uppercase text-xs tracking-[0.15em]">
              <AlertTriangle size={18} className="text-orange-400"/> Belangrijk: Opstarten
            </h4>
            <p className="text-sm leading-relaxed font-bold">
              In deze huidige fase dient de applicatie eenmalig handmatig opgestart te worden om de bewaking te activeren.
            </p>
            <p className="text-[13px] opacity-90 leading-relaxed">
              Zodra de app in beeld is, mag deze op de achtergrond blijven draaien. In de nabije toekomst zal dit proces volledig automatisch verlopen.
            </p>
          </section>

          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-black text-orange-600 flex items-center gap-2 uppercase text-xs tracking-[0.15em]">
              <Dog size={20}/> De betekenis van Barkr
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              <strong>Barkr</strong> is afgeleid van het Engelse 'Barker' (blaffer). Het staat voor een trouwe digitale <strong>waakhond</strong> die over je waakt wanneer je alleen bent. Barkr slaat alarm wanneer er iets niet pluis is.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-2">
              <HeartPulse size={14}/> Waarom deze applicatie?
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-2 shadow-sm">
                <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Smartphone size={16} className="text-orange-500"/> Welzijnsbewaking</h5>
                <p className="text-xs text-slate-500 leading-relaxed">Speciaal voor mensen die alleen wonen of werken. Barkr biedt een vangnet zonder inbreuk op je privacy.</p>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-2 shadow-sm">
                <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2"><BellRing size={16} className="text-orange-500"/> Automatische Escalatie</h5>
                <p className="text-xs text-slate-500 leading-relaxed">Bij inactiviteit tijdens je tijdvenster worden je noodcontacten direct per WhatsApp geïnformeerd.</p>
              </div>
            </div>
          </section>

          <section className="bg-orange-50 p-7 rounded-[40px] border border-orange-200 space-y-5">
            <h4 className="font-black text-orange-800 flex items-center gap-2 uppercase text-xs tracking-widest">
              <Clock size={20}/> Hoe gebruik je Barkr?
            </h4>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs">1</div>
                <div><p className="text-sm font-bold text-orange-900">Configuratie</p><p className="text-xs text-orange-800/70">Voer je naam in en stel je venster in (bijv. 07:00 - 08:30). Voeg minimaal één noodcontact toe.</p></div>
              </div>
              <div className="flex gap-4">
                <div className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs">2</div>
                <div><p className="text-sm font-bold text-orange-900">Zichtbaarheid</p><p className="text-xs text-orange-800/70">Houd de app geopend op je scherm tijdens het venster. Het systeem registreert dan je aanwezigheid.</p></div>
              </div>
              <div className="flex gap-4">
                <div className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs">3</div>
                <div><p className="text-sm font-bold text-orange-900">Deadline</p><p className="text-xs text-orange-800/70">Zodra de deadline is bereikt, staakt Barkr de bewaking voor die dag. Geen signaal? Dan volgt het alarm.</p></div>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 p-8 rounded-[40px] text-white space-y-6 shadow-2xl">
            <h4 className="font-black flex items-center gap-2 uppercase text-xs tracking-widest text-orange-400">
              <ExternalLink size={18}/> Informatie & Support
            </h4>
            <div className="space-y-4">
              <a href="https://www.barkr.nl" target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 active:scale-95 transition-all">
                <div className="bg-orange-600 p-2 rounded-xl"><Wifi size={18} className="text-white"/></div>
                <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Website</span><span className="font-bold text-sm">www.barkr.nl</span></div>
              </a>
              <a href="mailto:info@barkr.nl" className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 active:scale-95 transition-all">
                <div className="bg-blue-600 p-2 rounded-xl"><Mail size={18} className="text-white"/></div>
                <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Email</span><span className="font-bold text-sm">info@barkr.nl</span></div>
              </a>
            </div>
          </section>

          <button onClick={() => setShowManual(false)} className="w-full py-5 bg-orange-600 text-white font-black uppercase rounded-3xl tracking-widest shadow-lg active:scale-95 transition-all">Sluiten</button>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20">
          <header className="flex justify-between items-center mb-4"><h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">Barkr Setup</h2><button onClick={() => setShowSettings(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button></header>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div><label className="text-[10px] font-bold text-slate-400 uppercase">Naam Gebruiker</label><input value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700"/></div>
            <div className="flex justify-between items-center pt-2"><div><h3 className="font-bold text-slate-800 text-sm italic uppercase tracking-tighter">Slimme Planning</h3><p className="text-[10px] text-slate-400 uppercase font-bold text-center">Vensters per dag</p></div><button onClick={() => setSettings({...settings, useCustomSchedule: !settings.useCustomSchedule})} className={`w-12 h-7 rounded-full relative transition-colors ${settings.useCustomSchedule ? 'bg-orange-600' : 'bg-slate-200'}`}><div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.useCustomSchedule ? 'translate-x-5' : ''}`}/></button></div>
            {!settings.useCustomSchedule ? (
              <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-slate-400 uppercase">Start</label><input type="time" value={settings.startTime} onChange={e=>setSettings({...settings, startTime:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700"/></div><div><label className="text-[10px] font-bold text-red-400 uppercase">Deadline</label><input type="time" value={settings.endTime} onChange={e=>setSettings({...settings, endTime:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-red-600"/></div></div>
            ) : (
              <div className="space-y-3">{settings.activeDays.sort().map(d => (<div key={d} className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 space-y-2"><span className="text-xs font-black uppercase text-orange-800 block border-b border-orange-100 pb-1">{DAYS[d]}</span><div className="grid grid-cols-2 gap-3"><div><p className="text-[9px] font-bold text-slate-400 uppercase">Start</p><input type="time" value={settings.schedules[d]?.startTime || settings.startTime} onChange={e=>{setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], startTime:e.target.value}}})}} className="w-full bg-white px-2 py-1.5 rounded-lg border border-orange-200 text-xs font-bold text-slate-700 text-center"/></div><div><p className="text-[9px] font-bold text-red-400 uppercase">Deadline</p><input type="time" value={settings.schedules[d]?.endTime || settings.endTime} onChange={e=>{setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], endTime:e.target.value}}})}} className="w-full bg-white px-2 py-1.5 rounded-lg border border-orange-200 text-xs font-bold text-red-600 text-center"/></div></div></div>))}</div>
            )}
          </div>
          <div><label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block mb-2 px-1">Contacten</label><button onClick={()=>setSettings({...settings, contacts:[...settings.contacts, {name:'', phone:''}]})} className="w-full bg-orange-600 text-white p-3 rounded-xl shadow-md flex justify-center mb-4"><Plus size={20}/></button>
            <div className="space-y-4">{settings.contacts.map((c, i) => (<div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative space-y-4"><button onClick={()=> {const n=[...settings.contacts]; n.splice(i,1); setSettings({...settings, contacts:n})}} className="absolute top-4 right-4 text-slate-300"><Trash2 size={18}/></button><div><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Naam</label><input placeholder="Naam" value={c.name} onChange={e=>{const n=[...settings.contacts]; n[i].name=e.target.value; setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none"/></div><div><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Telefoonnummer</label><input placeholder="06..." value={c.phone} onChange={e=>{const n=[...settings.contacts]; n[i].phone=autoFormatPhone(e.target.value); setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-mono text-slate-600 outline-none"/></div><button onClick={() => activeUrl && fetch(`${activeUrl}/test_contact`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(c)})} className="w-full bg-emerald-50 text-emerald-600 text-[10px] font-black py-2 rounded-lg border border-emerald-100 flex items-center justify-center gap-2"><ShieldCheck size={14}/> TEST VERBINDING</button></div>))}</div>
          </div>
          <button onClick={() => setShowSettings(false)} className="w-full py-5 bg-slate-900 text-white font-black uppercase rounded-[28px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all">Configuratie Opslaan</button>
        </div>
      )}
    </div>
  );
}
