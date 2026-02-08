
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShieldCheck, 
  Settings as SettingsIcon, 
  Share2, 
  AlertTriangle,
  Smartphone,
  Activity,
  Zap,
  CheckCircle2,
  BellRing,
  Infinity,
  Wifi,
  Cpu
} from 'lucide-react';
import { UserSettings, ActivityLog, AppStatus } from './types';

export default function App() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isSyncActive, setIsSyncActive] = useState(false);
  const [isPushActive, setIsPushActive] = useState(false);
  
  const isIOS = useMemo(() => {
    return [
      'iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'
    ].includes(navigator.platform) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
  }, []);

  // AUTOMATISCHE ACTIVATIE VAN ACHTERGROND TAKEN
  const activateAlwaysOn = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // 1. Registreer Periodic Sync (Android/Chrome)
      if ('periodicSync' in registration) {
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync' as any,
        });
        
        if (status.state === 'granted') {
          await (registration as any).periodicSync.register('safeguard-ping', {
            minInterval: 15 * 60 * 1000, // Elke 15 minuten een check
          });
          setIsSyncActive(true);
        }
      }

      // 2. Registreer Push Notifications (Wake-up call)
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setIsPushActive(true);
        // Hier zou je de subscription naar de Pi sturen
      }
    } catch (err) {
      console.error("Always-on activatie fout:", err);
    }
  };

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone;
    setIsStandalone(displayMode);
    
    // Probeer direct te activeren bij laden
    if (displayMode) activateAlwaysOn();
  }, []);

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('safeguard_settings');
    const params = new URLSearchParams(window.location.search);
    const defaultSettings = {
      email: '',
      emergencyEmail: '',
      startTime: params.get('start') || '07:00',
      endTime: params.get('end') || '09:00',
      whatsappPhone: '',
      whatsappApiKey: '',
      webhookUrl: params.get('pi') || ''
    };
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const [status, setStatus] = useState<AppStatus>(AppStatus.INACTIVE);
  const [showSettings, setShowSettings] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  const sendPing = useCallback(async (type: ActivityLog['type']) => {
    if (!settings.webhookUrl || !settings.email) return;
    const timestamp = Date.now();
    try {
      const response = await fetch(`${settings.webhookUrl}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: settings.email,
          emergency: settings.emergencyEmail,
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

  useEffect(() => {
    const handleActivity = () => {
      if (document.visibilityState === 'visible') sendPing('focus');
    };
    window.addEventListener('visibilitychange', handleActivity);
    if (document.visibilityState === 'visible') sendPing('focus');
    return () => window.removeEventListener('visibilitychange', handleActivity);
  }, [sendPing]);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      <header className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <ShieldCheck className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase leading-none text-white italic">SafeGuard</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isSyncActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
              <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Autonomous Guard</span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      <main className="flex-1 px-6 space-y-6">
        {/* AUTOMATION STATUS CARDS */}
        <div className="grid grid-cols-2 gap-3">
           <div className={`p-4 rounded-2xl border transition-all ${isPushActive ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-900 border-slate-800 opacity-50'}`}>
              <BellRing className={`w-4 h-4 mb-2 ${isPushActive ? 'text-indigo-400' : 'text-slate-600'}`} />
              <p className="text-[9px] font-black uppercase tracking-wider">Remote Wake</p>
              <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">{isPushActive ? 'Gekoppeld' : 'Niet Actief'}</p>
           </div>
           <div className={`p-4 rounded-2xl border transition-all ${isSyncActive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800 opacity-50'}`}>
              <Cpu className={`w-4 h-4 mb-2 ${isSyncActive ? 'text-emerald-400' : 'text-slate-600'}`} />
              <p className="text-[9px] font-black uppercase tracking-wider">Auto-Sync</p>
              <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">{isSyncActive ? 'Permanent' : 'Stand-by'}</p>
           </div>
        </div>

        {/* MAIN STATUS DASHBOARD */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-[3rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
          <div className="relative p-10 rounded-[3rem] bg-slate-900 border border-white/5 flex flex-col items-center gap-6 text-center shadow-2xl">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-700 ${status === AppStatus.WATCHING ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-600'}`}>
                <Activity className={`w-12 h-12 ${status === AppStatus.WATCHING ? 'animate-pulse' : ''}`} />
            </div>
            <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none italic">
                  {status === AppStatus.WATCHING ? 'Systeem Live' : 'Initializing'}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Wifi className="w-3 h-3 text-emerald-500" />
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">
                    Verbonden met Pi Server
                  </p>
                </div>
            </div>
          </div>
        </div>

        {/* ONE-CLICK FIX BUTTON */}
        {!isSyncActive && isStandalone && (
           <button 
             onClick={activateAlwaysOn}
             className="w-full p-5 bg-emerald-600 rounded-[2rem] flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/20 active:scale-95 transition-transform border-b-4 border-emerald-800"
           >
              <Zap className="w-5 h-5 text-white fill-white" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Activeer Permanente Waak</span>
           </button>
        )}

        <button onClick={() => sendPing('manual')} className="w-full py-6 rounded-[2.5rem] bg-indigo-600 font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-indigo-600/20 border-b-4 border-indigo-900 active:translate-y-1 active:border-b-0 transition-all">
          Handmatige Melding
        </button>

        <div className="space-y-4 pb-32">
           <div className="flex justify-between items-center px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 italic">Netwerk Activiteit</h3>
              <div className="flex gap-1">
                 {[1,2,3].map(i => <div key={i} className="w-1 h-3 bg-indigo-500/30 rounded-full"></div>)}
              </div>
           </div>
           <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[2.5rem] text-slate-700 text-[10px] font-black uppercase tracking-widest italic">
                Wachten op eerste hartslag...
              </div>
            ) : logs.map((log, i) => (
              <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-slate-900 border border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.status === 'sent' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-200 uppercase tracking-tighter">
                      {log.type === 'focus' ? 'Systeem Check' : 'Handmatige Bevestiging'}
                    </p>
                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                      {log.status === 'sent' ? 'Succesvol gemeld op Pi' : 'Server onbereikbaar'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-slate-400 bg-slate-800 px-3 py-1 rounded-lg">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
           </div>
        </div>
      </main>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl overflow-y-auto max-h-[95vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Systeem Config</h3>
              <button onClick={() => setShowSettings(false)} className="w-10 h-10 rounded-full bg-slate-800 text-slate-400">&times;</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setShowSettings(false); }} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Jouw Email</label>
                <input type="email" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} placeholder="vriend@safe.nl" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 font-bold text-sm outline-none focus:border-indigo-500 transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-600 uppercase ml-1">Begin Monitor</label>
                  <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-4 font-bold text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-600 uppercase ml-1">Alarm Tijd</label>
                  <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-4 font-bold text-xs" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-1">Noodcontact Email</label>
                <input type="email" value={settings.emergencyEmail} onChange={e => setSettings({...settings, emergencyEmail: e.target.value})} placeholder="alarm@contact.nl" className="w-full bg-slate-950 border border-rose-900/30 rounded-2xl px-5 py-4 font-bold text-sm" />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Pi Server Adres</label>
                <input type="url" value={settings.webhookUrl} onChange={e => setSettings({...settings, webhookUrl: e.target.value})} placeholder="http://jouw-ip:5000" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-[10px] font-mono" />
              </div>

              <button type="submit" className="w-full py-5 bg-indigo-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20">
                Instellingen Opslaan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
