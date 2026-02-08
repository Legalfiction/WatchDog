
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
  Globe,
  Clock,
  ChevronRight,
  ShieldAlert,
  Terminal,
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Zap,
  FlaskConical
} from 'lucide-react';
import { UserSettings, EmergencyContact } from './types';

export default function App() {
  const [isSyncActive, setIsSyncActive] = useState(() => localStorage.getItem('safeguard_active') === 'true');
  const [showSettings, setShowSettings] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<string>(localStorage.getItem('safeguard_last_ping') || '--:--');
  const [serverLastPing, setServerLastPing] = useState<string>('--:--:--');
  const [piStatus, setPiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isManualProcessing, setIsManualProcessing] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('safeguard_server_url') || '');
  
  const lastTriggerRef = useRef<number>(0);
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

  const getCleanUrl = useCallback((urlInput?: string) => {
    let url = (urlInput || serverUrl).trim();
    if (!url) return '';
    url = url.replace(/\s/g, '');
    if (!url.startsWith('http')) url = `https://${url}`;
    return url.replace(/\/$/, '');
  }, [serverUrl]);

  const cleanPhone = (num: string) => num.replace(/^\+|00/, '').replace(/\s+/g, '');

  const checkPiStatus = useCallback(async () => {
    const url = getCleanUrl();
    if (!url) {
      setPiStatus('offline');
      return;
    }
    try {
      setPiStatus('checking');
      const res = await fetch(`${url}/status?user=${encodeURIComponent(settings.email)}`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000),
        mode: 'cors'
      });
      
      if (res.ok) {
        const data = await res.json();
        setPiStatus('online');
        setConnectionError(null);
        if (data.your_last_ping) setServerLastPing(data.your_last_ping);
      } else {
        setPiStatus('offline');
      }
    } catch (err: any) {
      setPiStatus('offline');
      setConnectionError(err.message || 'Geen verbinding');
    }
  }, [getCleanUrl, settings.email]);

  useEffect(() => {
    checkPiStatus();
    const interval = setInterval(() => {
      checkPiStatus();
      if (isSyncActive) triggerCheckin();
    }, 45000);
    return () => clearInterval(interval);
  }, [checkPiStatus, isSyncActive]);

  const triggerCheckin = useCallback(async (force = false, isManual = false) => {
    const now = Date.now();
    // In testmodus laten we pings vaker toe
    if (!force && now - lastTriggerRef.current < 15000) return; 
    
    const url = getCleanUrl();
    if (!url || !settings.email || !isSyncActive) return;

    if (isManual) setIsManualProcessing(true);
    else setIsProcessing(true);

    try {
      const endpoint = isManual ? '/manual_checkin' : '/ping';
      const response = await fetch(`${url}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: settings.email,
          startTime: settings.startTime,
          endTime: settings.endTime,
          contacts: settings.contacts.map(c => ({ ...c, phone: cleanPhone(c.phone) }))
        }),
        mode: 'cors',
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastPingTime(timeStr);
        lastTriggerRef.current = Date.now();
        localStorage.setItem('safeguard_last_ping', timeStr);
        
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 2000);
        setTimeout(checkPiStatus, 1000);
      }
    } catch (err: any) {
      setPiStatus('offline');
    } finally {
      setIsProcessing(false);
      setIsManualProcessing(false);
    }
  }, [settings, isSyncActive, getCleanUrl, checkPiStatus]);

  useEffect(() => {
    const handleFocus = () => {
      if (isSyncActive) {
        checkPiStatus();
        triggerCheckin(true);
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocus();
    });
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [isSyncActive, triggerCheckin, checkPiStatus]);

  useEffect(() => {
    localStorage.setItem('safeguard_settings', JSON.stringify(settings));
    localStorage.setItem('safeguard_server_url', serverUrl);
  }, [settings, serverUrl]);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans select-none">
      <header className="flex items-center justify-between p-6 bg-slate-900/40 border-b border-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl transition-all duration-500 ${isSyncActive ? 'bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-slate-800'}`}>
            <FlaskConical className={`${isSyncActive ? 'text-amber-400' : 'text-slate-500'} w-5 h-5`} />
          </div>
          <div>
            <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">SafeGuard <span className="text-amber-500">TestMode</span></h1>
            <div className="flex items-center gap-1.5 mt-0.5" onClick={() => checkPiStatus()}>
              <div className={`w-1.5 h-1.5 rounded-full ${piStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : piStatus === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`} />
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter italic">
                {piStatus === 'online' ? 'Gekoppeld' : piStatus === 'checking' ? 'Zoeken...' : 'Pi Offline'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-900 rounded-2xl border border-white/10 active:scale-90 shadow-xl transition-transform hover:bg-slate-800">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      <main className="flex-1 px-8 flex flex-col items-center justify-center space-y-12 py-10">
        
        {/* Test Mode Banner */}
        <div className="w-full bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-3">
          <FlaskConical className="text-amber-500 shrink-0" size={20} />
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter leading-tight">
            Test-Modus Actief: Je ontvangt een WhatsApp bij ELKE ping.
          </p>
        </div>

        <div className="relative">
          {showPulse && (
            <div className="absolute inset-0 bg-emerald-500/20 blur-[80px] rounded-full animate-ping" />
          )}
          {isSyncActive && piStatus === 'online' && (
            <div className="absolute inset-0 bg-amber-500/10 blur-[60px] rounded-full animate-pulse" />
          )}
          
          <button 
            onClick={() => isSyncActive && triggerCheckin(true)}
            disabled={isProcessing}
            className={`group w-64 h-64 rounded-[4.5rem] flex flex-col items-center justify-center relative border transition-all duration-700 ${isSyncActive && piStatus === 'online' ? 'bg-slate-900/40 border-amber-500/30 shadow-2xl active:scale-95' : 'bg-slate-900/10 border-white/5 opacity-40 grayscale'}`}
          >
            <div className="relative">
              <Smartphone className={`w-14 h-14 mb-4 transition-colors ${isSyncActive ? 'text-amber-400' : 'text-slate-700'} ${isProcessing ? 'animate-bounce' : ''}`} />
              {showPulse && <Zap size={20} className="absolute -top-2 -right-4 text-emerald-500 animate-bounce" />}
            </div>
            
            <h2 className="text-base font-black uppercase tracking-[0.2em] text-slate-200">
              {isSyncActive ? (isProcessing ? 'Syncen...' : 'Testen') : 'Inactief'}
            </h2>
            
            {isSyncActive && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <div className="bg-slate-950/80 px-4 py-2 rounded-full border border-white/5 flex items-center gap-2 shadow-inner">
                  <Activity size={10} className={showPulse ? "text-emerald-500" : "text-slate-500"} />
                  <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${showPulse ? 'text-emerald-500' : 'text-slate-400'}`}>
                    Pi Gezien: {serverLastPing}
                  </span>
                </div>
              </div>
            )}
          </button>
        </div>

        <div className="w-full space-y-4">
          <button 
            onClick={() => {
              if (!serverUrl || !settings.email || settings.contacts.length === 0) return setShowSettings(true);
              const newState = !isSyncActive;
              setIsSyncActive(newState);
              localStorage.setItem('safeguard_active', newState.toString());
              if (newState) {
                checkPiStatus();
                setTimeout(() => triggerCheckin(true), 1000);
              }
            }} 
            className={`w-full py-6 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all active:scale-95 border-b-4 ${isSyncActive ? 'bg-slate-900 text-rose-500 border-rose-900' : 'bg-amber-600 text-white border-amber-800 shadow-2xl shadow-amber-500/30'}`}
          >
            <Power size={18} />
            {isSyncActive ? 'Stop Test' : 'Start Test'}
          </button>
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-8 overflow-y-auto animate-in slide-in-from-bottom duration-500">
          <div className="flex items-center justify-between mb-10">
             <div>
               <h3 className="text-xl font-black uppercase text-white italic tracking-tighter">Instellingen</h3>
               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Verbinding & Schema</p>
             </div>
             <button onClick={() => setShowSettings(false)} className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 active:scale-90 shadow-2xl"><X size={24}/></button>
          </div>
          
          <div className="space-y-10 pb-20">
            <section className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 space-y-5">
              <label className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em] flex items-center gap-2 px-1">
                <Globe size={14}/> Server URL
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="https://xxx.trycloudflare.com" 
                  value={serverUrl} 
                  onChange={e => setServerUrl(e.target.value)} 
                  className="flex-1 p-5 bg-slate-950 border border-white/5 rounded-2xl font-mono text-[13px] text-indigo-400 focus:border-indigo-500 outline-none transition-all" 
                />
                <button 
                  onClick={async () => {
                    setConnectionTesting(true);
                    await checkPiStatus();
                    setConnectionTesting(false);
                  }}
                  className="w-14 bg-slate-950 border border-white/5 rounded-2xl flex items-center justify-center active:scale-90 text-slate-500"
                >
                  <RefreshCw size={20} className={connectionTesting ? 'animate-spin' : ''} />
                </button>
              </div>
            </section>

            <section className="space-y-4 px-1">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Jouw Naam</label>
              <input type="text" placeholder="Naam" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full p-5 bg-slate-900 rounded-2xl border border-white/5 outline-none text-base focus:border-indigo-500" />
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[12px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2 italic">
                  <Users size={16}/> Ontvangers
                </h4>
                <button onClick={() => setSettings(prev => ({ ...prev, contacts: [...prev.contacts, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '', apiKey: '' }] }))} className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center active:scale-90"><Plus size={20} /></button>
              </div>

              <div className="space-y-4">
                {settings.contacts.map((c) => (
                  <div key={c.id} className="p-6 bg-slate-900 rounded-[2.5rem] border border-white/5 space-y-4">
                    <div className="flex justify-between">
                      <input type="text" placeholder="Naam" value={c.name} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, name: e.target.value} : x)})} className="bg-transparent font-bold text-white outline-none w-1/2" />
                      <div className="flex gap-2">
                        <button onClick={async () => {
                          const url = getCleanUrl();
                          if (!url) return;
                          setTestStatus(c.id);
                          await fetch(`${url}/test_contact`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: c.name, phone: cleanPhone(c.phone), apiKey: c.apiKey })
                          });
                          setTimeout(() => setTestStatus(null), 2000);
                        }} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg">
                          {testStatus === c.id ? <CheckCircle2 size={18}/> : <Send size={18}/>}
                        </button>
                        <button onClick={() => setSettings(prev => ({ ...prev, contacts: prev.contacts.filter(x => x.id !== c.id) }))} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg"><Trash2 size={18} /></button>
                      </div>
                    </div>
                    <input type="text" placeholder="WhatsApp (316...)" value={c.phone} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, phone: e.target.value} : x)})} className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-sm outline-none" />
                    <input type="password" placeholder="API Key" value={c.apiKey} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, apiKey: e.target.value} : x)})} className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-sm outline-none" />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
