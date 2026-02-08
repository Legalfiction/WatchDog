
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldCheck, 
  Settings as SettingsIcon, 
  Smartphone,
  X,
  Trash2,
  Plus,
  User,
  Phone,
  Key,
  Power,
  Download
} from 'lucide-react';
import { UserSettings, EmergencyContact } from './types';

const PI_URL = "http://192.168.1.38:5000";

export default function App() {
  const [isSyncActive, setIsSyncActive] = useState(() => localStorage.getItem('safeguard_active') === 'true');
  const [showSettings, setShowSettings] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<string>(localStorage.getItem('safeguard_last_ping') || '--:--');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  const lastCheckinRef = useRef<number>(0);

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

  // Luister naar PWA installatie mogelijkheid
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const triggerInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  useEffect(() => {
    localStorage.setItem('safeguard_settings', JSON.stringify(settings));
  }, [settings]);

  const sendPingToPi = useCallback(async (isAuto = true) => {
    if (!settings.email || !isSyncActive) return;
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
          type: 'focus'
        })
      });
      
      if (res.ok) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastPingTime(timeStr);
        localStorage.setItem('safeguard_last_ping', timeStr);
        lastCheckinRef.current = now;
      }
    } catch (err) {
      console.error("Pi niet bereikbaar");
    }
  }, [settings, isSyncActive]);

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
      <header className="flex items-center justify-between p-6 bg-slate-900/30 backdrop-blur-xl pt-[safe-area-inset-top]">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-indigo-500 w-7 h-7" />
          <h1 className="text-lg font-black uppercase tracking-tight text-white">SafeGuard</h1>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg bg-slate-900 border border-white/5 active:scale-90 transition-all">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      <main className="flex-1 px-6 py-10 flex flex-col items-center justify-center space-y-12">
        <div className={`w-56 h-56 rounded-full flex flex-col items-center justify-center relative transition-all duration-700 ${isSyncActive ? 'bg-indigo-500/10 shadow-[0_0_60px_-15px_rgba(79,70,229,0.3)] border-2 border-indigo-500/40' : 'bg-slate-900/50 border-2 border-white/5'}`}>
          <Smartphone className={`w-16 h-16 mb-2 ${isSyncActive ? 'text-indigo-500' : 'text-slate-800'}`} />
          <div className="text-center">
            <h2 className="text-xl font-black uppercase tracking-tight text-white">
              {isSyncActive ? 'Actief' : 'Standby'}
            </h2>
          </div>
          
          {isSyncActive && (
            <div className="absolute -bottom-10 flex flex-col items-center">
               <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Laatste Check</span>
               <span className="text-sm font-mono font-bold text-slate-300">{lastPingTime}</span>
            </div>
          )}
        </div>

        <div className="w-full pt-10">
          {!isSyncActive ? (
            <button 
              onClick={() => {
                if (!settings.email || settings.contacts.length === 0) return setShowSettings(true);
                setIsSyncActive(true);
                localStorage.setItem('safeguard_active', 'true');
                sendPingToPi(false);
              }} 
              className="w-full p-6 bg-indigo-600 rounded-3xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-4 active:scale-95 transition-all shadow-lg shadow-indigo-900/40"
            >
              <Power size={20} /> Start Bewaking
            </button>
          ) : (
            <button 
              onClick={() => {
                setIsSyncActive(false);
                localStorage.setItem('safeguard_active', 'false');
              }}
              className="w-full p-5 bg-slate-900/80 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 active:scale-95 transition-all"
            >
              Stop Bewaking
            </button>
          )}
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-6 animate-in slide-in-from-bottom duration-300 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-lg font-black uppercase tracking-tight">Instellingen</h3>
             <button onClick={() => setShowSettings(false)} className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center"><X size={20}/></button>
          </div>
          
          <div className="space-y-6 pb-20">
            {installPrompt && (
              <button onClick={triggerInstall} className="w-full p-5 bg-emerald-600/20 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold flex items-center justify-center gap-3 active:scale-95 transition-all">
                <Download size={16} /> Zet op Startscherm
              </button>
            )}

            <section className="space-y-3">
              <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest ml-1">Jouw Naam</label>
              <input type="text" placeholder="Naam" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full p-4 bg-slate-900 rounded-2xl border border-white/5 outline-none focus:border-indigo-500 transition-all text-sm" />
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 p-4 rounded-2xl border border-white/5">
                <label className="text-[8px] font-black text-slate-500 uppercase block mb-1">Vanaf</label>
                <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="bg-transparent w-full font-bold outline-none" />
              </div>
              <div className="bg-slate-900 p-4 rounded-2xl border border-white/5">
                <label className="text-[8px] font-black text-slate-500 uppercase block mb-1">Deadline</label>
                <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="bg-transparent w-full font-bold text-indigo-500 outline-none" />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Noodcontacten</h4>
                <button onClick={() => setSettings(prev => ({ ...prev, contacts: [...prev.contacts, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '', apiKey: '' }] }))} className="p-1.5 bg-indigo-600 rounded-lg"><Plus size={14} /></button>
              </div>

              {settings.contacts.map((contact) => (
                <div key={contact.id} className="p-5 bg-slate-900 rounded-2xl border border-white/5 space-y-3 relative">
                  <button onClick={() => setSettings(prev => ({ ...prev, contacts: prev.contacts.filter(c => c.id !== contact.id) }))} className="absolute top-4 right-4 text-rose-500/40"><Trash2 size={14} /></button>
                  <input type="text" placeholder="Naam" value={contact.name} onChange={e => updateContact(contact.id, 'name', e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-xs outline-none" />
                  <input type="text" placeholder="Telefoon" value={contact.phone} onChange={e => updateContact(contact.id, 'phone', e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-xs outline-none" />
                  <input type="password" placeholder="CallMeBot Key" value={contact.apiKey} onChange={e => updateContact(contact.id, 'apiKey', e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-xs font-mono outline-none" />
                </div>
              ))}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
