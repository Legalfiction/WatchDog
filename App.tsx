
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
  WifiOff,
  AlertCircle,
  Clock,
  RefreshCw,
  Link2
} from 'lucide-react';
import { UserSettings, EmergencyContact } from './types';

export default function App() {
  const [isSyncActive, setIsSyncActive] = useState(() => localStorage.getItem('safeguard_active') === 'true');
  const [showSettings, setShowSettings] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<string>(localStorage.getItem('safeguard_last_ping') || '--:--');
  const [lastStatus, setLastStatus] = useState<'success' | 'error' | 'retrying' | null>(null);
  const [piStatus, setPiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isProcessing, setIsProcessing] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [piAddress, setPiAddress] = useState(() => localStorage.getItem('safeguard_pi_ip') || '192.168.1.38');
  const [retryCount, setRetryCount] = useState(0);
  
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

  // Bouw de volledige URL. Als er geen http voor staat, voegen we het toe.
  const getBaseUrl = () => {
    let addr = piAddress.trim();
    if (!addr.startsWith('http')) addr = `http://${addr}`;
    if (!addr.includes(':') && !addr.includes('.ts.net')) addr = `${addr}:5000`; // Voeg poort toe voor IP's
    return addr;
  };

  const cleanPhone = (num: string) => num.replace(/^\+|00/, '').replace(/\s+/g, '');

  const checkPiStatus = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(`${getBaseUrl()}/status`, { signal: controller.signal });
      setPiStatus(res.ok ? 'online' : 'offline');
    } catch (err) {
      setPiStatus('offline');
    } finally {
      clearTimeout(timeoutId);
    }
  }, [piAddress]);

  useEffect(() => {
    checkPiStatus();
    const interval = setInterval(checkPiStatus, 20000);
    return () => clearInterval(interval);
  }, [checkPiStatus]);

  useEffect(() => {
    localStorage.setItem('safeguard_settings', JSON.stringify(settings));
    localStorage.setItem('safeguard_pi_ip', piAddress);
  }, [settings, piAddress]);

  const triggerCheckin = useCallback(async (force = false, attempt = 1) => {
    const now = Date.now();
    if (!force && now - lastTriggerRef.current < 15000) return; 
    
    if (!settings.email || !isSyncActive) return;

    setIsProcessing(true);
    if (attempt > 1) setLastStatus('retrying');
    setRetryCount(attempt);

    try {
      const recipients = settings.contacts.map(c => ({
        ...c, 
        phone: cleanPhone(c.phone)
      }));

      if (recipients.length === 0) {
        setIsProcessing(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${getBaseUrl()}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: settings.email,
          startTime: settings.startTime,
          endTime: settings.endTime,
          contacts: recipients
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error("Onbereikbaar");

      if (navigator.vibrate) navigator.vibrate([80, 40, 80]);

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastPingTime(timeStr);
      setLastStatus('success');
      lastTriggerRef.current = Date.now();
      localStorage.setItem('safeguard_last_ping', timeStr);
      setIsProcessing(false);
    } catch (err) {
      console.warn(`Verbinding via ${getBaseUrl()} mislukt. Poging ${attempt}...`);
      
      if (attempt < 3) {
        // Wacht op data-activatie van de telefoon
        setTimeout(() => triggerCheckin(true, attempt + 1), 3000);
      } else {
        setLastStatus('error');
        setIsProcessing(false);
      }
    }
  }, [settings, isSyncActive, piAddress]);

  const testSingleContact = useCallback(async (name: string, phone: string, apiKey: string, id: string) => {
    if (!phone || !apiKey) return;
    setTestStatus(id);
    try {
      const res = await fetch(`${getBaseUrl()}/test_contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: cleanPhone(phone), apiKey })
      });
      if (res.ok && navigator.vibrate) navigator.vibrate(50);
    } catch (err) {
      alert("Kan Pi niet bereiken. Gebruik je Tailscale of een VPN?");
    } finally {
      setTimeout(() => setTestStatus(null), 2000);
    }
  }, [piAddress]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastHeartbeatRef.current > 5000 && isSyncActive) {
        // Telefoon ontwaakt, internet herstelt...
        setTimeout(() => triggerCheckin(true), 2000); 
      }
      lastHeartbeatRef.current = now;
    }, 2000);
    return () => clearInterval(interval);
  }, [isSyncActive, triggerCheckin]);

  useEffect(() => {
    const handleWake = () => {
      if (document.visibilityState === 'visible' && isSyncActive) triggerCheckin();
    };
    window.addEventListener('focus', handleWake);
    document.addEventListener('visibilitychange', handleWake);
    window.addEventListener('online', () => isSyncActive && triggerCheckin(true));
    return () => {
      window.removeEventListener('focus', handleWake);
      document.removeEventListener('visibilitychange', handleWake);
    };
  }, [isSyncActive, triggerCheckin]);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      <header className="flex items-center justify-between p-6 bg-slate-900/40 border-b border-white/5 pt-[safe-area-inset-top]">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className={`${isSyncActive ? 'text-indigo-400' : 'text-slate-500'} w-6 h-6`} />
          <div>
            <h1 className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">SafeGuard Remote</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${piStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">System: {piStatus}</span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-900 rounded-2xl border border-white/10 active:scale-90 shadow-lg">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      <main className="flex-1 px-8 flex flex-col items-center justify-center space-y-12">
        <button 
          onClick={() => isSyncActive && triggerCheckin(true)}
          disabled={isProcessing}
          className={`group w-64 h-64 rounded-[4.5rem] flex flex-col items-center justify-center relative border-2 transition-all duration-500 ${isSyncActive ? 'bg-indigo-500/5 border-indigo-500/30 shadow-[0_0_100px_-20px_rgba(79,70,229,0.2)] active:scale-95' : 'bg-slate-900/20 border-white/5 opacity-40 grayscale'}`}
        >
          <div className="relative">
            <Smartphone className={`w-16 h-16 mb-4 ${isSyncActive ? 'text-indigo-500' : 'text-slate-800'} ${isProcessing ? 'animate-pulse' : ''}`} />
            {isProcessing && <RefreshCw className="absolute -inset-4 w-24 h-24 text-indigo-500/10 animate-spin" />}
          </div>
          
          <h2 className="text-xl font-black uppercase tracking-widest text-center px-4">
            {isSyncActive ? (isProcessing ? `Verbinden...` : 'Actief') : 'Uitgeschakeld'}
          </h2>
          
          {isSyncActive && (
            <div className="absolute -bottom-14 flex flex-col items-center gap-2 w-full">
              <div className="bg-slate-900/90 backdrop-blur border border-white/10 px-5 py-2 rounded-full flex items-center gap-2 shadow-2xl">
                <Clock size={12} className="text-indigo-400" />
                <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">{lastPingTime}</span>
              </div>
              <div className="h-4">
                {lastStatus === 'success' && <span className="text-[8px] font-black uppercase text-emerald-500 tracking-widest animate-fade-in">✔ Check-in Geslaagd</span>}
                {lastStatus === 'retrying' && <span className="text-[8px] font-black uppercase text-amber-500 tracking-widest animate-pulse">↻ Netwerk Herstellen...</span>}
                {lastStatus === 'error' && <span className="text-[8px] font-black uppercase text-rose-500 tracking-widest flex items-center gap-1"><AlertCircle size={10}/> Server Onbereikbaar</span>}
              </div>
            </div>
          )}
        </button>

        <button 
          onClick={() => {
            if (!settings.email || settings.contacts.length === 0) return setShowSettings(true);
            const newState = !isSyncActive;
            setIsSyncActive(newState);
            localStorage.setItem('safeguard_active', newState.toString());
            if (newState) {
              setLastStatus(null);
              setTimeout(() => triggerCheckin(true), 500);
            }
          }} 
          className={`w-full py-6 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all active:scale-95 border-b-4 ${isSyncActive ? 'bg-slate-900 text-rose-500 border-rose-900 shadow-xl' : 'bg-indigo-600 text-white border-indigo-800 shadow-2xl shadow-indigo-900/40'}`}
        >
          {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Power size={20} />}
          {isSyncActive ? 'Stop Monitoring' : 'Start Monitoring'}
        </button>
      </main>

      <footer className="p-4 bg-slate-900/80 border-t border-white/5 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <Globe size={14} className={navigator.onLine ? 'text-emerald-500' : 'text-rose-500'}/>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Internet: {navigator.onLine ? 'OK' : 'Nee'}</span>
          </div>
          <div className="w-px h-4 bg-white/5" />
          <div className="flex items-center gap-2">
            <Link2 size={14} className={piStatus === 'online' ? 'text-indigo-500' : 'text-slate-700'}/>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Server: {piStatus === 'online' ? 'Link' : 'Fail'}</span>
          </div>
      </footer>

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-8 overflow-y-auto pb-20 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between mb-10">
             <h3 className="text-xl font-black uppercase text-indigo-400 italic">Server & Alarm</h3>
             <button onClick={() => setShowSettings(false)} className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center border border-white/10 shadow-xl"><X size={24}/></button>
          </div>
          
          <div className="space-y-8">
            <section className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
              <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest flex items-center gap-2 ml-1">
                <Globe size={12}/> Server Adres (IP of Tailscale)
              </label>
              <input type="text" placeholder="bijv. 100.x.y.z of aldo-pi" value={piAddress} onChange={e => setPiAddress(e.target.value)} className="w-full p-5 bg-slate-950 border border-white/10 rounded-2xl font-mono text-base text-indigo-400 focus:border-indigo-500 outline-none transition-all shadow-inner" />
              <p className="text-[8px] text-slate-600 uppercase font-bold px-2 leading-relaxed">Tip: Gebruik je Tailscale adres voor bereikbaarheid buiten je eigen Wi-Fi netwerk.</p>
            </section>

            <section className="space-y-4 px-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Je Naam</label>
              <input type="text" placeholder="Aldo" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full p-5 bg-slate-900 rounded-2xl border border-white/10 outline-none text-base focus:border-indigo-500/30 shadow-sm" />
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 p-5 rounded-[2rem] border border-white/5 shadow-md">
                <label className="text-[8px] font-black text-slate-500 uppercase block mb-2">Monitor Vanaf</label>
                <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="bg-transparent w-full font-black text-lg outline-none text-white" />
              </div>
              <div className="bg-slate-900 p-5 rounded-[2rem] border border-white/5 shadow-md">
                <label className="text-[8px] font-black text-indigo-500 uppercase block mb-2">Alarm Deadline</label>
                <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="bg-transparent w-full font-black text-lg outline-none text-indigo-400" />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2"><Users size={16} className="text-indigo-400"/><h4 className="text-[11px] font-black uppercase text-indigo-400 tracking-widest">Ontvangers</h4></div>
                <button onClick={() => setSettings(prev => ({ ...prev, contacts: [...prev.contacts, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '', apiKey: '' }] }))} className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-transform"><Plus size={20} /></button>
              </div>

              {settings.contacts.map((c) => (
                <div key={c.id} className="p-6 bg-slate-900 rounded-[2.5rem] border border-white/5 space-y-4 relative shadow-2xl">
                  <div className="absolute top-6 right-6 flex gap-3">
                     <button onClick={() => testSingleContact(c.name, c.phone, c.apiKey, c.id)} className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center active:scale-90 border border-indigo-500/20">
                        {testStatus === c.id ? <CheckCircle2 size={18}/> : <Send size={18}/>}
                     </button>
                     <button onClick={() => setSettings(prev => ({ ...prev, contacts: prev.contacts.filter(x => x.id !== c.id) }))} className="w-10 h-10 text-rose-500/40 flex items-center justify-center active:scale-90"><Trash2 size={20} /></button>
                  </div>
                  <div className="space-y-3 pt-2">
                    <input type="text" placeholder="Naam (vriend/familie)" value={c.name} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, name: e.target.value} : x)})} className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-sm outline-none focus:border-white/10 transition-colors" />
                    <input type="text" placeholder="WhatsApp (bijv. 316...)" value={c.phone} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, phone: e.target.value} : x)})} className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-sm outline-none" />
                    <input type="password" placeholder="CallMeBot API Sleutel" value={c.apiKey} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, apiKey: e.target.value} : x)})} className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-[10px] font-mono outline-none" />
                  </div>
                </div>
              ))}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
