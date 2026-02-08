
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldCheck, 
  Settings as SettingsIcon, 
  Smartphone,
  X,
  Trash2,
  Plus,
  Power,
  Download,
  CheckCircle2
} from 'lucide-react';
import { UserSettings, EmergencyContact } from './types';

const PI_URL = "http://192.168.1.38:5000";

export default function App() {
  const [isSyncActive, setIsSyncActive] = useState(() => localStorage.getItem('safeguard_active') === 'true');
  const [showSettings, setShowSettings] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<string>(localStorage.getItem('safeguard_last_ping') || '--:--');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
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

  // Luister naar installatie prompt
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("De browser biedt op dit moment geen installatie aan. Gebruik het Chrome menu (3 puntjes) en kies 'App installeren'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    localStorage.setItem('safeguard_settings', JSON.stringify(settings));
  }, [settings]);

  const sendPingToPi = useCallback(async (isAuto = true) => {
    if (!settings.email || !isSyncActive) return;
    const now = Date.now();
    // Minimaal 2 minuten pauze tussen pings
    if (isAuto && (now - lastCheckinRef.current < 2 * 60 * 1000)) return;

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
      console.warn("Pi offline");
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
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      <header className="flex items-center justify-between p-6 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 pt-[safe-area-inset-top]">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${isSyncActive ? 'bg-indigo-500/20' : 'bg-slate-800'}`}>
            <ShieldCheck className={`${isSyncActive ? 'text-indigo-400' : 'text-slate-500'} w-5 h-5`} />
          </div>
          <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white">SafeGuard</h1>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-xl bg-slate-900 border border-white/5 active:scale-90 transition-all">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      <main className="flex-1 px-8 flex flex-col items-center justify-center space-y-16">
        <div className={`w-60 h-60 rounded-[3rem] flex flex-col items-center justify-center relative transition-all duration-1000 ${isSyncActive ? 'bg-indigo-600/5 shadow-[0_0_100px_-20px_rgba(79,70,229,0.2)] border border-indigo-500/30 rotate-3' : 'bg-slate-900/40 border border-white/5'}`}>
          <Smartphone className={`w-14 h-14 mb-4 ${isSyncActive ? 'text-indigo-500 animate-pulse' : 'text-slate-800'}`} />
          <div className="text-center">
            <h2 className={`text-xl font-black uppercase tracking-widest ${isSyncActive ? 'text-white' : 'text-slate-700'}`}>
              {isSyncActive ? 'Actief' : 'Standby'}
            </h2>
          </div>
          
          {isSyncActive && (
            <div className="absolute -bottom-4 bg-slate-900 border border-white/5 px-4 py-1.5 rounded-full shadow-2xl">
               <span className="text-[10px] text-indigo-400 font-mono font-bold tracking-tight">CHECK-IN: {lastPingTime}</span>
            </div>
          )}
        </div>

        <div className="w-full">
          {!isSyncActive ? (
            <button 
              onClick={() => {
                if (!settings.email || settings.contacts.length === 0) return setShowSettings(true);
                setIsSyncActive(true);
                localStorage.setItem('safeguard_active', 'true');
                sendPingToPi(false);
              }} 
              className="w-full py-6 bg-indigo-600 rounded-3xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-2xl shadow-indigo-900/50"
            >
              <Power size={18} /> Activeer Systeem
            </button>
          ) : (
            <button 
              onClick={() => {
                setIsSyncActive(false);
                localStorage.setItem('safeguard_active', 'false');
              }}
              className="w-full py-5 bg-slate-900 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border border-white/10 active:scale-95 transition-all"
            >
              Deactiveren
            </button>
          )}
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-8 animate-in slide-in-from-bottom duration-500 overflow-y-auto">
          <div className="flex items-center justify-between mb-12">
             <h3 className="text-lg font-black uppercase tracking-widest">Configuratie</h3>
             <button onClick={() => setShowSettings(false)} className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center border border-white/5"><X size={20}/></button>
          </div>
          
          <div className="space-y-8 pb-12">
            <button 
              onClick={handleInstallClick}
              className="w-full p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-between group active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-900/40">
                  <Download size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-white">Zet op Startscherm</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Installeer als echte app op je telefoon</p>
                </div>
              </div>
              <CheckCircle2 size={18} className="text-slate-800 group-hover:text-indigo-500" />
            </button>

            <section className="space-y-4">
              <label className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em] ml-1">Gebruikersnaam</label>
              <input type="text" placeholder="Bijv: Jan Janssen" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full p-5 bg-slate-900 rounded-2xl border border-white/5 outline-none focus:border-indigo-500/50 transition-all text-sm" />
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 p-5 rounded-3xl border border-white/5">
                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 tracking-widest">Starttijd</label>
                <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="bg-transparent w-full font-bold outline-none text-lg" />
              </div>
              <div className="bg-slate-900 p-5 rounded-3xl border border-white/5">
                <label className="text-[9px] font-black text-indigo-500 uppercase block mb-1 tracking-widest">Deadline</label>
                <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="bg-transparent w-full font-bold text-white outline-none text-lg" />
              </div>
            </section>

            <section className="space-y-5">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em]">Contactpersonen</h4>
                <button onClick={() => setSettings(prev => ({ ...prev, contacts: [...prev.contacts, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '', apiKey: '' }] }))} className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-900/40"><Plus size={16} /></button>
              </div>

              {settings.contacts.map((contact) => (
                <div key={contact.id} className="p-6 bg-slate-900 rounded-[2.5rem] border border-white/5 space-y-4 relative">
                  <button onClick={() => setSettings(prev => ({ ...prev, contacts: prev.contacts.filter(c => c.id !== contact.id) }))} className="absolute top-6 right-6 text-rose-500/30 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                  <input type="text" placeholder="Naam Contact" value={contact.name} onChange={e => updateContact(contact.id, 'name', e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-xs outline-none focus:border-indigo-500/30" />
                  <input type="text" placeholder="Telefoon (vrij: 31612345678)" value={contact.phone} onChange={e => updateContact(contact.id, 'phone', e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-xs outline-none focus:border-indigo-500/30" />
                  <input type="password" placeholder="CallMeBot Key" value={contact.apiKey} onChange={e => updateContact(contact.id, 'apiKey', e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-[10px] font-mono outline-none focus:border-indigo-500/30" />
                </div>
              ))}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
