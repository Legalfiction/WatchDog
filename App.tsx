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
  Key,
  Send,
  Heart,
  Copy,
  Share2
} from 'lucide-react';
import { UserSettings, ActivityLog, AppStatus, EmergencyContact } from './types';

const PI_URL = "http://192.168.1.38:5000";
const APP_VERSION = "2.7.1";

export default function App() {
  const [isSyncActive, setIsSyncActive] = useState(() => localStorage.getItem('safeguard_active') === 'true');
  const [showSettings, setShowSettings] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [lastPingTime, setLastPingTime] = useState<string>('--:--');
  const [isChecking, setIsChecking] = useState(false);
  const [isSendingCheckin, setIsSendingCheckin] = useState(false);

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
      setServerOnline(false);
    }
  }, [settings, isSyncActive]);

  const handleImmediateCheckin = async () => {
    if (!settings.email || settings.contacts.length === 0) {
      alert("Voeg eerst je naam en minimaal één contact toe in de instellingen.");
      setShowSettings(true);
      return;
    }
    
    setIsSendingCheckin(true);
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
        alert("Melding verstuurd! Je contacten hebben zojuist een 'Alles is goed' bericht ontvangen.");
        sendPing('manual');
      } else {
        alert("Melding mislukt. Controleer de verbinding met je Raspberry Pi.");
      }
    } catch (e) {
      alert("Geen verbinding met de Raspberry Pi.");
    } finally {
      setIsSendingCheckin(false);
    }
  };

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

  const shareActivationToFriend = (contactName: string) => {
    const text = `Hoi ${contactName}, ik gebruik de SafeGuard Watchdog app. Wil jij ook mijn veiligheidsmeldingen ontvangen? \n\nStuur dan dit bericht naar +34 623 78 95 80 via WhatsApp: \n"I allow callmebot to send me messages" \n\nJe krijgt dan een API-sleutel terug, stuur die even naar mij door!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
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
          <button onClick={checkServerStatus} className="p-3 rounded-xl bg-slate-800 border border-slate-700 active:scale-90 transition-all">
            <RefreshCcw className={`w-4 h-4 text-slate-400 ${isChecking ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-3 rounded-xl bg-slate-800 border border-slate-700 active:scale-90 transition-all">
            <SettingsIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 pt-8 pb-32 space-y-6">
        {/* CHECK-IN KNOP (HET 'ONTGRENDEL' EFFECT) */}
        <div className="p-1 bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-[2.5rem] shadow-2xl shadow-emerald-500/10">
          <button 
            disabled={isSendingCheckin}
            onClick={handleImmediateCheckin}
            className="w-full p-10 bg-slate-950 rounded-[2.4rem] flex flex-col items-center gap-4 active:scale-95 transition-all disabled:opacity-50 group"
          >
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 ${isSendingCheckin ? 'bg-slate-800' : 'bg-emerald-500/10 group-hover:scale-110 shadow-inner'}`}>
              <Heart className={`w-10 h-10 ${isSendingCheckin ? 'text-slate-500 animate-pulse' : 'text-emerald-500'}`} />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-1">Dagelijkse Melding</p>
              <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Meld Veilige Status</h3>
              <p className="text-[9px] text-slate-500 mt-2 font-medium">Stuur direct bericht naar je contacten</p>
            </div>
          </button>
        </div>

        <div className="p-10 rounded-[3rem] bg-slate-900 border border-white/5 flex flex-col items-center gap-6 text-center shadow-2xl">
          <Smartphone className={`w-12 h-12 transition-colors duration-500 ${isSyncActive ? 'text-indigo-500' : 'text-slate-700'}`} />
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">
            {isSyncActive ? 'MONITORING' : 'STANDBY'}
          </h2>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Laatste Activiteit</p>
            <p className="text-4xl font-black text-white font-mono">{lastPingTime}</p>
          </div>
        </div>

        {!isSyncActive && (
          <button 
            onClick={() => {
              if (settings.contacts.length === 0) {
                alert("Voeg eerst contacten toe.");
                setShowSettings(true);
                return;
              }
              setIsSyncActive(true);
              sendPing('manual');
            }} 
            className="w-full p-6 bg-indigo-600 rounded-[2rem] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-indigo-900/30"
          >
            <Zap className="w-5 h-5 fill-white/20" /> Start Bescherming
          </button>
        )}
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 p-0 animate-in fade-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl sticky top-0 pt-[safe-area-inset-top]">
             <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Instellingen</h3>
             <button onClick={() => setShowSettings(false)} className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center active:scale-90"><X className="w-6 h-6" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
            {/* PERSOONLIJKE INFO */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 flex items-center gap-2 px-2"><User className="w-3 h-3" /> Jouw Profiel</h4>
              <div className="space-y-4">
                <input type="text" placeholder="Jouw Naam" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full p-5 bg-slate-900 rounded-2xl border border-white/5 text-sm outline-none focus:border-indigo-500" />
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className="text-[8px] font-bold text-slate-500 uppercase ml-2">Monitor vanaf</label>
                     <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="w-full p-5 bg-slate-900 rounded-2xl border border-white/5 text-sm" />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[8px] font-bold text-slate-500 uppercase ml-2">Alarm Deadline</label>
                     <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="w-full p-5 bg-slate-900 rounded-2xl border border-white/5 text-sm font-bold text-indigo-400" />
                   </div>
                </div>
              </div>
            </section>

            {/* CONTACTPERSONEN SECTIE */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 flex items-center gap-2"><Phone className="w-3 h-3" /> Noodcontacten</h4>
                <button onClick={addContact} className="px-4 py-2 bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 active:scale-95"><Plus className="w-3 h-3" /> Nieuw</button>
              </div>

              {settings.contacts.map((contact) => (
                <div key={contact.id} className="p-6 bg-slate-900 rounded-[2rem] border border-white/10 space-y-5 relative">
                  <button onClick={() => removeContact(contact.id)} className="absolute top-6 right-6 p-2 bg-rose-500/10 rounded-lg text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  <div className="space-y-4 pt-2">
                    <input type="text" placeholder="Naam (bijv. Zoon)" value={contact.name} onChange={e => updateContact(contact.id, 'name', e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-sm outline-none" />
                    <input type="text" placeholder="Mobiel (+316...)" value={contact.phone} onChange={e => updateContact(contact.id, 'phone', e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-sm outline-none" />
                    
                    <div className="p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 space-y-3">
                      <div className="flex items-center justify-between">
                         <label className="text-[8px] font-black uppercase text-slate-500 flex items-center gap-1"><Key className="w-2 h-2" /> API Key van {contact.name || 'Vriend'}</label>
                         <div className="bg-amber-500/20 px-2 py-0.5 rounded text-[7px] font-black text-amber-500 uppercase tracking-tighter">Van vriend nodig</div>
                      </div>
                      <input type="password" placeholder="Plak de sleutel van je vriend hier" value={contact.apiKey} onChange={e => updateContact(contact.id, 'apiKey', e.target.value)} className="w-full bg-slate-950 rounded-xl p-3 text-xs border border-white/5 font-mono" />
                      
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button 
                          onClick={() => shareActivationToFriend(contact.name)}
                          className="flex-1 py-2 bg-emerald-600/20 border border-emerald-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest text-emerald-500 flex items-center justify-center gap-1"
                        >
                          <Send className="w-2 h-2" /> WhatsApp Instructie
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* UITLEG SECTIE OVER VRIENDEN */}
            <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-white/5 space-y-5 shadow-inner">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                     <Info className="w-5 h-5" />
                  </div>
                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Hoe voeg ik een vriend toe?</h5>
               </div>
               <div className="space-y-4">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Een vriend toevoegen betekent dat de berichten van SafeGuard naar hun telefoon worden gestuurd. Omdat WhatsApp beveiligd is, moeten zij <b>eenmalig toestemming</b> geven aan onze verzendservice.
                  </p>
                  <ol className="text-[11px] text-slate-300 space-y-4 ml-1">
                    <li className="flex gap-3">
                      <span className="w-5 h-5 bg-slate-800 rounded flex-shrink-0 flex items-center justify-center text-[9px] font-black">1</span>
                      <span>Stuur je vriend de instructie via de knop hierboven.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-5 h-5 bg-slate-800 rounded flex-shrink-0 flex items-center justify-center text-[9px] font-black">2</span>
                      <span>Je vriend krijgt een berichtje en stuurt een OK naar CallMeBot.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-5 h-5 bg-slate-800 rounded flex-shrink-0 flex items-center justify-center text-[9px] font-black">3</span>
                      <span>Jouw vriend ontvangt een 7-cijferige code en geeft die aan jou.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-5 h-5 bg-slate-800 rounded flex-shrink-0 flex items-center justify-center text-[9px] font-black text-indigo-500">4</span>
                      <span>Plak deze code in het veld bij de contactpersoon. Klaar!</span>
                    </li>
                  </ol>
               </div>
            </div>

            <div className="pt-8 border-t border-white/5">
               <p className="text-[8px] text-slate-700 text-center uppercase font-black tracking-[0.4em]">SafeGuard Engine v{APP_VERSION}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
