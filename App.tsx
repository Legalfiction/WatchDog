import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Smartphone,
  X,
  Trash2,
  Plus,
  User,
  Battery,
  Plane,
  History,
  Clock,
  Globe,
  Info,
  RefreshCw,
  MessageCircle,
  Dog,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  Phone
} from 'lucide-react';
import { UserSettings, EmergencyContact, ActivityLog } from './types';

const VERSION = '9.0.1';
const DEFAULT_URL = 'https://inspector-basket-cause-favor.trycloudflare.com';
const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [lastSuccessTime, setLastSuccessTime] = useState<string | null>(localStorage.getItem('safeguard_last_success'));
  const [piStatus, setPiStatus] = useState<'online' | 'offline' | 'checking' | 'error'>('checking');
  const [isProcessing, setIsProcessing] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [history, setHistory] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('safeguard_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('safeguard_server_url') || DEFAULT_URL);
  const lastTriggerRef = useRef<number>(0);
  
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('safeguard_settings');
    const parsed = saved ? JSON.parse(saved) : null;
    
    return { 
      email: parsed?.email || '', 
      myPhone: parsed?.myPhone || parsed?.phone || '',
      startTime: parsed?.startTime || '07:00', 
      endTime: parsed?.endTime || '08:30', 
      contacts: parsed?.contacts || [],
      vacationMode: parsed?.vacationMode || false,
      activeDays: parsed?.activeDays || [0, 1, 2, 3, 4, 5, 6] 
    };
  });

  const getDaySummary = () => {
    if (settings.activeDays.length === 7) return "Elke dag";
    if (settings.activeDays.length === 0) return "Geen actieve dagen";
    return settings.activeDays.sort((a,b) => a-b).map(d => DAYS[d]).join(', ');
  };

  const isTodayActive = () => {
    const jsDay = new Date().getDay(); 
    const pyDay = (jsDay + 6) % 7; 
    return settings.activeDays.includes(pyDay);
  };

  const updateHistory = (timeStr: string, batt: number | null) => {
    const newLog = { timestamp: Date.now(), timeStr, battery: batt || undefined };
    const updated = [newLog, ...history].slice(0, 7);
    setHistory(updated);
    setLastSuccessTime(timeStr);
    localStorage.setItem('safeguard_history', JSON.stringify(updated));
    localStorage.setItem('safeguard_last_success', timeStr);
  };

  const getBattery = async () => {
    try {
      if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        const batt: any = await (navigator as any).getBattery();
        const level = Math.round(batt.level * 100);
        setBatteryLevel(level);
        return level;
      }
    } catch (e) {}
    return null;
  };

  const getCleanUrl = useCallback((urlInput?: string) => {
    let url = (urlInput || serverUrl).trim().replace(/\s/g, '');
    if (!url) return '';
    if (!url.startsWith('http')) url = `https://${url}`;
    return url.replace(/\/$/, '');
  }, [serverUrl]);

  const triggerCheckin = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastTriggerRef.current < 15000) return; 

    const url = getCleanUrl();
    if (!url || !settings.email || !settings.myPhone) return;

    setIsProcessing(true);
    const batt = await getBattery();

    const payload = {
        user: settings.email.trim(),
        phone: settings.myPhone.trim(), 
        battery: batt,
        startTime: settings.startTime,
        endTime: settings.endTime,
        contacts: settings.contacts,
        vacationMode: settings.vacationMode,
        activeDays: settings.activeDays
    };

    try {
      const response = await fetch(`${url}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'cors'
      });
      
      if (response.ok) {
        setPiStatus('online');
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        updateHistory(timeStr, batt);
        lastTriggerRef.current = Date.now();
      } else {
        setPiStatus('error');
      }
    } catch (err) { 
      setPiStatus('offline'); 
    } finally { 
      setIsProcessing(false); 
    }
  }, [settings, getCleanUrl]);

  const checkPiStatus = useCallback(async (silent = false) => {
    const url = getCleanUrl();
    if (!url) { setPiStatus('offline'); return; }
    if (!silent) setPiStatus('checking');
    try {
      const res = await fetch(`${url}/status?user=${encodeURIComponent(settings.email.trim())}`, { 
        method: 'GET',
        mode: 'cors'
      });
      if (res.ok) setPiStatus('online');
      else setPiStatus('error');
    } catch (err) { setPiStatus('offline'); }
  }, [getCleanUrl, settings.email]);

  const shareActivation = (contact: EmergencyContact) => {
    const botLink = `https://wa.me/34623789580?text=${encodeURIComponent("I allow callmebot to send me messages")}`;
    const message = `Hoi ${contact.name}, ik gebruik de Watchdog app. Wil je op deze link klikken en 'verzend' drukken in WhatsApp? Dan kan het systeem je berichten sturen als er iets is: ${botLink}`;
    window.open(`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  useEffect(() => {
    checkPiStatus();
    triggerCheckin(true); 
    const interval = setInterval(() => {
      checkPiStatus(true);
      triggerCheckin();
    }, 30000); 
    return () => clearInterval(interval);
  }, [checkPiStatus, triggerCheckin]);

  useEffect(() => {
    localStorage.setItem('safeguard_settings', JSON.stringify(settings));
    localStorage.setItem('safeguard_server_url', serverUrl);
  }, [settings, serverUrl]);

  const handleSettingsUpdate = (newSettings: UserSettings) => {
    setSettings(newSettings);
    setTimeout(() => triggerCheckin(true), 200);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans select-none overflow-x-hidden">
      <header className="flex items-center justify-between p-6 bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-100">
            <Dog size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xs font-black uppercase tracking-widest text-slate-900">Watchdog</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${piStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{piStatus === 'online' ? 'Verbonden' : 'Geen Verbinding'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowManual(true)} className="p-3 bg-orange-50 rounded-2xl border border-orange-100"><Info size={20} className="text-orange-600" /></button>
          <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-100 rounded-2xl"><SettingsIcon size={20} className="text-slate-600" /></button>
        </div>
      </header>

      <main className="flex-1 px-6 flex flex-col space-y-5 py-6 pb-12">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 flex flex-col gap-6 shadow-none">
           <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 border border-orange-100">
                  <User size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Monitor Actief</p>
                  <p className="text-base font-bold text-slate-900">{settings.email || 'Naam instellen...'}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{settings.myPhone || 'Nummer instellen...'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-100">
                <Battery size={16} />
                <span className="text-xs font-black">{batteryLevel !== null ? `${batteryLevel}%` : '--'}</span>
              </div>
           </div>
           
           <div className={`rounded-2xl p-6 flex items-center justify-between border transition-colors ${lastSuccessTime ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck size={14} className={lastSuccessTime ? 'text-emerald-500' : 'text-slate-300'} />
                  <p className={`text-[10px] font-black uppercase tracking-tight ${lastSuccessTime ? 'text-emerald-600' : 'text-slate-400'}`}>
                    Systeem Status: {lastSuccessTime ? 'VEILIG' : 'WACHTEN'}
                  </p>
                </div>
                <p className={`text-3xl font-black ${lastSuccessTime ? 'text-emerald-900' : 'text-slate-200'}`}>{lastSuccessTime || '--:--'}</p>
              </div>
              {isProcessing ? <RefreshCw size={24} className="text-orange-500 animate-spin" /> : <CheckCircle2 size={32} className={lastSuccessTime ? 'text-emerald-500' : 'text-slate-200'} />}
           </div>

           <div className="flex items-center gap-3 px-1">
              <Clock size={16} className="text-rose-500" />
              <p className="text-[11px] font-bold text-slate-600">Deadline: <span className="text-rose-600 font-black">{settings.endTime} uur</span></p>
           </div>
        </div>

        <div className="bg-orange-500 rounded-3xl p-6 text-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-100 mb-2">Schema</p>
          <h2 className="text-xl font-bold mb-1">{getDaySummary()}</h2>
          <p className="text-xs text-orange-50 opacity-90 leading-relaxed italic">Watchdog controleert of je de app opent tussen {settings.startTime} en {settings.endTime}.</p>
        </div>

        <button 
          onClick={() => handleSettingsUpdate({...settings, vacationMode: !settings.vacationMode})}
          className={`w-full p-5 rounded-3xl border transition-all flex items-center justify-between ${settings.vacationMode ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center gap-4 text-left">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings.vacationMode ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}><Plane size={20} /></div>
            <div>
              <p className="text-sm font-bold text-slate-900">Vakantie Modus</p>
              <p className="text-[10px] text-slate-500 italic">Bewaking tijdelijk gepauzeerd</p>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.vacationMode ? 'bg-amber-500' : 'bg-slate-200'}`}>
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.vacationMode ? 'translate-x-6' : 'translate-x-0'}`} />
          </div>
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <History size={14} className="text-slate-400" />
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Activiteit</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {history.length === 0 ? <p className="p-8 text-center text-slate-300 text-[10px] font-bold uppercase">Geen data</p> : history.map((log, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-xs font-black text-slate-900">{log.timeStr} <span className="text-slate-300 ml-2 font-normal">| {new Date(log.timestamp).toLocaleDateString('nl-NL', {weekday: 'short'})}</span></p>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{log.battery}%</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-xl font-black uppercase italic text-slate-900">Instellingen</h3>
             <button onClick={() => { setShowSettings(false); triggerCheckin(true); }} className="p-3 bg-slate-100 rounded-2xl"><X size={24}/></button>
          </div>
          
          <div className="space-y-6 pb-20">
            <section className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 italic"><Globe size={14}/> Cloudflare Tunnel URL</label>
              <input type="text" value={serverUrl} onChange={e => setServerUrl(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-xl font-mono text-xs outline-none focus:border-orange-500" placeholder="https://..." />
            </section>

            <div className="grid grid-cols-1 gap-4">
              <section className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1 italic">Jouw Naam</label>
                <input type="text" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
              </section>
              <section className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1 italic">Mijn Mobiel (Bewaakt Nummer)</label>
                <input type="text" placeholder="Bijv. 0612345678" value={settings.myPhone} onChange={e => setSettings({...settings, myPhone: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm" />
              </section>
            </div>

            <section className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1 italic">Start Venster</label>
                <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-rose-500 px-1 italic">Deadline</label>
                <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-rose-600" />
              </div>
            </section>

            <section className="space-y-4 pt-4 border-t">
               <div className="flex items-center justify-between px-1">
                  <h4 className="text-[10px] font-black uppercase text-orange-600 tracking-widest italic">Noodcontacten</h4>
                  <button onClick={() => setSettings(prev => ({ ...prev, contacts: [...prev.contacts, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '', apiKey: '' }] }))} className="w-10 h-10 bg-orange-500 rounded-xl text-white flex items-center justify-center shadow-md shadow-orange-100"><Plus size={20} /></button>
               </div>
               {settings.contacts.map((c) => (
                  <div key={c.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <input type="text" placeholder="Naam" value={c.name} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, name: e.target.value} : x)})} className="bg-transparent font-bold text-slate-900 outline-none w-full" />
                      <button onClick={() => setSettings(prev => ({ ...prev, contacts: prev.contacts.filter(x => x.id !== c.id) }))} className="text-rose-400 p-2"><Trash2 size={18} /></button>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Nummer" value={c.phone} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, phone: e.target.value} : x)})} className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-sm" />
                      <button onClick={() => shareActivation(c)} className="p-3 bg-emerald-500 text-white rounded-xl"><MessageCircle size={20} /></button>
                    </div>
                    <input type="password" placeholder="CallMeBot API Key" value={c.apiKey} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, apiKey: e.target.value} : x)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm" />
                  </div>
                ))}
            </section>
          </div>
        </div>
      )}

      {showManual && (
        <div className="fixed inset-0 z-[120] bg-white p-8 overflow-y-auto animate-in slide-in-from-bottom-4">
           <div className="flex justify-between items-center mb-8 text-orange-600"><BookOpen size={24} /><button onClick={() => setShowManual(false)} className="p-3 bg-slate-100 rounded-2xl text-slate-900"><X size={24}/></button></div>
           <div className="space-y-6">
              <section className="bg-orange-50 p-6 rounded-3xl border border-orange-100 italic text-orange-950 leading-relaxed">"Watchdog is een passieve bewaker. Je hoeft de app alleen maar 1x per dag te openen binnen je venster. De rest gaat vanzelf."</section>
              <div className="space-y-4">
                {[
                  { n: 1, t: "Automatische Check", d: "Open de app en je veiligheid is direct bevestigd op de server." },
                  { n: 2, t: "Stille Bewaking", d: "De Raspberry Pi houdt bij of je je hebt gemeld." },
                  { n: 3, t: "Noodgeval", d: "Geen activiteit voor de deadline? Dan gaan er direct WhatsApp berichten naar je noodgecontacten." }
                ].map(s => (
                  <div key={s.n} className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl">
                     <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold">{s.n}</span>
                     <div><p className="text-xs font-bold text-slate-900">{s.t}</p><p className="text-[10px] text-slate-500 mt-0.5">{s.d}</p></div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowManual(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest">Begrepen</button>
           </div>
        </div>
      )}
    </div>
  );
}