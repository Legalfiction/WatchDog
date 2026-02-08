
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
  CheckCircle2,
  Info,
  Send,
  Wifi,
  WifiOff
} from 'lucide-react';
import { UserSettings, EmergencyContact } from './types';

const PI_URL = "http://192.168.1.38:5000";

export default function App() {
  const [isSyncActive, setIsSyncActive] = useState(() => localStorage.getItem('safeguard_active') === 'true');
  const [showSettings, setShowSettings] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<string>(localStorage.getItem('safeguard_last_ping') || '--:--');
  const [isStandalone, setIsStandalone] = useState(false);
  const [piStatus, setPiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isSending, setIsSending] = useState(false);
  
  const lastCheckinRef = useRef<number>(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

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
    const checkPi = async () => {
      try {
        // Fix: Use AbortSignal.timeout instead of AbortController.timeout as it is the correct static method for AbortSignal
        const res = await fetch(`${PI_URL}/status`, { signal: AbortSignal.timeout(3000) });
        setPiStatus(res.ok ? 'online' : 'offline');
      } catch {
        setPiStatus('offline');
      }
    };
    checkPi();
    const interval = setInterval(checkPi, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  useEffect(() => {
    localStorage.setItem('safeguard_settings', JSON.stringify(settings));
  }, [settings]);

  const sendPingToPi = useCallback(async (isAuto = true) => {
    if (!settings.email || !isSyncActive) return;
    const now = Date.now();
    // Auto-pings maximaal elke 2 minuten
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
          type: isAuto ? 'focus' : 'manual'
        })
      });
      
      if (res.ok) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastPingTime(timeStr);
        localStorage.setItem('safeguard_last_ping', timeStr);
        lastCheckinRef.current = now;
      }
    } catch (err) {
      setPiStatus('offline');
    }
  }, [settings, isSyncActive]);

  const triggerImmediateCheckin = async () => {
    if (!settings.email || settings.contacts.length === 0) return;
    setIsSending(true);
    try {
      await fetch(`${PI_URL}/immediate_checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: settings.email,
          contacts: settings.contacts
        })
      });
      sendPingToPi(false);
    } catch (err) {
      alert("Kan geen WhatsApp sturen. Is de Raspberry Pi online?");
    } finally {
      setTimeout(() => setIsSending(false), 2000);
    }
  };

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
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden">
      <header className="flex items-center justify-between p-6 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 pt-[safe-area-inset-top]">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${isSyncActive ? 'bg-indigo-500/20' : 'bg-slate-800'}`}>
            <ShieldCheck className={`${isSyncActive ? 'text-indigo-400' : 'text-slate-500'} w-5 h-5`} />
          </div>
          <div>
            <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">SafeGuard V4.1</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${piStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Pi {piStatus}</span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-xl bg-slate-900 border border-white/5 active:scale-90 transition-all">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      <main className="flex-1 px-8 flex flex-col items-center justify-center space-y-12">
        <div className={`w-64 h-64 rounded-[3.5rem] flex flex-col items-center justify-center relative transition-all duration-1000 ${isSyncActive ? 'bg-indigo-600/5 shadow-[0_0_120px_-20px_rgba(79,70,229,0.3)] border border-indigo-500/30' : 'bg-slate-900/40 border border-white/5'}`}>
          <Smartphone className={`w-16 h-16 mb-4 ${isSyncActive ? 'text-indigo-500 animate-pulse' : 'text-slate-800'}`} />
          <div className="text-center">
            <h2 className={`text-xl font-black uppercase tracking-widest ${isSyncActive ? 'text-white' : 'text-slate-700'}`}>
              {isSyncActive ? 'Systeem Actief' : 'Systeem Standby'}
            </h2>
          </div>
          
          {isSyncActive && (
            <div className="absolute -bottom-4 bg-slate-900 border border-indigo-500/30 px-5 py-2 rounded-full shadow-2xl">
               <span className="text-[10px] text-indigo-400 font-mono font-bold tracking-tight uppercase">Check-in: {lastPingTime}</span>
            </div>
          )}
        </div>

        <div className="w-full space-y-4">
          {!isSyncActive ? (
            <button 
              disabled={piStatus !== 'online'}
              onClick={() => {
                if (!settings.email || settings.contacts.length === 0) return setShowSettings(true);
                setIsSyncActive(true);
                localStorage.setItem('safeguard_active', 'true');
                triggerImmediateCheckin();
              }} 
              className={`w-full py-6 rounded-3xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-2xl ${piStatus === 'online' ? 'bg-indigo-600 shadow-indigo-900/50 active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'}`}
            >
              {isSending ? <CheckCircle2 size={18} /> : <Power size={18} />} 
              {isSending ? 'WhatsApp Verzonden!' : 'Start Bewaking'}
            </button>
          ) : (
            <button 
              onClick={() => {
                setIsSyncActive(false);
                localStorage.setItem('safeguard_active', 'false');
              }}
              className="w-full py-5 bg-slate-900 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border border-white/10 active:scale-95 transition-all"
            >
              Bewaking Stoppen
            </button>
          )}
          
          <p className="text-[10px] text-center text-slate-600 leading-relaxed max-w-[200px] mx-auto">
            {isSyncActive 
              ? "Systeem waakt. Open de app elke dag voor de deadline om het alarm te voorkomen."
              : "Activeer het systeem om de dagelijkse controle te starten."}
          </p>
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-8 animate-in slide-in-from-bottom duration-500 overflow-y-auto pb-[safe-area-inset-bottom]">
          <div className="flex items-center justify-between mb-12">
             <h3 className="text-lg font-black uppercase tracking-widest">Instellingen</h3>
             <button onClick={() => setShowSettings(false)} className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center border border-white/5"><X size={20}/></button>
          </div>
          
          <div className="space-y-8 pb-12">
            <button 
              onClick={triggerImmediateCheckin}
              className="w-full p-5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <Send size={16} className="text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Test WhatsApp Verbinding</span>
            </button>

            <section className="space-y-4">
              <label className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em] ml-1">Naam Gebruiker</label>
              <input type="text" placeholder="Naam" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full p-5 bg-slate-900 rounded-2xl border border-white/5 outline-none focus