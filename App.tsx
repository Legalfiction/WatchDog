import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Calendar, Wifi, Signal, 
  Activity, ShieldCheck, Dog, Clock, Info, ExternalLink, AlertTriangle, Globe
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
      myPhone: '', name: '', vacationMode: false, useCustomSchedule: false,
      activeDays: [0, 1, 2, 3, 4, 5, 6], startTime: '07:00', endTime: '08:30',
      contacts: [], schedules: {}
    };
  });

  // 1. Automatisch opslaan van instellingen naar de Pi
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

  // 2. Verbinding zoeken (Wifi & 5G Tunnel)
  const findConnection = useCallback(async () => {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(2000) });
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
    const interval = setInterval(findConnection, 10000);
    return () => clearInterval(interval);
  }, [findConnection]);

  // --- DE ACHTERGROND MOTOR (WEB WORKER) ---
  // Dit zorgt ervoor dat de ping doorgaat, ook als de app op de achtergrond draait.
  useEffect(() => {
    if (status !== 'connected' || !activeUrl || settings.vacationMode || !settings.name) return;

    const workerCode = `
      let interval;
      self.onmessage = function(e) {
        if (e.data.action === 'start') {
          clearInterval(interval);
          interval = setInterval(() => {
            fetch(e.data.url + '/ping', { method: 'POST', mode: 'no-cors' })
              .then(() => self.postMessage('pinged'))
              .catch(() => {});
          }, 5000);
        } else {
          clearInterval(interval);
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = () => {
      setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
    };

    worker.postMessage({ action: 'start', url: activeUrl });

    return () => {
      worker.postMessage({ action: 'stop' });
      worker.terminate();
    };
  }, [status, activeUrl, settings.vacationMode, settings.name]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <style>{`
        @keyframes bounce-zz {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-15px); opacity: 1; }
        }
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
                    <span className="text-3xl animate-zz" style={{animationDelay: '0s'}}>Z</span>
                    <span className="text-2xl animate-zz ml-1" style={{animationDelay: '0.4s'}}>z</span>
                    <span className="text-xl animate-zz ml-1" style={{animationDelay: '0.8s'}}>z</span>
                  </div>
                  <img src="/logo.png" alt="Barkr Logo" className="w-full h-full object-cover scale-[1.02] opacity-40 grayscale" />
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
                    <span className="text-xs font-black uppercase text-blue-100 tracking-widest mt-24">Wakker worden</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full relative">
                   <img src="/logo.png" alt="Barkr Logo" className="w-full h-full object-cover scale-[1.02] drop-shadow-xl" />
                   <div className="absolute bottom-6 inset-x-0 text-center">
                      <span className="text-[11px] font-black uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] tracking-widest">Tik om te slapen</span>
                   </div>
                </div>
              )}
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 w-full max-w-xs text-center shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest"><Activity size={12} className="inline mr-1"/> Laatste Controle</p>
             <p className="text-4xl font-black text-slate-800 tabular-nums">{lastPing}</p>
          </div>
        </main>
      )}

      {showManual && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-8 pb-20">
          <header className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black uppercase italic tracking-tighter">Handleiding</h2><button onClick={() => setShowManual(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button></header>
          
          <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl"><ShieldCheck size={24}/></div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Welzijnsbewaking</h4>
                <p className="text-sm text-slate-500 leading-relaxed">Barkr fungeert als een actieve monitor. Zolang de applicatie in het geheugen van uw toestel aanwezig is, communiceert deze met de centrale server om uw status te bevestigen.</p>
              </div>
            </div>
          </section>

          <section className="bg-orange-50 p-6 rounded-[32px] border border-orange-200 space-y-3">
            <h4 className="font-black text-orange-800 flex items-center gap-2 uppercase text-xs tracking-widest"><Clock size={18}/> Alarm Logica</h4>
            <p className="text-sm text-orange-900 leading-relaxed font-medium">Als het toestel niet is geactiveerd tijdens het ingestelde tijdswindow, wordt er na het verstrijken van de <b>Deadline</b> automatisch een WhatsApp-bericht verstuurd naar de contacten.</p>
          </section>

          <section className="bg-blue-50 p-6 rounded-[32px] border border-blue-200 space-y-3">
            <h4 className="font-black text-blue-800 flex items-center gap-2 uppercase text-xs tracking-widest"><Globe size={18}/> Overal verbonden</h4>
            <p className="text-sm text-blue-900 leading-relaxed font-medium">Dankzij de Cloudflare Tunnel (barkr.nl) werkt de bewaking naadloos op Wifi, 4G en 5G. U hoeft zelf geen netwerkinstellingen aan te passen.</p>
          </section>

          <section className="bg-slate-800 p-8 rounded-[32px] text-white space-y-4 shadow-xl">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Gebruikersinstructies</h4>
            <ul className="space-y-4 text-sm text-slate-400 font-medium">
              <li className="flex gap-3 text-xs leading-relaxed">Zorg dat de app minimaal één keer is opgestart en in de achtergrond blijft draaien.</li>
              <li className="flex gap-3 text-xs leading-relaxed">Gebruik de <b>Systeem in rust</b> modus (klik op de hond) tijdens vakanties of rustmomenten.</li>
              <li className="flex gap-3 text-xs leading-relaxed">Controleer de statusindicator in de header: <b>Barkr is waakzaam</b> betekent een actieve beveiliging.</li>
            </ul>
          </section>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20">
          <header className="flex justify-between items-center mb-4"><h2 className="text-xl font-black uppercase italic tracking-tighter">Instellingen</h2><button onClick={() => setShowSettings(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button></header>
          
          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Naam Gebruiker</label>
              <input value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} placeholder="Naam invoeren..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-slate-800 outline-none focus:border-orange-300 transition-all"/>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-50">
              <div>
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Slimme Planning</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Vensters per dag</p>
              </div>
              <button onClick={() => setSettings({...settings, useCustomSchedule: !settings.useCustomSchedule})} className={`w-12 h-7 rounded-full relative transition-colors ${settings.useCustomSchedule ? 'bg-orange-600' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.useCustomSchedule ? 'translate-x-5' : ''}`}/>
              </button>
            </div>

            {!settings.useCustomSchedule ? (
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Starttijd</label><input type="time" value={settings.startTime} onChange={e=>setSettings({...settings, startTime:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 font-black text-slate-800 text-center"/></div>
                <div><label className="text-[10px] font-black text-red-400 uppercase tracking-widest">Deadline</label><input type="time" value={settings.endTime} onChange={e=>setSettings({...settings, endTime:e.target.value})} className="w-full mt-1 bg-red-50/50 border border-red-100 rounded-2xl p-4 font-black text-red-600 text-center"/></div>
              </div>
            ) : (
              <div className="space-y-3">{settings.activeDays.sort().map(d => (
                <div key={d} className="bg-orange-50/30 p-4 rounded-2xl border border-orange-100 space-y-3">
                  <span className="text-[10px] font-black uppercase text-orange-800 block border-b border-orange-100 pb-2">{DAYS[d]}</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-[9px] font-black text-slate-400 uppercase text-center mb-1">Start</p><input type="time" value={settings.schedules[d]?.startTime || settings.startTime} onChange={e=>{setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], startTime:e.target.value}}})}} className="w-full bg-white px-2 py-2 rounded-xl border border-orange-200 text-xs font-black text-slate-700 text-center"/></div>
                    <div><p className="text-[9px] font-black text-red-400 uppercase text-center mb-1">Deadline</p><input type="time" value={settings.schedules[d]?.endTime || settings.endTime} onChange={e=>{setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], endTime:e.target.value}}})}} className="w-full bg-white px-2 py-2 rounded-xl border border-orange-200 text-xs font-black text-red-600 text-center"/></div>
                  </div>
                </div>
              ))}</div>
            )}
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center px-4 font-black text-[10px] text-orange-600 uppercase tracking-[0.2em]">Alarm Ontvangers <button onClick={()=>setSettings({...settings, contacts:[...settings.contacts, {name:'', phone:''}]})} className="p-2 bg-orange-600 text-white rounded-xl shadow-lg"><Plus size={16}/></button></div>
            <div className="space-y-4">{settings.contacts.map((c, i) => (
              <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm relative space-y-4 animate-in slide-in-from-right duration-300">
                <button onClick={()=> {const n=[...settings.contacts]; n.splice(i,1); setSettings({...settings, contacts:n})}} className="absolute top-5 right-5 text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={18}/></button>
                <div className="space-y-3">
                  <input placeholder="Naam Ontvanger" value={c.name} onChange={e=>{const n=[...settings.contacts]; n[i].name=e.target.value; setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black text-slate-800 outline-none"/>
                  <input placeholder="0612345678" value={c.phone} onChange={e=>{const n=[...settings.contacts]; n[i].phone=autoFormatPhone(e.target.value); setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-mono text-slate-600 outline-none"/>
                </div>
                <button onClick={() => activeUrl && fetch(`${activeUrl}/test_contact`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(c)})} className="w-full bg-emerald-50 text-emerald-700 text-[10px] font-black py-3 rounded-2xl border border-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors uppercase tracking-widest"><ShieldCheck size={14}/> Test Verbinding</button>
              </div>
            ))}</div>
          </div>
          
          <button onClick={() => setShowSettings(false)} className="w-full py-5 bg-slate-900 text-white font-black uppercase rounded-[32px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all">Configuratie Opslaan</button>
        </div>
      )}
    </div>
  );
}
