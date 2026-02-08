
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldCheck, 
  Settings as SettingsIcon, 
  Smartphone,
  Zap,
  X,
  Trash2,
  Plus,
  User,
  Phone,
  Key,
  Activity,
  Power
} from 'lucide-react';
import { UserSettings, EmergencyContact } from './types';

const PI_URL = "http://192.168.1.38:5000";

export default function App() {
  const [isSyncActive, setIsSyncActive] = useState(() => localStorage.getItem('safeguard_active') === 'true');
  const [showSettings, setShowSettings] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [lastPingTime, setLastPingTime] = useState<string>(localStorage.getItem('safeguard_last_ping') || '--:--');
  
  const lastCheckinRef = useRef<number>(0);
  const wakeLockRef = useRef<any>(null);

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('safeguard_settings');
    const defaultSettings: UserSettings = {
      email: '', 
      startTime: '07:00',
      endTime: '08:30',
      contacts: []
    };
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  // Blokkeer slaapstand van de app
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.log("WakeLock niet beschikbaar");
      }
    }
  };

  useEffect(() => {
    localStorage.setItem('safeguard_settings', JSON.stringify(settings));
    if (isSyncActive) requestWakeLock();
  }, [settings, isSyncActive]);

  const sendPingToPi = useCallback(async (isAuto = true) => {
    if (!settings.email || !isSyncActive) return;
    
    // Voorkom te veel pings achter elkaar (minimaal 5 minuten pauze)
    const now = Date.now();
    if (isAuto && (now - lastCheckinRef.current < 5 * 60 * 1000)) return;

    try {
      const res = await fetch(`${PI_URL}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: settings.email,
          startTime: settings.startTime,
          endTime: settings.endTime,
          contacts: settings.contacts,
          type: isAuto ? 'focus' : 'manual'
        })
      });
      
      if (res.ok) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastPingTime(timeStr);
        localStorage.setItem('safeguard_last_ping', timeStr);
        lastCheckinRef.current = now;
        setServerOnline(true);
      }
    } catch (err) {
      setServerOnline(false);
    }
  }, [settings, isSyncActive]);

  // DE AUTOMATISERING: Detecteer ontgrendelen (wanneer app weer zichtbaar wordt)
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible' && isSyncActive) {
        sendPingToPi(true);
      }
    };
    window.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [isSyncActive, sendPingToPi]);

  const updateContact = (id: string, field: keyof EmergencyContact, value: string) => {
    setSettings(prev => ({
      ...prev,
      contacts: prev.contacts.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      <header className="flex items-center justify-between p-6 bg-slate-900/50 backdrop-blur-xl border-b border-white/5 pt-[safe-area-inset-top]">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-indigo-500 w-8 h-8" />
          <h1 className="text-xl font-black uppercase italic tracking-tighter text-white">SafeGuard</h1>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-3 rounded-xl bg-slate-800 active:scale-90 transition-all">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      <main className="flex-1 px-6 py-10 flex flex-col items-center justify-center space-y-12">
        <div className={`w-64 h-64 rounded-full flex flex-col items-center justify-center relative transition-all duration-1000 ${isSyncActive ? 'bg-indigo-600/10 shadow-[0_0_80px_-20px_rgba(79,70,229,0.4)] border-2 border-indigo-500/50' : 'bg-slate-900 border-2 border-white/5'}`}>
          <Smartphone className={`w-20 h-20 mb-4 ${isSyncActive ? 'text-indigo-500 animate-pulse' : 'text-slate-700'}`} />
          <div className="text-center">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] block mb-1">Status</span>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
              {isSyncActive ? 'Beveiligd' : 'Standby'}
            </h2>
          </div>
          
          {isSyncActive && (
            <div className="absolute -bottom-6 bg-slate-950 px-4 py-2 rounded-full border border-indigo-500/30">
               <span className="text-[10px] text-slate-400 font-mono">Last Check: {lastPingTime}</span>
            </div>
          )}
        </div>

        {!isSyncActive ? (
          <button 
            onClick={() => {
              if (!settings.email || settings.contacts.length === 0) return setShowSettings(true);
              setIsSyncActive(true);
              localStorage.setItem('safeguard_active', 'true');
              sendPingToPi(false);
            }} 
            className="w-full p-8 bg-indigo-600 rounded-[2.5rem] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-indigo-900/40"
          >
            <Power size={24} /> Activeer Guardian
          </button>
        ) : (
          <div className="w-full space-y-4">
             <div className="p-6 bg-indigo-500/5 rounded-3xl border border-indigo-500/10 flex items-center gap-4">
                <Activity className="text-indigo-500" />
                <p className="text-[11px] text-slate-400 font-medium">De Guardian waakt. Zodra je de telefoon ontgrendelt en deze app ziet, wordt je veiligheid bevestigd.</p>
             </div>
             <button 
              onClick={() => {
                setIsSyncActive(false);
                localStorage.setItem('safeguard_active', 'false');
              }}
              className="w-full p-5 bg-slate-900 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5"
            >
              Uitschakelen
            </button>
          </div>
        )}
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-6 animate-in slide-in-from-bottom duration-500 overflow-y-auto">
          <div className="flex items-center justify-between mb-10">
             <h3 className="text-xl font-black uppercase italic tracking-tighter">Configuratie</h3>
             <button onClick={() => setShowSettings(false)} className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center"><X /></button>
          </div>
          
          <div className="space-y-8 pb-20">
            <section className="space-y-4">
              <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest ml-2">Jouw Naam</label>
              <input type="text" placeholder="Volledige Naam" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full p-6 bg-slate-900 rounded-3xl border border-white/5 outline-none focus:border-indigo-500 transition-all" />
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 p-4 rounded-3xl border border-white/5">
                <label className="text-[8px] font-black text-slate-500 uppercase block mb-1">Check-in Vanaf</label>
                <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="bg-transparent w-full text-xl font-bold outline-none" />
              </div>
              <div className="bg-slate-900 p-4 rounded-3xl border border-white/5">
                <label className="text-[8px] font-black text-slate-500 uppercase block mb-1">Deadline</label>
                <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="bg-transparent w-full text-xl font-bold text-indigo-500 outline-none" />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Noodcontacten</h4>
                <button onClick={() => setSettings(prev => ({ ...prev, contacts: [...prev.contacts, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '', apiKey: '' }] }))} className="p-2 bg-indigo-600 rounded-lg"><Plus size={16} /></button>
              </div>

              {settings.contacts.map((contact) => (
                <div key={contact.id} className="p-6 bg-slate-900 rounded-[2rem] border border-white/5 space-y-4 relative">
                  <button onClick={() => setSettings(prev => ({ ...prev, contacts: prev.contacts.filter(c => c.id !== contact.id) }))} className="absolute top-6 right-6 text-rose-500/50"><Trash2 size={16} /></button>
                  <input type="text" placeholder="Naam Vriend" value={contact.name} onChange={e => updateContact(contact.id, 'name', e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-sm" />
                  <input type="text" placeholder="Telefoon (+316...)" value={contact.phone} onChange={e => updateContact(contact.id, 'phone', e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-sm" />
                  <input type="password" placeholder="CallMeBot API Sleutel" value={contact.apiKey} onChange={e => updateContact(contact.id, 'apiKey', e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-xs font-mono" />
                </div>
              ))}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
