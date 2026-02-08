
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
  Clock
} from 'lucide-react';
import { UserSettings, ActivityLog, AppStatus } from './types';

export default function App() {
  const [isSyncActive, setIsSyncActive] = useState(false);
  const [status, setStatus] = useState<AppStatus>(AppStatus.INACTIVE);
  const [showSettings, setShowSettings] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('safeguard_settings');
    const params = new URLSearchParams(window.location.search);
    const defaultSettings = {
      email: '', // Wordt gebruikt als Naam van de vriend
      emergencyEmail: '',
      startTime: params.get('start') || '07:00',
      endTime: params.get('end') || '09:00',
      whatsappPhone: '',
      whatsappApiKey: '',
      webhookUrl: params.get('pi') || '' // Jouw Pi adres wordt automatisch ingevuld voor vrienden
    };
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('safeguard_settings', JSON.stringify(settings));
  }, [settings]);

  const sendPing = useCallback(async (type: ActivityLog['type']) => {
    if (!settings.webhookUrl || !settings.email) return;
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
        setLogs(prev => [{ timestamp, type, status: 'sent' }, ...prev].slice(0, 10));
        setStatus(AppStatus.WATCHING);
      }
    } catch (err) {
      setLogs(prev => [{ timestamp, type, status: 'failed' }, ...prev].slice(0, 10));
    }
  }, [settings]);

  const activateAlwaysOn = async () => {
    if (!settings.email || !settings.whatsappPhone) {
      alert("Vul eerst je naam en het WhatsApp nummer van je contactpersoon in bij de instellingen (tandwiel rechtsboven).");
      setShowSettings(true);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      if ('periodicSync' in registration) {
        await (registration as any).periodicSync.register('safeguard-ping', {
          minInterval: 15 * 60 * 1000, 
        });
      }
      const permission = await Notification.requestPermission();
      
      setIsSyncActive(true);
      sendPing('manual');
      alert("Systeem Geactiveerd! Je telefoon waakt nu. Je kunt dit scherm nu sluiten.");
    } catch (err) {
      // Zelfs als registratie faalt (iOS), sturen we een ping voor handmatige activatie
      sendPing('manual');
      setIsSyncActive(true);
      alert("Activatie geslaagd.");
    }
  };

  useEffect(() => {
    const handleActivity = () => {
      if (document.visibilityState === 'visible') sendPing('focus');
    };
    window.addEventListener('visibilitychange', handleActivity);
    if (document.visibilityState === 'visible') sendPing('focus');
    return () => window.removeEventListener('visibilitychange', handleActivity);
  }, [sendPing]);

  const handleShare = () => {
    // Deze link bevat automatisch jouw Pi adres zodat de vriend niets hoeft in te stellen
    const shareUrl = `${window.location.origin}${window.location.pathname}?pi=${encodeURIComponent(settings.webhookUrl)}`;
    if (navigator.share) {
      navigator.share({ 
        title: 'SafeGuard Netwerk', 
        text: `Hoi! Ik gebruik SafeGuard om op me te laten letten. Klik op deze link om ook mee te doen aan mijn netwerk.`, 
        url: shareUrl 
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("De uitnodigingslink is gekopieerd! Stuur deze naar je vrienden.");
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      <header className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <ShieldCheck className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">SafeGuard</h1>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${status === AppStatus.WATCHING ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
              <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Live Monitor</span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      <main className="flex-1 px-6 space-y-6">
        {/* DE ACTIVATIE KNOP */}
        {!isSyncActive ? (
          <div className="p-1 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-[2.5rem] shadow-xl shadow-indigo-500/20">
            <button 
              onClick={activateAlwaysOn}
              className="w-full p-6 bg-slate-950 rounded-[2.4rem] flex flex-col items-center gap-3 active:scale-95 transition-transform"
            >
              <Zap className="w-8 h-8 text-white fill-indigo-500 animate-pulse" />
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-widest text-white">Activeer Permanente Waak</p>
                <p className="text-[9px] text-slate-500 uppercase mt-1">Klik hier om het waken te starten</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-[2.5rem] flex items-center gap-4">
             <CheckCircle2 className="w-8 h-8 text-emerald-500" />
             <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-500">Bescherming Actief</p>
                <p className="text-[9px] text-slate-400 uppercase">Je telefoon meldt zich automatisch</p>
             </div>
          </div>
        )}

        {/* STATUS DASHBOARD */}
        <div className="p-10 rounded-[3rem] bg-slate-900 border border-white/5 flex flex-col items-center gap-6 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-4 right-8 opacity-10">
            <Activity className="w-20 h-20 text-indigo-500" />
          </div>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${status === AppStatus.WATCHING ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-600'}`}>
              <Smartphone className={`w-10 h-10 ${status === AppStatus.WATCHING ? 'animate-bounce' : ''}`} />
          </div>
          <div className="z-10">
              <h2 className="text-2xl font-black uppercase tracking-tighter italic">
                {status === AppStatus.WATCHING ? 'Systeem Is Live' : 'Setup Nodig'}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Wifi className="w-3 h-3 text-emerald-500" />
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
                  Verbonden met centrale server
                </p>
              </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <button onClick={() => sendPing('manual')} className="p-6 rounded-[2rem] bg-indigo-600 font-black uppercase text-[10px] tracking-widest border-b-4 border-indigo-900 active:translate-y-1 active:border-b-0 transition-all">
             Handmatige Ping
           </button>
           <button onClick={handleShare} className="p-6 rounded-[2rem] bg-slate-800 border border-slate-700 font-black uppercase text-[10px] tracking-widest text-slate-400 flex flex-col items-center gap-2">
             <UserPlus className="w-5 h-5" />
             Vriend Toevoegen
           </button>
        </div>

        {/* LOGS */}
        <div className="space-y-4 pb-32">
           <div className="flex items-center gap-2 px-2">
              <Clock className="w-3 h-3 text-slate-600" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600 italic">Activiteit Log</h3>
           </div>
           <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-[2.5rem] text-slate-700 text-[10px] font-black uppercase italic">
                Wachten op eerste hartslag...
              </div>
            ) : logs.map((log, i) => (
              <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${log.status === 'sent' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    <Activity className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-black text-slate-300 uppercase">
                    {log.type === 'focus' ? 'Automatisering' : 'Handmatige Check'}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
           </div>
        </div>
      </main>

      {/* SETTINGS */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-slate-950/95 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black uppercase italic">Jouw Gegevens</h3>
              <button onClick={() => setShowSettings(false)} className="w-10 h-10 rounded-full bg-slate-800 text-slate-400">&times;</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setShowSettings(false); }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Hoe heet je?</label>
                <input type="text" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} placeholder="Je voornaam" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 font-bold text-sm" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-600 uppercase ml-1">Waken vanaf</label>
                  <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-4 font-bold text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-rose-500 uppercase ml-1">Alarm tijd</label>
                  <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-4 font-bold text-xs" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-1">Contactpersoon WhatsApp (+316...)</label>
                <input type="tel" value={settings.whatsappPhone} onChange={e => setSettings({...settings, whatsappPhone: e.target.value})} placeholder="+31612345678" className="w-full bg-slate-950 border border-rose-900/30 rounded-2xl px-5 py-4 font-bold text-sm" required />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">CallMeBot API Key</label>
                <input type="password" value={settings.whatsappApiKey} onChange={e => setSettings({...settings, whatsappApiKey: e.target.value})} placeholder="Krijg je via WhatsApp" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-mono" required />
              </div>

              <button type="submit" className="w-full py-5 bg-indigo-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl">
                Gegevens Opslaan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
