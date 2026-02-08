import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Settings as SettingsIcon, 
  Smartphone,
  Activity,
  Zap,
  CheckCircle2,
  X,
  MessageSquare,
  Info,
  RefreshCcw,
  Trash2,
  ExternalLink,
  Plus,
  AlertCircle,
  User,
  Phone,
  Key
} from 'lucide-react';
import { UserSettings, ActivityLog, AppStatus, EmergencyContact } from './types';

// DE DEFINITIEVE HARDE LINK NAAR JOUW RASPBERRY PI
const PI_URL = "http://192.168.1.38:5000";
const APP_VERSION = "2.6.8";

export default function App() {
  const [isSyncActive, setIsSyncActive] = useState(() => localStorage.getItem('safeguard_active') === 'true');
  const [showSettings, setShowSettings] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [lastPingTime, setLastPingTime] = useState<string>('--:--');
  const [isChecking, setIsChecking] = useState(false);

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

  // Opslaan van instellingen bij elke wijziging
  useEffect(() => {
    localStorage.setItem('safeguard_settings', JSON.stringify(settings));
    checkServerStatus();
  }, [settings]);

  // Synchroniseer activatie-status
  useEffect(() => {
    localStorage.setItem('safeguard_active', isSyncActive.toString());
  }, [isSyncActive]);

  const checkServerStatus = async () => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${PI_URL}/status`, { signal: controller.signal });
      const data = await res.json();
      setServerOnline(data.status === "online");
      clearTimeout(timeoutId);
    } catch (e) {
      setServerOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  const sendPing = useCallback(async (type: ActivityLog['type']) => {
    if (!settings.email || !isSyncActive) return;
    try {
      const response = await fetch(`${PI_URL}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        body: JSON.stringify({
          user: settings.email,
          startTime: settings.startTime,
          endTime: settings.endTime,
          contacts: settings.contacts,
          type: type
        })
      });
      if (response.ok) {
        setServerOnline(true);
        setLastPingTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.error("Ping failed", err);
      setServerOnline(false);
    }
  }, [settings, isSyncActive]);

  const addContact = () => {
    const newContact: EmergencyContact = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      phone: '',
      apiKey: ''
    };
    setSettings(prev => ({ ...prev, contacts: [...prev.contacts, newContact] }));
  };

  const removeContact = (id: string) => {
    setSettings(prev => ({ ...prev, contacts: prev.contacts.filter(c => c.id !== id) }));
  };

  const updateContact = (id: string, field: keyof EmergencyContact, value: string) => {
    setSettings(prev => ({
      ...prev,
      contacts: prev.contacts.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  const openWhatsAppActivation = () => {
    const text = encodeURIComponent("I allow callmebot to send me messages");
    window.open(`https://wa.me/34623789580?text=${text}`, '_blank');
  };

  const testContact = async (contact: EmergencyContact) => {
    if (!contact.phone || !contact.apiKey) {
      alert("Vul telefoonnummer en API-key in voor deze persoon.");
      return;
    }
    try {
      const res = await fetch(`${PI_URL}/test_wa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: settings.email,
          contact: contact
        })
      });
      if (res.ok) alert(`Test succesvol verstuurd naar ${contact.name}!`);
      else alert("Test mislukt. Controleer of de API-key klopt.");
    } catch (e) {
      alert("Kan de Raspberry Pi niet bereiken.");
    }
  };

  const resetApp = () => {
    if (confirm("Weet je dit zeker? Alle instellingen en contacten worden verwijderd.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  useEffect(() => {
    const handleActivity = () => { if (document.visibilityState === 'visible') sendPing('focus'); };
    window.addEventListener('visibilitychange', handleActivity);
    if (document.visibilityState === 'visible') sendPing('focus');
    const interval = setInterval(() => sendPing('focus'), 5 * 60 * 1000);
    return () => {
      window.removeEventListener('visibilitychange', handleActivity);
      clearInterval(interval);
    };
  }, [sendPing]);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* HEADER */}
      <header className="flex items-center justify-between p-6 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40 border-b border-white/5 pt-[safe-area-inset-top]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase italic leading-none tracking-tighter text-indigo-500">SafeGuard</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${serverOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest">
                {serverOnline ? `WATCHDOG v${APP_VERSION}` : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={checkServerStatus} 
            className={`p-3 rounded-xl bg-slate-800 border border-slate-700 active:scale-90 transition-all ${isChecking ? 'opacity-50' : ''}`}
            aria-label="Ververs status"
          >
            <RefreshCcw className={`w-4 h-4 text-slate-400 ${isChecking ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => {
              console.log("Opening settings...");
              setShowSettings(true);
            }} 
            className="p-3 rounded-xl bg-slate-800 border border-slate-700 active:scale-90 transition-all hover:bg-slate-700"
            aria-label="Instellingen"
          >
            <SettingsIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 px-6 pt-8 pb-32 space-y-8">
        {!isSyncActive ? (
          <div className="p-1 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10">
            <button 
              onClick={() => {
                if (settings.contacts.length === 0) {
                  alert("Voeg eerst minimaal één contactpersoon toe bij instellingen.");
                  setShowSettings(true);
                  return;
                }
                setIsSyncActive(true);
                sendPing('manual');
              }} 
              className="w-full p-10 bg-slate-950 rounded-[2.4rem] flex flex-col items-center gap-4 active:scale-95 transition-all"
            >
              <Zap className="w-10 h-10 text-indigo-500 animate-pulse" />
              <p className="text-sm font-black uppercase tracking-[0.2em] text-indigo-400 text-center">Activeer Monitoring</p>
            </button>
          </div>
        ) : (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex items-center gap-5">
             <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
             </div>
             <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-500">Bescherming Actief</p>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">{settings.contacts.length} Contacten ingesteld</p>
             </div>
          </div>
        )}

        <div className="p-10 rounded-[3rem] bg-slate-900 border border-white/5 flex flex-col items-center gap-6 text-center shadow-2xl">
          <Smartphone className={`w-12 h-12 transition-colors duration-500 ${isSyncActive ? 'text-indigo-500' : 'text-slate-700'}`} />
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">
            {isSyncActive ? 'SYNCING...' : 'STANDBY'}
          </h2>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Laatste Activiteit</p>
            <p className="text-4xl font-black text-white font-mono">{lastPingTime}</p>
          </div>
        </div>

        <button 
          onClick={() => sendPing('manual')}
          className="w-full p-6 bg-slate-900/50 border border-white/5 rounded-[2rem] flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          <Activity className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-black uppercase tracking-widest">Handmatige Check</span>
        </button>
      </main>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 p-0 animate-in fade-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl sticky top-0 pt-[safe-area-inset-top]">
             <div className="flex flex-col">
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white leading-none">Instellingen</h3>
                <span className="text-[8px] text-indigo-500 font-black uppercase tracking-widest mt-1">Version v{APP_VERSION}</span>
             </div>
             <button 
               onClick={() => setShowSettings(false)} 
               className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center active:scale-90"
             >
               <X className="w-6 h-6 text-white" />
             </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
            {/* BASIS INFO */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 px-2 flex items-center gap-2">
                <User className="w-3 h-3" /> Jouw Gegevens
              </h4>
              <div className="space-y-4">
                <div className="relative">
                   <input 
                     type="text" 
                     placeholder="Je voornaam" 
                     value={settings.email} 
                     onChange={e => setSettings({...settings, email: e.target.value})} 
                     className="w-full p-5 bg-slate-900 rounded-2xl border border-white/5 text-sm outline-none focus:border-indigo-500 transition-colors" 
                   />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-500 uppercase ml-2">Check vanaf</label>
                    <input 
                      type="time" 
                      value={settings.startTime} 
                      onChange={e => setSettings({...settings, startTime: e.target.value})} 
                      className="w-full p-5 bg-slate-900 rounded-2xl border border-white/5 text-sm outline-none focus:border-indigo-500 transition-colors" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-500 uppercase ml-2">Deadline</label>
                    <input 
                      type="time" 
                      value={settings.endTime} 
                      onChange={e => setSettings({...settings, endTime: e.target.value})} 
                      className="w-full p-5 bg-slate-900 rounded-2xl border border-white/5 text-sm outline-none focus:border-indigo-500 transition-colors font-bold text-indigo-400" 
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* CONTACTEN */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 flex items-center gap-2">
                  <Phone className="w-3 h-3" /> Noodcontacten
                </h4>
                <button 
                  onClick={addContact} 
                  className="px-4 py-2 bg-indigo-600 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95"
                >
                  <Plus className="w-3 h-3" /> Toevoegen
                </button>
              </div>

              {settings.contacts.length === 0 && (
                <div className="p-8 bg-slate-900/50 border border-dashed border-white/10 rounded-3xl text-center">
                   <p className="text-xs text-slate-500 font-medium">Nog geen contactpersonen toegevoegd.</p>
                </div>
              )}

              {settings.contacts.map((contact) => (
                <div key={contact.id} className="p-6 bg-slate-900 rounded-3xl border border-white/10 space-y-4 relative overflow-hidden">
                  <button 
                    onClick={() => removeContact(contact.id)} 
                    className="absolute top-4 right-4 p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <div className="space-y-4 pt-2">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Naam (bijv. Dochter)" 
                        value={contact.name} 
                        onChange={e => updateContact(contact.id, 'name', e.target.value)} 
                        className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-sm outline-none focus:border-indigo-500" 
                      />
                    </div>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Telefoon (+316...)" 
                        value={contact.phone} 
                        onChange={e => updateContact(contact.id, 'phone', e.target.value)} 
                        className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-sm outline-none focus:border-indigo-500" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                       <div className="flex items-center justify-between px-1">
                          <label className="text-[8px] font-black uppercase text-slate-500 flex items-center gap-1">
                            <Key className="w-2 h-2" /> CallMeBot API Key
                          </label>
                          {!contact.apiKey && (
                            <button 
                              onClick={openWhatsAppActivation} 
                              className="text-[8px] font-black uppercase text-emerald-500 flex items-center gap-1 underline"
                            >
                              Code Nodig?
                            </button>
                          )}
                       </div>
                       <input 
                         type="password" 
                         placeholder="Plak API Key hier" 
                         value={contact.apiKey} 
                         onChange={e => updateContact(contact.id, 'apiKey', e.target.value)} 
                         className="w-full bg-slate-950 rounded-xl p-4 text-xs border border-white/5 font-mono" 
                       />
                    </div>
                  </div>

                  <button 
                    onClick={() => testContact(contact)} 
                    className="w-full py-3 bg-indigo-600/10 border border-indigo-600/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-indigo-400 active:bg-indigo-600 active:text-white transition-all"
                  >
                    Stuur Test Bericht
                  </button>
                </div>
              ))}
            </section>

            {/* WHATSAPP HELPER */}
            <div className="p-8 bg-emerald-500/5 rounded-[2.5rem] border border-emerald-500/10 space-y-5">
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-emerald-500">
                <AlertCircle className="w-4 h-4" /> WhatsApp Activatie
              </h5>
              <div className="space-y-4">
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  De watchdog gebruikt WhatsApp om je contactpersonen te waarschuwen. Volg deze stappen:
                </p>
                <ol className="text-[11px] text-slate-300 space-y-4 ml-1">
                  <li className="flex gap-3 items-start">
                    <span className="w-5 h-5 bg-emerald-500 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-black text-white">1</span>
                    <span>Klik op de knop hieronder om WhatsApp te openen.</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="w-5 h-5 bg-emerald-500 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-black text-white">2</span>
                    <span>Stuur het bericht naar CallMeBot om je API-key te ontvangen.</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="w-5 h-5 bg-emerald-500 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-black text-white">3</span>
                    <span>Kopieer de 7-cijferige code uit het antwoord en plak deze hierboven.</span>
                  </li>
                </ol>
                <button 
                  onClick={openWhatsAppActivation}
                  className="w-full p-5 bg-emerald-600 rounded-[1.5rem] flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs active:scale-95 transition-all shadow-xl shadow-emerald-900/30"
                >
                  <MessageSquare className="w-5 h-5 fill-white/20" /> Open WhatsApp
                </button>
              </div>
            </div>

            {/* DELETE / RESET */}
            <div className="pt-8 border-t border-white/5 space-y-4">
               <button 
                 onClick={resetApp} 
                 className="w-full p-5 text-[10px] font-black uppercase tracking-[0.2em] text-rose-500/60 hover:text-rose-500 border border-rose-500/10 rounded-2xl transition-all"
               >
                 <Trash2 className="w-4 h-4 inline mr-2" /> App Volledig Resetten
               </button>
               <p className="text-[8px] text-slate-600 text-center uppercase font-black tracking-widest">SafeGuard Watchdog Engine v{APP_VERSION}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
