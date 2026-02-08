import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Settings as SettingsIcon, 
  Smartphone,
  Activity,
  Zap,
  UserPlus,
  CheckCircle2,
  X,
  MessageSquare,
  Info,
  RefreshCcw
} from 'lucide-react';
import { UserSettings, ActivityLog, AppStatus } from './types';

// DE DEFINITIEVE HARDE LINK NAAR JOUW RASPBERRY PI
const PI_URL = "http://192.168.1.38:5000";
const APP_VERSION = "2.6.2";

export default function App() {
  const [isSyncActive, setIsSyncActive] = useState(() => localStorage.getItem('safeguard_active') === 'true');
  const [status, setStatus] = useState<AppStatus>(AppStatus.INACTIVE);
  const [showSettings, setShowSettings] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [lastPingTime, setLastPingTime] = useState<string>('--:--');
  const [isChecking, setIsChecking] = useState(false);

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('safeguard_settings');
    const defaultSettings = {
      email: '', 
      emergencyEmail: '',
      startTime: '07:00',
      endTime: '08:30',
      whatsappPhone: '',
      whatsappApiKey: '',
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
          wa_phone: settings.whatsappPhone,
          wa_key: settings.whatsappApiKey,
          type: type
        })
      });
      if (response.ok) {
        setLogs(prev => [{ timestamp, type, status: 'sent' }, ...prev].slice(0, 5));
        setStatus(AppStatus.WATCHING);
        setServerOnline(true);
        setLastPingTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      setServerOnline(false);
    }
  }, [settings, isSyncActive]);

  const testWhatsApp = async () => {
    if (!settings.whatsappPhone || !settings.whatsappApiKey) {
      alert("Configuratie onvolledig. Vul je WhatsApp gegevens in.");
      return;
    }
    try {
      const res = await fetch(`${PI_URL}/test_wa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: settings.email,
          wa_phone: settings.whatsappPhone,
          wa_key: settings.whatsappApiKey
        })
      });
      if (res.ok) alert("Koppeling bevestigd! Check je WhatsApp.");
      else alert("WhatsApp test kon niet worden uitgevoerd op de Pi.");
    } catch (e) {
      alert("Geen verbinding met Pi op " + PI_URL);
    }
  };

  const activateAlwaysOn = () => {
    if (!settings.email || !settings.whatsappPhone || !settings.whatsappApiKey) {
      alert("Vul eerst je naam en WhatsApp gegevens in bij instellingen.");
      setShowSettings(true);
      return;
    }
    setIsSyncActive(true);
    sendPing('manual');
  };

  useEffect(() => {
    const handleActivity = () => { if (document.visibilityState === 'visible') sendPing('focus'); };
    window.addEventListener('visibilitychange', handleActivity);
    if (document.visibilityState === 'visible') sendPing('focus');
    
    const interval = setInterval(() => sendPing('focus'), 5 * 60 * 1000);
    const statusInterval = setInterval(checkServerStatus, 30000);
    
    return () => {
      window.removeEventListener('visibilitychange', handleActivity);
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, [sendPing]);

  const handleShare = () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({ title: 'SafeGuard Watchdog', text: 'Sluit je aan bij mijn veiligheidsnetwerk.', url: shareUrl });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Link gekopieerd!");
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      <header className="flex items-center justify-between p-6 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase italic leading-none tracking-tighter">SafeGuard</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${serverOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest">
                {serverOnline ? 'PI ONLINE' : 'PI OFFLINE'}
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
            <button onClick={activateAlwaysOn} className="w-full p-10 bg-slate-950 rounded-[2.4rem] flex flex-col items-center gap-4 active:scale-95 transition-all">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                <Zap className="w-10 h-10 text-white fill-indigo-500 animate-pulse" />
              </div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-indigo-400">Activeer Systeem</p>
            </button>
          </div>
        ) : (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex items-center gap-5">
             <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
             </div>
             <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-500">Monitoring Actief</p>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">Vanaf {settings.startTime} tot {settings.endTime}</p>
             </div>
          </div>
        )}

        <div className="p-10 rounded-[3rem] bg-slate-900 border border-white/5 flex flex-col items-center gap-6 text-center shadow-2xl relative overflow-hidden">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 ${isSyncActive ? 'bg-indigo-600 shadow-[0_0_30px_rgba(79,70,229,0.3)] rotate-3' : 'bg-slate-800 text-slate-600'}`}>
              <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black uppercase italic leading-tight">
            {isSyncActive ? 'SYNC VOLTOOID' : 'WACHT OP ACTIVATIE'}
          </h2>
          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Laatste Hartslag</p>
            <p className="text-4xl font-black text-white font-mono">{lastPingTime}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => sendPing('manual')} className="p-6 bg-slate-800/50 border border-white/5 rounded-[2rem] flex flex-col items-center gap-2 active:scale-95 transition-all hover:bg-slate-800">
            <Activity className="w-6 h-6 text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">Push Ping</span>
          </button>
          <button onClick={handleShare} className="p-6 bg-slate-800/50 border border-white/5 rounded-[2rem] flex flex-col items-center gap-2 active:scale-95 transition-all hover:bg-slate-800">
            <UserPlus className="w-6 h-6 text-purple-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">Deel Link</span>
          </button>
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-[3rem] p-8 space-y-6 border border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter">Instellingen</h3>
                <p className="text-[8px] text-indigo-500 font-bold uppercase tracking-[0.2em]">Build Version {APP_VERSION}</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Jouw Naam</label>
                <input type="text" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} placeholder="Bijv. Jan" className="w-full p-4 bg-slate-950 rounded-2xl border border-white/5 outline-none focus:border-indigo-500 transition-colors text-white text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Start Waak</label>
                  <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="w-full p-4 bg-slate-950 rounded-2xl border border-white/5 text-white text-sm" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Deadline</label>
                  <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="w-full p-4 bg-slate-950 rounded-2xl border border-white/5 text-white text-sm" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">WhatsApp (+316...)</label>
                <input type="text" value={settings.whatsappPhone} onChange={e => setSettings({...settings, whatsappPhone: e.target.value})} placeholder="+31612345678" className="w-full p-4 bg-slate-950 rounded-2xl border border-white/5 text-white text-sm" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">CallMeBot API Sleutel</label>
                <input type="password" value={settings.whatsappApiKey} onChange={e => setSettings({...settings, whatsappApiKey: e.target.value})} placeholder="Je API sleutel" className="w-full p-4 bg-slate-950 rounded-2xl border border-white/5 text-white text-sm" />
              </div>
              
              <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex items-start gap-3">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-[9px] text-slate-400 font-medium leading-relaxed">
                  Gekoppeld aan Pi IP: <span className="text-white font-mono">{PI_URL}</span>. 
                  Synchronisatie met GitHub status: <span className="text-emerald-500 font-bold uppercase">Hersteld v{APP_VERSION}</span>
                </div>
              </div>

              <button onClick={testWhatsApp} className="w-full p-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-900/20">
                <MessageSquare className="w-5 h-5" /> Test WhatsApp Koppeling
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
