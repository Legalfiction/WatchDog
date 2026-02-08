
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
  AlertCircle
} from 'lucide-react';
import { UserSettings, ActivityLog, AppStatus, EmergencyContact } from './types';

const PI_URL = "http://192.168.1.38:5000";
const APP_VERSION = "2.6.7";

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

  useEffect(() => {
    localStorage.setItem('safeguard_settings', JSON.stringify(settings));
    checkServerStatus();
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('safeguard_active', isSyncActive.toString());
  }, [isSyncActive]);

  const checkServerStatus = async () => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
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
    const timestamp = Date.now();
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
    setSettings({ ...settings, contacts: [...settings.contacts, newContact] });
  };

  const removeContact = (id: string) => {
    setSettings({ ...settings, contacts: settings.contacts.filter(c => c.id !== id) });
  };

  const updateContact = (id: string, field: keyof EmergencyContact, value: string) => {
    setSettings({
      ...settings,
      contacts: settings.contacts.map(c => c.id === id ? { ...c, [field]: value } : c)
    });
  };

  const openWhatsAppActivation = () => {
    const text = encodeURIComponent("I allow callmebot to send me messages");
    window.open(`https://wa.me/34623789580?text=${text}`, '_blank');
  };

  const testContact = async (contact: EmergencyContact) => {
    if (!contact.phone || !contact.apiKey) {
      alert("Vul telefoonnummer en API-key in.");
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
      if (res.ok) alert(`Test bericht verstuurd naar ${contact.name}!`);
      else alert("Test mislukt. Controleer API-key.");
    } catch (e) {
      alert("Geen verbinding met Pi.");
    }
  };

  const resetApp = () => {
    if (confirm("Alles wissen?")) {
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
      <header className="flex items-center justify-between p-6 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase italic leading-none tracking-tighter text-indigo-500">SafeGuard</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${serverOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest">
                {serverOnline ? 'WATCHDOG v2.6.7' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={checkServerStatus} className={`p-3 rounded-xl bg-slate-800 border border-slate-700 transition-all ${isChecking ? 'animate-spin opacity-50' : 'active:scale-90'}`}>
            <RefreshCcw className="w-4 h-4 text-slate-400" />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-3 rounded-xl bg-slate-800 border border-slate-700 active:scale-90 transition-all hover:bg-slate-700">
            <SettingsIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </header>

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
          <Smartphone className={`w-12 h-12 ${isSyncActive ? 'text-indigo-500' : 'text-slate-700'}`} />
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">
            {isSyncActive ? 'SYNCING...' : 'STANDBY'}
          </h2>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Laatste Activiteit</p>
            <p className="text-4xl font-black text-white font-mono">{lastPingTime}</p>
          </div>
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/95 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-[3rem] p-8 space-y-6 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto pb-12">
            <div className="flex items-center justify-between sticky top-0 bg-slate-900 py-2 z-10 border-b border-white/5">
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Configuratie</h3>
              <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-800 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Basis</h4>
                <div className="space-y-4">
                  <input type="text" placeholder="Jouw Naam" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full p-4 bg-slate-950 rounded-2xl border border-white/5 text-sm" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="p-4 bg-slate-950 rounded-2xl border border-white/5 text-sm" />
                    <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="p-4 bg-slate-950 rounded-2xl border border-white/5 text-sm" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Contactpersonen</h4>
                  <button onClick={addContact} className="p-2 bg-indigo-600 rounded-lg active:scale-90"><Plus className="w-4 h-4" /></button>
                </div>

                {settings.contacts.map((contact) => (
                  <div key={contact.id} className="p-5 bg-slate-950 rounded-3xl border border-white/5 space-y-4 relative group">
                    <button onClick={() => removeContact(contact.id)} className="absolute top-4 right-4 text-slate-600 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                    
                    <div className="space-y-3 pt-2">
                      <input type="text" placeholder="Naam Contact" value={contact.name} onChange={e => updateContact(contact.id, 'name', e.target.value)} className="w-full bg-transparent border-b border-white/10 p-1 text-sm outline-none focus:border-indigo-500" />
                      <input type="text" placeholder="Telefoon (+316...)" value={contact.phone} onChange={e => updateContact(contact.id, 'phone', e.target.value)} className="w-full bg-transparent border-b border-white/10 p-1 text-sm outline-none focus:border-indigo-500" />
                      
                      <div className="space-y-2 pt-2">
                         <div className="flex items-center justify-between">
                            <label className="text-[8px] font-black uppercase text-slate-500">API Key</label>
                            {!contact.apiKey && (
                              <button onClick={openWhatsAppActivation} className="text-[8px] font-black uppercase text-emerald-500 flex items-center gap-1">
                                <ExternalLink className="w-2 h-2" /> Key Nodig?
                              </button>
                            )}
                         </div>
                         <input type="password" placeholder="Plak API Key" value={contact.apiKey} onChange={e => updateContact(contact.id, 'apiKey', e.target.value)} className="w-full bg-slate-900 rounded-xl p-3 text-xs border border-white/5" />
                      </div>
                    </div>

                    <button onClick={() => testContact(contact)} className="w-full py-2 bg-slate-900 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white">
                      Test Verbinding
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-indigo-500/5 rounded-[2rem] border border-indigo-500/10 space-y-4">
                <h5 className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2 text-indigo-400">
                  <AlertCircle className="w-4 h-4" /> WhatsApp Setup Gids
                </h5>
                <ol className="text-[10px] text-slate-400 space-y-3 font-medium">
                  <li className="flex gap-2"><span>1.</span> <span>Klik op de knop hieronder om WhatsApp te openen.</span></li>
                  <li className="flex gap-2"><span>2.</span> <span>Stuur het bericht naar CallMeBot.</span></li>
                  <li className="flex gap-2"><span>3.</span> <span>Wacht op de API-key en plak deze in het veld hierboven.</span></li>
                </ol>
                <button 
                  onClick={openWhatsAppActivation}
                  className="w-full p-4 bg-emerald-600 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs active:scale-95 transition-all shadow-lg shadow-emerald-900/20"
                >
                  <MessageSquare className="w-5 h-5 fill-white/20" /> Activeer WhatsApp
                </button>
              </div>

              <button onClick={resetApp} className="w-full p-4 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-rose-500 opacity-50">
                Reset Alle Gegevens
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
