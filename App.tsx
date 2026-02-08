import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldCheck, 
  Settings as SettingsIcon, 
  Smartphone,
  Zap,
  X,
  RefreshCcw,
  Trash2,
  Plus,
  AlertCircle,
  User,
  Phone,
  Key,
  Send,
  Heart,
  Activity,
  ShieldAlert,
  Power
} from 'lucide-react';
import { UserSettings, ActivityLog, EmergencyContact } from './types';

const PI_URL = "http://192.168.1.38:5000";
const APP_VERSION = "2.8.0";

export default function App() {
  const [isSyncActive, setIsSyncActive] = useState(() => localStorage.getItem('safeguard_active') === 'true');
  const [showSettings, setShowSettings] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [lastPingTime, setLastPingTime] = useState<string>(localStorage.getItem('safeguard_last_ping') || '--:--');
  const [isChecking, setIsChecking] = useState(false);
  const [isSendingCheckin, setIsSendingCheckin] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  
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

  // Systeem: Wake Lock aanvragen om te voorkomen dat de app 'slaapt'
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
        console.log("SafeGuard: Systeem Wake Lock Actief");
      } catch (err) {
        console.error("Wake Lock gefaald:", err);
        setWakeLockActive(false);
      }
    }
  };

  useEffect(() => {
    localStorage.setItem('safeguard_settings', JSON.stringify(settings));
    checkServerStatus();
    if (isSyncActive) requestWakeLock();
  }, [settings, isSyncActive]);

  const checkServerStatus = async () => {
    setIsChecking(true);
    try {
      const res = await fetch(`${PI_URL}/status`);
      const data = await res.json();
      setServerOnline(data.status === "online");
    } catch (e) {
      setServerOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleAutoCheckin = useCallback(async () => {
    if (!settings.email || settings.contacts.length === 0 || !isSyncActive) return;
    
    // Anti-spam: Maximaal 1x per 10 minuten bij automatisch ontgrendelen
    const now = Date.now();
    if (now - lastCheckinRef.current < 10 * 60 * 1000) return;

    try {
      const res = await fetch(`${PI_URL}/immediate_checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: settings.email,
          contacts: settings.contacts
        })
      });
      if (res.ok) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        lastCheckinRef.current = now;
        setLastPingTime(timeStr);
        localStorage.setItem('safeguard_last_ping', timeStr);
      }
    } catch (e) {
      console.error("Auto-checkin naar Pi mislukt");
    }
  }, [settings, isSyncActive]);

  // DE "AUTOMATISERING" ENGINE: Luistert naar systeem-focus (Unlock effect)
  useEffect(() => {
    const handleSysteemEvent = () => {
      if (document.visibilityState === 'visible' && isSyncActive) {
        // Zodra scherm aan gaat of tab gefocust wordt:
        handleAutoCheckin();
        
        // Vernieuw Wake Lock als deze verloren was (bijv. na scherm uit)
        if (!wakeLockActive) requestWakeLock();
      }
    };

    window.addEventListener('visibilitychange', handleSysteemEvent);
    window.addEventListener('focus', handleSysteemEvent);
    window.addEventListener('pageshow', handleSysteemEvent);
    
    return () => {
      window.removeEventListener('visibilitychange', handleSysteemEvent);
      window.removeEventListener('focus', handleSysteemEvent);
      window.removeEventListener('pageshow', handleSysteemEvent);
    };
  }, [isSyncActive, handleAutoCheckin, wakeLockActive]);

  const addContact = () => {
    setSettings(prev => ({ 
      ...prev, 
      contacts: [...prev.contacts, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '', apiKey: '' }] 
    }));
  };

  const updateContact = (id: string, field: keyof EmergencyContact, value: string) => {
    setSettings(prev => ({
      ...prev,
      contacts: prev.contacts.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      <header className="flex items-center justify-between p-6 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-40 border-b border-white/5 pt-[safe-area-inset-top]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase italic tracking-tighter text-indigo-500 leading-none">SafeGuard</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${serverOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest">
                {serverOnline ? 'SYSTEM ACTIVE' : 'PI OFFLINE'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-3 rounded-xl bg-slate-800 border border-white/5 active:scale-90 transition-all">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      <main className="flex-1 px-6 py-8 space-y-6">
        {/* STATUS KAART */}
        <div className={`p-10 rounded-[3rem] transition-all duration-1000 flex flex-col items-center gap-6 text-center border shadow-2xl relative overflow-hidden group ${isSyncActive ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-slate-900 border-white/5'}`}>
          {isSyncActive && <div className="absolute inset-0 bg-indigo-500/5 animate-pulse" />}
          
          <div className="relative">
            <Smartphone className={`w-16 h-16 transition-all duration-1000 ${isSyncActive ? 'text-indigo-500 scale-110' : 'text-slate-800'}`} />
            {isSyncActive && (
              <div className="absolute -top-2 -right-2 bg-emerald-500 p-1.5 rounded-full shadow-lg shadow-emerald-500/50">
                <Zap size={12} className="text-white fill-white" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">
              {isSyncActive ? 'Watchdog Actief' : 'Systeem Standby'}
            </h2>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">
              {wakeLockActive ? 'Systeemkoppeling Bevestigd' : 'Systeemkoppeling Beperkt'}
            </p>
          </div>

          <div className="w-full h-px bg-white/5" />

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-1">Laatste Activiteit</span>
            <p className="text-5xl font-black text-white font-mono tracking-tighter">
              {lastPingTime}
            </p>
          </div>
        </div>

        {/* CONTROLS */}
        {!isSyncActive ? (
          <button 
            onClick={() => {
              if (!settings.email || settings.contacts.length === 0) return setShowSettings(true);
              setIsSyncActive(true);
              handleAutoCheckin();
            }} 
            className="w-full p-8 bg-indigo-600 rounded-[2.5rem] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-indigo-900/40"
          >
            <Power className="w-6 h-6" /> Start Automatisering
          </button>
        ) : (
          <div className="space-y-4">
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center gap-4">
               <Activity className="text-emerald-500 animate-bounce" size={24} />
               <p className="text-[11px] text-emerald-200/70 font-medium leading-relaxed">
                 De app luistert nu naar je telefoongebruik. Zodra je de telefoon ontgrendelt en deze app ziet, wordt de melding verstuurd.
               </p>
            </div>
            <button 
              onClick={() => setIsSyncActive(false)}
              className="w-full p-5 bg-slate-900 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500"
            >
              Stop Monitoring
            </button>
          </div>
        )}

        {serverOnline === false && (
          <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="text-rose-500 flex-shrink-0" size={18} />
            <p className="text-[10px] text-rose-200/80">
              <b>Geen verbinding met de Raspberry Pi.</b> De automatisering kan de meldingen niet verzenden. Controleer je WiFi of Pi-status.
            </p>
          </div>
        )}
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 p-0 animate-in slide-in-from-bottom duration-500">
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-2xl sticky top-0 pt-[safe-area-inset-top]">
             <h3 className="text-xl font-black uppercase italic tracking-tighter">Eénmalige Setup</h3>
             <button onClick={() => setShowSettings(false)} className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center active:scale-75"><X /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-10 pb-40">
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-2 text-indigo-500">
                <User size={14} />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Persoonlijke Gegevens</h4>
              </div>
              <input type="text" placeholder="Volledige Naam" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full p-6 bg-slate-900 rounded-3xl border border-white/5 outline-none focus:border-indigo-500 transition-colors" />
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-900 p-4 rounded-3xl border border-white/5">
                   <label className="text-[8px] font-black text-slate-500 uppercase ml-1 block mb-2">Monitor Vanaf</label>
                   <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="bg-transparent w-full text-xl font-bold outline-none" />
                 </div>
                 <div className="bg-slate-900 p-4 rounded-3xl border border-white/5">
                   <label className="text-[8px] font-black text-slate-500 uppercase ml-1 block mb-2">Alarm Deadline</label>
                   <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="bg-transparent w-full text-xl font-bold text-indigo-500 outline-none" />
                 </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-indigo-500">
                  <Phone size={14} />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Noodcontacten</h4>
                </div>
                <button onClick={addContact} className="p-2 bg-indigo-600 rounded-lg"><Plus size={16} /></button>
              </div>

              {settings.contacts.map((contact) => (
                <div key={contact.id} className="p-6 bg-slate-900 rounded-[2.5rem] border border-white/5 space-y-4 relative overflow-hidden">
                  <button onClick={() => setSettings(prev => ({ ...prev, contacts: prev.contacts.filter(c => c.id !== contact.id) }))} className="absolute top-6 right-6 text-rose-500/50 hover:text-rose-500"><Trash2 size={16} /></button>
                  <input type="text" placeholder="Naam Vriend" value={contact.name} onChange={e => updateContact(contact.id, 'name', e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-sm outline-none" />
                  <input type="text" placeholder="Telefoon (+316...)" value={contact.phone} onChange={e => updateContact(contact.id, 'phone', e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-sm outline-none" />
                  <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2">
                    <label className="text-[8px] font-black uppercase text-slate-500 flex items-center gap-1"><Key size={10} /> API Sleutel</label>
                    <input type="password" value={contact.apiKey} onChange={e => updateContact(contact.id, 'apiKey', e.target.value)} className="w-full bg-transparent outline-none text-xs font-mono" placeholder="••••••" />
                  </div>
                </div>
              ))}
            </section>

            <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-white/5">
              <p className="text-[10px] text-slate-500 leading-relaxed italic">
                <b>Tip:</b> Zet deze website als snelkoppeling op je startscherm. De automatisering werkt het beste als de app in de browser open blijft staan.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
