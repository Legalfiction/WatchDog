
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Settings as SettingsIcon, 
  Smartphone,
  Activity,
  Zap,
  Wifi,
  UserPlus,
  CheckCircle2,
  Clock,
  Server,
  X,
  Send,
  MessageSquare
} from 'lucide-react';
import { UserSettings, ActivityLog, AppStatus } from './types';

export default function App() {
  const [isSyncActive, setIsSyncActive] = useState(() => localStorage.getItem('safeguard_active') === 'true');
  const [status, setStatus] = useState<AppStatus>(AppStatus.INACTIVE);
  const [showSettings, setShowSettings] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [lastPingTime, setLastPingTime] = useState<string>('--:--');

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('safeguard_settings');
    const params = new URLSearchParams(window.location.search);
    const defaultSettings = {
      email: '', 
      emergencyEmail: '',
      startTime: params.get('start') || '07:00',
      endTime: params.get('end') || '08:30',
      whatsappPhone: '',
      whatsappApiKey: '',
      webhookUrl: params.get('pi') || '' 
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
    if (!settings.webhookUrl) return;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${settings.webhookUrl}/status`, { signal: controller.signal });
      setServerOnline(res.ok);
    } catch (e) {
      setServerOnline(false);
    }
  };

  const sendPing = useCallback(async (type: ActivityLog['type']) => {
    if (!settings.webhookUrl || !settings.email || !isSyncActive) return;
    const timestamp = Date.now();
    try {
      const response = await fetch(`${settings.webhookUrl}/ping`, {
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
    if (!settings.webhookUrl || !settings.whatsappPhone || !settings.whatsappApiKey) {
      alert("Vul eerst alle gegevens in.");
      return;
    }
    try {
      const res = await fetch(`${settings.webhookUrl}/test_wa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: settings.email,
          wa_phone: settings.whatsappPhone,
          wa_key: settings.whatsappApiKey
        })
      });
      if (res.ok) alert("Test verstuurd! Controleer je WhatsApp.");
      else alert("Fout bij versturen test.");
    } catch (e) {
      alert("Kan de Pi niet bereiken.");
    }
  };

  const activateAlwaysOn = () => {
    if (!settings.email || !settings.whatsappPhone || !settings.whatsappApiKey) {
      alert("Vul eerst je Naam, WhatsApp nummer en API Key in bij instellingen.");
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
    const shareUrl = `${window.location.origin}${window.location.pathname}?pi=${encodeURIComponent(settings.webhookUrl)}`;
    if (navigator.share) {
      navigator.share({ title: 'Veiligheidssysteem', text: 'Doe je mee?', url: shareUrl });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Link gekopieerd!");
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      <header className="flex items-center justify-between p-6 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase italic leading-none">SafeGuard</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${serverOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest">
                {serverOnline ? 'PI VERBONDEN' : 'PI OFFLINE'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-3 rounded-xl bg-slate-800 border border-slate-700">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      <main className="flex-1 px-6 pt-4 pb-32 space-y-6">
        {!isSyncActive ? (
          <div className="p-1 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-[2.5rem] shadow-2xl">
            <button onClick={activateAlwaysOn} className="w-full p-8 bg-slate-950 rounded-[2.4rem] flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                <Zap className="w-8 h-8 text-white fill-indigo-500 animate-pulse" />
              </div>
              <p className="text-sm font-black uppercase tracking-widest">Activeer Waak-Modus</p>
            </button>
          </div>
        ) : (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-[2.5rem] flex items-center gap-5">
             <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
             </div>
             <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-500">Bescherming Actief</p>
                <p className="text-[9px] text-slate-400 uppercase font-bold">Laatste hartslag: {lastPingTime}</p>
             </div>
          </div>
        )}

        <div className="p-10 rounded-[3rem] bg-slate-900 border border-white/5 flex flex-col items-center gap-6 text-center shadow-2xl">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all ${status === AppStatus.WATCHING ? 'bg-indigo-500 rotate-3' : 'bg-slate-800 text-slate-600'}`}>
              <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black uppercase italic">
            {isSyncActive ? 'JE WORDT BEWAAKT' : 'SYSTEEM STANDBY'}
          </h2>
          <p className="text-xs text-slate-400 font-medium leading-relaxed px-4">
            De Raspberry Pi controleert dagelijks tussen <span className="text-indigo-400 font-bold">{settings.startTime}</span> en <span className="text-rose-400 font-bold">{settings.endTime}</span> of je jouw telefoon hebt gebruikt.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => sendPing('manual')} className="p-6 bg-indigo-600 rounded-[2rem] flex flex-col items-center gap-2 active:scale-95 transition-transform">
            <Activity className="w-6 h-6 text-white" />
            <span className="text-[10px] font-black uppercase">Handmatige Ping</span>
          </button>
          <button onClick={handleShare} className="p-6 bg-slate-800 rounded-[2rem] flex flex-col items-center gap-2 active:scale-95 transition-transform">
            <UserPlus className="w-6 h-6 text-indigo-400" />
            <span className="text-[10px] font-black uppercase">Vriend Toevoegen</span>
          </button>
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-[3rem] p-8 space-y-6 border border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase italic">Instellingen</h3>
              <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-800 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Jouw Naam</label>
                <input type="text" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} placeholder="Bijv. Jan" className="w-full p-4 bg-slate-950 rounded-2xl border border-white/5 outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Start Waak</label>
                  <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="w-full p-4 bg-slate-950 rounded-2xl border border-white/5" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Eind Waak (Check)</label>
                  <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="w-full p-4 bg-slate-950 rounded-2xl border border-white/5" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">WA Nummer Contactpersoon</label>
                <input type="text" value={settings.whatsappPhone} onChange={e => setSettings({...settings, whatsappPhone: e.target.value})} placeholder="+316..." className="w-full p-4 bg-slate-950 rounded-2xl border border-white/5" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">WhatsApp API Key</label>
                <input type="password" value={settings.whatsappApiKey} onChange={e => setSettings({...settings, whatsappApiKey: e.target.value})} placeholder="CallMeBot Key" className="w-full p-4 bg-slate-950 rounded-2xl border border-white/5" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Pi Adres (Tailscale/Lokaal)</label>
                <input type="text" value={settings.webhookUrl} onChange={e => setSettings({...settings, webhookUrl: e.target.value})} placeholder="http://192.168...:5000" className="w-full p-4 bg-slate-950 rounded-2xl border border-white/5" />
              </div>
              <button onClick={testWhatsApp} className="w-full p-4 bg-emerald-600 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <MessageSquare className="w-5 h-5" /> Test WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
