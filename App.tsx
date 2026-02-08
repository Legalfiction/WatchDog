
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
  ShieldAlert
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

  // Automatische achtergrond pings
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
      {/* Header */}
      <header className="flex items-center justify-between p-6 bg-slate-900/40 border-b border-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl transition-colors ${isSyncActive ? 'bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-slate-800'}`}>
            <ShieldCheck className={`${isSyncActive ? 'text-indigo-400' : 'text-slate-500'} w-5 h-5`} />
          </div>
          <div>
            <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">SafeGuard Watchdog</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1 h-1 rounded-full ${piStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-rose-500'}`} />
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">Server: {piStatus}</span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-900 rounded-2xl border border-white/10 active:scale-90 shadow-xl transition-transform">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      <main className="flex-1 px-8 flex flex-col items-center justify-center space-y-12 py-10">
        {/* Main Status Circle */}
        <div className="relative">
          {isSyncActive && (
            <div className="absolute inset-0 bg-indigo-500/10 blur-[60px] rounded-full animate-pulse" />
          )}
          <button 
            onClick={() => isSyncActive && triggerCheckin(true)}
            disabled={isProcessing}
            className={`group w-60 h-60 rounded-[4rem] flex flex-col items-center justify-center relative border transition-all duration-700 ${isSyncActive ? 'bg-slate-900/40 border-indigo-500/30 shadow-2xl active:scale-95' : 'bg-slate-900/10 border-white/5 opacity-40'}`}
          >
            <Smartphone className={`w-12 h-12 mb-4 ${isSyncActive ? 'text-indigo-400' : 'text-slate-700'} ${isProcessing ? 'animate-bounce' : ''}`} />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">
              {isSyncActive ? (isProcessing ? 'Status Sync...' : 'Gewaakt') : 'Uitgeschakeld'}
            </h2>
            
            {isSyncActive && (
              <div className="mt-4 flex flex-col items-center">
                <div className="bg-slate-950/80 px-4 py-1.5 rounded-full border border-white/5 flex items-center gap-2">
                  <Clock size={10} className="text-indigo-500" />
                  <span className="text-[10px] font-black text-indigo-400">{lastPingTime}</span>
                </div>
              </div>
            )}
          </button>
        </div>

        {/* Action Center */}
        <div className="w-full space-y-4">
          {isSyncActive && (
            <button 
              onClick={() => triggerCheckin(true, true)}
              disabled={isManualProcessing}
              className="w-full py-5 bg-emerald-600/10 border border-emerald-500/20 rounded-[2rem] flex items-center justify-center gap-3 group active:scale-[0.98] transition-all"
            >
              {isManualProcessing ? (
                <Loader2 className="animate-spin text-emerald-500" size={18} />
              ) : (
                <MessageSquare className="text-emerald-500 group-hover:scale-110 transition-transform" size={18} />
              )}
              <div className="text-left">
                <span className="block text-[10px] font-black uppercase text-emerald-500 leading-none">Stuur Geruststelling</span>
                <span className="block text-[8px] text-emerald-500/60 uppercase font-bold mt-1">Direct WhatsApp naar vrienden</span>
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
            className={`w-full py-6 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all active:scale-95 border-b-4 ${isSyncActive ? 'bg-slate-900 text-rose-500 border-rose-900' : 'bg-indigo-600 text-white border-indigo-800 shadow-2xl shadow-indigo-500/20'}`}
          >
            <Power size={18} />
            {isSyncActive ? 'Monitor Stop' : 'Start Bewaking'}
          </button>
          
          <div className="flex justify-center">
             {lastStatus === 'error' && (
               <div className="flex items-center gap-2 text-rose-500 animate-bounce">
                 <ShieldAlert size={12}/>
                 <span className="text-[8px] font-black uppercase">Fout: Server URL onjuist?</span>
               </div>
             )}
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-8 overflow-y-auto animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between mb-10">
             <h3 className="text-xl font-black uppercase text-indigo-400 italic">Configuratie</h3>
             <button onClick={() => setShowSettings(false)} className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 active:scale-90"><X size={24}/></button>
          </div>
          
          <div className="space-y-10 pb-20">
            <section className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
              <label className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em] flex items-center gap-2">
                <Globe size={12}/> Cloudflare / Server URL
              </label>
              <input 
                type="text" 
                placeholder="bijv. mijn-pi.trycloudflare.com" 
                value={serverUrl} 
                onChange={e => setServerUrl(e.target.value)} 
                className="w-full p-5 bg-slate-950 border border-white/5 rounded-2xl font-mono text-sm text-indigo-400 focus:border-indigo-500 outline-none transition-all" 
              />
              <p className="text-[8px] text-slate-500 uppercase font-bold leading-relaxed px-2">
                Gebruik de URL die de Pi genereert na het commando <code className="text-indigo-400">cloudflared tunnel</code>.
              </p>
            </section>

            <section className="space-y-4 px-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Jouw Naam</label>
              <input type="text" placeholder="Naam" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full p-5 bg-slate-900 rounded-2xl border border-white/5 outline-none text-base focus:border-indigo-500/30" />
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 p-6 rounded-[2rem] border border-white/5">
                <label className="text-[9px] font-black text-slate-500 uppercase block mb-2">Check Vanaf</label>
                <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="bg-transparent w-full font-black text-xl outline-none text-white" />
              </div>
              <div className="bg-slate-900 p-6 rounded-[2rem] border border-white/5">
                <label className="text-[9px] font-black text-indigo-500 uppercase block mb-2">Deadline</label>
                <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="bg-transparent w-full font-black text-xl outline-none text-indigo-400" />
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[11px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2">
                  <Users size={14}/> Ontvangers
                </h4>
                <button onClick={() => setSettings(prev => ({ ...prev, contacts: [...prev.contacts, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '', apiKey: '' }] }))} className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg active:scale-90"><Plus size={20} /></button>
              </div>

              <div className="space-y-4">
                {settings.contacts.map((c) => (
                  <div key={c.id} className="p-6 bg-slate-900 rounded-[2.5rem] border border-white/5 space-y-4 relative">
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
                       }} className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center active:scale-90 border border-indigo-500/20">
                          {testStatus === c.id ? <CheckCircle2 size={18}/> : <Send size={18}/>}
                       </button>
                       <button onClick={() => setSettings(prev => ({ ...prev, contacts: prev.contacts.filter(x => x.id !== c.id) }))} className="w-10 h-10 text-rose-500/30 flex items-center justify-center active:scale-90"><Trash2 size={20} /></button>
                    </div>
                    <div className="space-y-4 pt-2">
                      <input type="text" placeholder="Naam Vriend" value={c.name} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, name: e.target.value} : x)})} className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-sm outline-none focus:border-indigo-500/40" />
                      <input type="text" placeholder="WhatsApp (316...)" value={c.phone} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, phone: e.target.value} : x)})} className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-sm outline-none focus:border-indigo-500/40" />
                      <input type="password" placeholder="CallMeBot Key" value={c.apiKey} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, apiKey: e.target.value} : x)})} className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-[10px] font-mono outline-none focus:border-indigo-500/40" />
                    </div>
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
