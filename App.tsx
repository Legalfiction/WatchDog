
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldCheck, 
  Settings as SettingsIcon, 
  Smartphone,
  X,
  Trash2,
  Plus,
  Power,
  Loader2,
  Send,
  Users,
  CheckCircle2,
  Wifi,
  AlertCircle
} from 'lucide-react';
import { UserSettings, EmergencyContact } from './types';

export default function App() {
  const [isSyncActive, setIsSyncActive] = useState(() => localStorage.getItem('safeguard_active') === 'true');
  const [showSettings, setShowSettings] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<string>(localStorage.getItem('safeguard_last_ping') || '--:--');
  const [lastStatus, setLastStatus] = useState<'success' | 'error' | null>(null);
  const [piStatus, setPiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isProcessing, setIsProcessing] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [piIp, setPiIp] = useState(() => localStorage.getItem('safeguard_pi_ip') || '192.168.1.38');
  
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

  const PI_URL = `http://${piIp}:5000`;
  const cleanPhone = (num: string) => num.replace(/^\+|00/, '').replace(/\s+/g, '');

  const checkPiStatus = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    try {
      const res = await fetch(`${PI_URL}/status`, { signal: controller.signal });
      setPiStatus(res.ok ? 'online' : 'offline');
    } catch (err) {
      setPiStatus('offline');
    } finally {
      clearTimeout(timeoutId);
    }
  }, [PI_URL]);

  useEffect(() => {
    checkPiStatus();
    const interval = setInterval(checkPiStatus, 15000);
    return () => clearInterval(interval);
  }, [checkPiStatus]);

  useEffect(() => {
    localStorage.setItem('safeguard_settings', JSON.stringify(settings));
    localStorage.setItem('safeguard_pi_ip', piIp);
  }, [settings, piIp]);

  const triggerCheckin = useCallback(async () => {
    if (!settings.email || !isSyncActive || isProcessing) return;

    setIsProcessing(true);
    try {
      const recipients = settings.contacts.map(c => ({
        ...c, 
        phone: cleanPhone(c.phone)
      }));

      if (recipients.length === 0) {
        setIsProcessing(false);
        return;
      }

      const response = await fetch(`${PI_URL}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: settings.email,
          startTime: settings.startTime,
          endTime: settings.endTime,
          contacts: recipients
        })
      });
      
      if (!response.ok) throw new Error("Pi weigert");

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastPingTime(timeStr);
      setLastStatus('success');
      localStorage.setItem('safeguard_last_ping', timeStr);
    } catch (err) {
      console.error("Fout:", err);
      setLastStatus('error');
    } finally {
      setTimeout(() => setIsProcessing(false), 1500);
    }
  }, [settings, isSyncActive, isProcessing, PI_URL]);

  const testSingleContact = async (name: string, phone: string, apiKey: string, id: string) => {
    setTestStatus(id);
    try {
      await fetch(`${PI_URL}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: "Test",
          contacts: [{ name, phone: cleanPhone(phone), apiKey }]
        })
      });
    } catch (err) {
      alert("Kan geen verbinding maken met de Pi op " + piIp);
    } finally {
      setTimeout(() => setTestStatus(null), 2000);
    }
  };

  useEffect(() => {
    const handleEvents = () => {
      if ((document.visibilityState === 'visible' || !document.hidden) && isSyncActive) {
        triggerCheckin();
      }
    };
    
    window.addEventListener('focus', handleEvents);
    window.addEventListener('visibilitychange', handleEvents);
    window.addEventListener('pageshow', handleEvents);
    
    return () => {
      window.removeEventListener('focus', handleEvents);
      window.removeEventListener('visibilitychange', handleEvents);
      window.removeEventListener('pageshow', handleEvents);
    };
  }, [isSyncActive, triggerCheckin]);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <header className="flex items-center justify-between p-6 bg-slate-900/40 border-b border-white/5 pt-[safe-area-inset-top]">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className={`${isSyncActive ? 'text-indigo-400' : 'text-slate-500'} w-6 h-6`} />
          <div>
            <h1 className="text-[10px] font-black uppercase tracking-widest">SafeGuard V4.5</h1>
            <div className="flex items-center gap-1">
              <div className={`w-1 h-1 rounded-full ${piStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_5px_green]' : 'bg-rose-500 shadow-[0_0_5px_red]'}`} />
              <span className="text-[8px] text-slate-500 uppercase">Pi: {piIp} ({piStatus})</span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2 bg-slate-900 rounded-xl border border-white/5 active:scale-90 transition-transform">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      <main className="flex-1 px-8 flex flex-col items-center justify-center space-y-12">
        <div className={`w-64 h-64 rounded-[3.5rem] flex flex-col items-center justify-center relative border transition-all duration-700 ${isSyncActive ? 'bg-indigo-500/5 border-indigo-500/30 shadow-[0_0_80px_-20px_rgba(79,70,229,0.2)]' : 'bg-slate-900/40 border-white/5'}`}>
          <Smartphone className={`w-16 h-16 mb-4 ${isSyncActive ? 'text-indigo-500 animate-pulse' : 'text-slate-800'}`} />
          <h2 className={`text-xl font-black uppercase tracking-widest ${isSyncActive ? 'text-white' : 'text-slate-700'}`}>
            {isSyncActive ? 'Bewaking Aan' : 'Standby'}
          </h2>
          
          {isSyncActive && (
            <div className="absolute -bottom-10 flex flex-col items-center gap-1">
              <div className="bg-slate-900 border border-indigo-500/30 px-4 py-1.5 rounded-full text-[9px] font-bold text-indigo-400 uppercase">
                {lastPingTime}
              </div>
              {lastStatus && (
                <span className={`text-[7px] font-black uppercase tracking-tighter ${lastStatus === 'success' ? 'text-emerald-500' : 'text-rose-500 animate-bounce'}`}>
                   {lastStatus === 'success' ? '✔ Laatste poging gelukt' : '✘ Pi niet bereikbaar!'}
                </span>
              )}
            </div>
          )}
        </div>

        <button 
          disabled={piStatus === 'checking'}
          onClick={() => {
            if (!settings.email || settings.contacts.length === 0) return setShowSettings(true);
            const newState = !isSyncActive;
            setIsSyncActive(newState);
            localStorage.setItem('safeguard_active', newState.toString());
            if (newState) {
              setLastStatus(null);
              setTimeout(triggerCheckin, 500);
            }
          }} 
          className={`w-full py-6 rounded-3xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isSyncActive ? 'bg-slate-900 text-rose-500 border border-rose-500/20' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/40 active:scale-95'}`}
        >
          {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Power size={18} />}
          {isSyncActive ? 'Bewaking Stoppen' : 'Start Bewaking'}
        </button>
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-8 overflow-y-auto pb-12">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-lg font-black uppercase text-indigo-400">Instellingen</h3>
             <button onClick={() => setShowSettings(false)} className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center border border-white/5"><X size={20}/></button>
          </div>
          
          <div className="space-y-8">
            <section className="space-y-4">
               <div className="flex items-center gap-2 mb-1">
                <Wifi size={14} className="text-slate-500" />
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Raspberry Pi Adres</label>
              </div>
              <input type="text" placeholder="192.168.1.38" value={piIp} onChange={e => setPiIp(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl font-mono text-sm text-indigo-400" />
            </section>

            <section className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Jouw Naam</label>
              <input type="text" placeholder="Aldo" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full p-4 bg-slate-900 rounded-2xl border border-white/5 outline-none text-sm" />
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 p-4 rounded-3xl border border-white/5">
                <label className="text-[8px] font-black text-slate-500 uppercase block mb-1">Starttijd</label>
                <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="bg-transparent w-full font-bold text-sm outline-none" />
              </div>
              <div className="bg-slate-900 p-4 rounded-3xl border border-white/5">
                <label className="text-[8px] font-black text-indigo-500 uppercase block mb-1">Deadline</label>
                <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="bg-transparent w-full font-bold text-sm outline-none" />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2"><Users size={14} className="text-indigo-400"/><h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Ontvangers</h4></div>
                <button onClick={() => setSettings(prev => ({ ...prev, contacts: [...prev.contacts, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '', apiKey: '' }] }))} className="p-2 bg-indigo-600 rounded-xl"><Plus size={16} /></button>
              </div>

              {settings.contacts.map((c) => (
                <div key={c.id} className="p-5 bg-slate-900 rounded-3xl border border-white/5 space-y-3 relative">
                  <div className="absolute top-4 right-4 flex gap-2">
                     <button onClick={() => testSingleContact(c.name, c.phone, c.apiKey, c.id)} className="text-indigo-400">{testStatus === c.id ? <CheckCircle2 size={16}/> : <Send size={16}/>}</button>
                     <button onClick={() => setSettings(prev => ({ ...prev, contacts: prev.contacts.filter(x => x.id !== c.id) }))} className="text-rose-500/40"><Trash2 size={16} /></button>
                  </div>
                  <input type="text" placeholder="Naam Ontvanger" value={c.name} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, name: e.target.value} : x)})} className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-xs outline-none" />
                  <input type="text" placeholder="316..." value={c.phone} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, phone: e.target.value} : x)})} className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-xs outline-none" />
                  <input type="password" placeholder="API Key" value={c.apiKey} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, apiKey: e.target.value} : x)})} className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-[10px] font-mono outline-none" />
                </div>
              ))}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
