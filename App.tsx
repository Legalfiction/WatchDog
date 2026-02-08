
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
  AlertCircle,
  Clock,
  RefreshCw,
  Lock,
  MessageSquare,
  ChevronRight,
  ShieldAlert,
  Terminal
} from 'lucide-react';
import { UserSettings, EmergencyContact } from './types';

export default function App() {
  const [isSyncActive, setIsSyncActive] = useState(() => localStorage.getItem('safeguard_active') === 'true');
  const [showSettings, setShowSettings] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<string>(localStorage.getItem('safeguard_last_ping') || '--:--');
  const [lastStatus, setLastStatus] = useState<'success' | 'error' | 'retrying' | null>(null);
  const [piStatus, setPiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isManualProcessing, setIsManualProcessing] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('safeguard_server_url') || '');
  
  const lastTriggerRef = useRef<number>(0);
  const lastHeartbeatRef = useRef<number>(Date.now());
  
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

  const getCleanUrl = useCallback(() => {
    let url = serverUrl.trim();
    if (!url) return '';
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
      const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(4000) });
      setPiStatus(res.ok ? 'online' : 'offline');
    } catch (err) {
      setPiStatus('offline');
    }
  }, [getCleanUrl]);

  useEffect(() => {
    checkPiStatus();
    const interval = setInterval(checkPiStatus, 30000);
    return () => clearInterval(interval);
  }, [checkPiStatus]);

  useEffect(() => {
    localStorage.setItem('safeguard_settings', JSON.stringify(settings));
    localStorage.setItem('safeguard_server_url', serverUrl);
  }, [settings, serverUrl]);

  const triggerCheckin = useCallback(async (force = false, isManual = false) => {
    const now = Date.now();
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
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) throw new Error("Server Error");

      if (navigator.vibrate) navigator.vibrate(isManual ? [100, 50, 100, 50, 100] : [50]);

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastPingTime(timeStr);
      setLastStatus('success');
      lastTriggerRef.current = Date.now();
      localStorage.setItem('safeguard_last_ping', timeStr);
    } catch (err) {
      setLastStatus('error');
    } finally {
      setIsProcessing(false);
      setIsManualProcessing(false);
    }
  }, [settings, isSyncActive, getCleanUrl]);

  // Wake-up detectie
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastHeartbeatRef.current > 5000 && isSyncActive) {
        setTimeout(() => triggerCheckin(true), 1500); 
      }
      lastHeartbeatRef.current = now;
    }, 2000);
    return () => clearInterval(interval);
  }, [isSyncActive, triggerCheckin]);

  useEffect(() => {
    const handleFocus = () => isSyncActive && triggerCheckin();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isSyncActive, triggerCheckin]);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans select-none">
      <header className="flex items-center justify-between p-6 bg-slate-900/40 border-b border-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl transition-colors ${isSyncActive ? 'bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-slate-800'}`}>
            <ShieldCheck className={`${isSyncActive ? 'text-indigo-400' : 'text-slate-500'} w-5 h-5`} />
          </div>
          <div>
            <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">SafeGuard Watchdog</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${piStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`} />
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter italic">
                {piStatus === 'online' ? 'Verbonden met Pi' : 'Server Offline'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-900 rounded-2xl border border-white/10 active:scale-90 shadow-xl transition-transform hover:bg-slate-800">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      <main className="flex-1 px-8 flex flex-col items-center justify-center space-y-12 py-10">
        <div className="relative">
          {isSyncActive && (
            <div className="absolute inset-0 bg-indigo-500/10 blur-[60px] rounded-full animate-pulse" />
          )}
          <button 
            onClick={() => isSyncActive && triggerCheckin(true)}
            disabled={isProcessing}
            className={`group w-64 h-64 rounded-[4.5rem] flex flex-col items-center justify-center relative border transition-all duration-700 ${isSyncActive ? 'bg-slate-900/40 border-indigo-500/30 shadow-2xl active:scale-95' : 'bg-slate-900/10 border-white/5 opacity-40 grayscale'}`}
          >
            <Smartphone className={`w-14 h-14 mb-4 ${isSyncActive ? 'text-indigo-400' : 'text-slate-700'} ${isProcessing ? 'animate-bounce' : ''}`} />
            <h2 className="text-base font-black uppercase tracking-[0.2em] text-slate-200">
              {isSyncActive ? (isProcessing ? 'Syncen...' : 'Bewaakt') : 'Inactief'}
            </h2>
            
            {isSyncActive && (
              <div className="mt-4 flex flex-col items-center">
                <div className="bg-slate-950/80 px-4 py-2 rounded-full border border-white/5 flex items-center gap-2 shadow-inner">
                  <Clock size={12} className="text-indigo-500" />
                  <span className="text-xs font-black text-indigo-400 tracking-widest">{lastPingTime}</span>
                </div>
              </div>
            )}
          </button>
        </div>

        <div className="w-full space-y-4">
          {isSyncActive && (
            <button 
              onClick={() => triggerCheckin(true, true)}
              disabled={isManualProcessing}
              className="w-full py-5 bg-emerald-600/10 border border-emerald-500/20 rounded-[2rem] flex items-center justify-center gap-3 group active:scale-[0.98] transition-all hover:bg-emerald-500/5"
            >
              {isManualProcessing ? (
                <Loader2 className="animate-spin text-emerald-500" size={18} />
              ) : (
                <MessageSquare className="text-emerald-500 group-hover:scale-110 transition-transform" size={18} />
              )}
              <div className="text-left">
                <span className="block text-[11px] font-black uppercase text-emerald-500 leading-none">Stuur Geruststelling</span>
                <span className="block text-[8px] text-emerald-500/60 uppercase font-bold mt-1">Meld nu dat alles OK is</span>
              </div>
              <ChevronRight size={14} className="ml-auto mr-4 text-emerald-500/40" />
            </button>
          )}

          <button 
            onClick={() => {
              if (!serverUrl || !settings.email || settings.contacts.length === 0) return setShowSettings(true);
              const newState = !isSyncActive;
              setIsSyncActive(newState);
              localStorage.setItem('safeguard_active', newState.toString());
              if (newState) {
                setLastStatus(null);
                setTimeout(() => triggerCheckin(true), 500);
              }
            }} 
            className={`w-full py-6 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all active:scale-95 border-b-4 ${isSyncActive ? 'bg-slate-900 text-rose-500 border-rose-900' : 'bg-indigo-600 text-white border-indigo-800 shadow-2xl shadow-indigo-500/30'}`}
          >
            <Power size={18} />
            {isSyncActive ? 'Systeem Stop' : 'Activeer Bewaking'}
          </button>
          
          <div className="flex justify-center min-h-[1rem]">
             {lastStatus === 'error' && (
               <div className="flex items-center gap-2 text-rose-500 animate-in fade-in zoom-in duration-300">
                 <ShieldAlert size={12}/>
                 <span className="text-[8px] font-black uppercase tracking-widest">Verbindingsfout: Check URL</span>
               </div>
             )}
          </div>
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-8 overflow-y-auto animate-in slide-in-from-bottom duration-500">
          <div className="flex items-center justify-between mb-10">
             <div>
               <h3 className="text-xl font-black uppercase text-white italic tracking-tighter">Instellingen</h3>
               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">Configureer je Pi verbinding</p>
             </div>
             <button onClick={() => setShowSettings(false)} className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 active:scale-90 shadow-2xl hover:bg-slate-800"><X size={24}/></button>
          </div>
          
          <div className="space-y-10 pb-20">
            <section className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 space-y-5 shadow-2xl">
              <label className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em] flex items-center gap-2 px-1">
                <Globe size={14}/> Cloudflare Server URL
              </label>
              <div className="relative group">
                <Terminal size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-indigo-500 transition-colors"/>
                <input 
                  type="text" 
                  placeholder="bijv: https://xxx.trycloudflare.com" 
                  value={serverUrl} 
                  onChange={e => setServerUrl(e.target.value)} 
                  className="w-full p-5 pl-12 bg-slate-950 border border-white/5 rounded-2xl font-mono text-[13px] text-indigo-400 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-800" 
                />
              </div>
              <div className="bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10">
                <p className="text-[9px] text-indigo-300 font-bold leading-relaxed uppercase tracking-tighter">
                  Kopieer de URL uit de terminal van je Pi na het commando: <br/>
                  <code className="text-white bg-slate-950 px-1 py-0.5 rounded">cloudflared tunnel --url http://localhost:5000</code>
                </p>
              </div>
            </section>

            <section className="space-y-4 px-1">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Jouw Naam (Meldingen)</label>
              <input type="text" placeholder="Naam" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full p-5 bg-slate-900 rounded-2xl border border-white/5 outline-none text-base focus:border-indigo-500 focus:bg-slate-800 transition-all shadow-inner" />
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                <label className="text-[9px] font-black text-slate-600 uppercase block mb-3 tracking-widest">Start Tijd</label>
                <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="bg-transparent w-full font-black text-2xl outline-none text-white appearance-none" />
              </div>
              <div className="bg-slate-900 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                <label className="text-[9px] font-black text-indigo-500 uppercase block mb-3 tracking-widest italic">Deadline</label>
                <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="bg-transparent w-full font-black text-2xl outline-none text-indigo-400 appearance-none" />
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex flex-col">
                  <h4 className="text-[12px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2 italic">
                    <Users size={16}/> Alarm Ontvangers
                  </h4>
                  <span className="text-[8px] font-bold text-slate-600 uppercase mt-1 tracking-tighter">Zij hoeven geen app te installeren</span>
                </div>
                <button onClick={() => setSettings(prev => ({ ...prev, contacts: [...prev.contacts, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '', apiKey: '' }] }))} className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 active:scale-90 transition-transform"><Plus size={24} /></button>
              </div>

              <div className="space-y-4">
                {settings.contacts.map((c) => (
                  <div key={c.id} className="p-6 bg-slate-900 rounded-[2.5rem] border border-white/5 space-y-4 relative group animate-in zoom-in duration-300">
                    <div className="absolute top-6 right-6 flex gap-3">
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
                       }} className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center active:scale-90 border border-emerald-500/20 transition-all hover:bg-emerald-500/20 shadow-sm">
                          {testStatus === c.id ? <CheckCircle2 size={18}/> : <Send size={18}/>}
                       </button>
                       <button onClick={() => setSettings(prev => ({ ...prev, contacts: prev.contacts.filter(x => x.id !== c.id) }))} className="w-10 h-10 text-rose-500/40 hover:text-rose-500 flex items-center justify-center active:scale-90 transition-colors"><Trash2 size={20} /></button>
                    </div>
                    <div className="space-y-4 pt-4">
                      <input type="text" placeholder="Naam Vriend" value={c.name} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, name: e.target.value} : x)})} className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-sm outline-none focus:border-indigo-500/40 transition-all shadow-inner" />
                      <input type="text" placeholder="WhatsApp (316...)" value={c.phone} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, phone: e.target.value} : x)})} className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-sm outline-none focus:border-indigo-500/40 transition-all shadow-inner" />
                      <input type="password" placeholder="CallMeBot API Key" value={c.apiKey} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, apiKey: e.target.value} : x)})} className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-[11px] font-mono outline-none focus:border-indigo-500/40 transition-all shadow-inner" />
                    </div>
                  </div>
                ))}
                {settings.contacts.length === 0 && (
                  <div className="p-10 border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center opacity-40">
                    <Users size={40} className="mb-4 text-slate-700"/>
                    <p className="text-[10px] font-black uppercase tracking-widest">Geen ontvangers ingesteld</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
