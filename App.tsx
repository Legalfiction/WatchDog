
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldCheck, 
  Settings as SettingsIcon, 
  Smartphone,
  X,
  Trash2,
  Plus,
  Power,
  User,
  Battery,
  Plane,
  CalendarDays,
  History,
  Zap,
  Clock,
  Globe,
  HelpCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { UserSettings, EmergencyContact, ActivityLog } from './types';

const VERSION = '8.1.0';
const DEFAULT_URL = 'https://inspector-basket-cause-favor.trycloudflare.com';
const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

export default function App() {
  const [isSyncActive, setIsSyncActive] = useState(() => localStorage.getItem('safeguard_active') === 'true');
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [serverLastPing, setServerLastPing] = useState<string>('--:--:--');
  const [piStatus, setPiStatus] = useState<'online' | 'offline' | 'checking' | 'error'>('checking');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [history, setHistory] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('safeguard_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('safeguard_server_url') || DEFAULT_URL);
  const lastTriggerRef = useRef<number>(0);
  const lastEventRef = useRef<number>(0);
  
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('safeguard_settings');
    return saved ? JSON.parse(saved) : { 
      email: '', 
      startTime: '07:00', 
      endTime: '08:30', 
      contacts: [],
      vacationMode: false,
      activeDays: [0, 1, 2, 3, 4] 
    };
  });

  const getDaySummary = () => {
    if (settings.activeDays.length === 7) return "Elke dag";
    if (settings.activeDays.length === 5 && !settings.activeDays.includes(5) && !settings.activeDays.includes(6)) return "Maandag t/m Vrijdag";
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
    localStorage.setItem('safeguard_history', JSON.stringify(updated));
  };

  const getBattery = async () => {
    try {
      if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        const batt: any = await (navigator as any).getBattery();
        const level = Math.round(batt.level * 100);
        setBatteryLevel(level);
        return level;
      }
    } catch (e) { 
      console.warn("Batterij status niet ondersteund op dit toestel.");
    }
    return null;
  };

  const getCleanUrl = useCallback((urlInput?: string) => {
    let url = (urlInput || serverUrl).trim().replace(/\s/g, '');
    if (!url) return '';
    if (!url.startsWith('http')) url = `https://${url}`;
    return url.replace(/\/$/, '');
  }, [serverUrl]);

  // Robustere fetch met handmatige timeout voor oudere browsers
  const robustFetch = async (url: string, options: RequestInit, timeoutMs: number = 8000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  };

  const checkPiStatus = useCallback(async (silent = false) => {
    const url = getCleanUrl();
    if (!url) { setPiStatus('offline'); return; }
    if (!silent) setPiStatus('checking');
    try {
      const res = await robustFetch(`${url}/status?user=${encodeURIComponent(settings.email)}`, { 
        method: 'GET',
        mode: 'cors'
      }, 5000);
      if (res.ok) {
        const data = await res.json();
        setPiStatus('online');
        if (data.your_last_ping) setServerLastPing(data.your_last_ping);
      } else { 
        setPiStatus('error'); 
      }
    } catch (err) { 
      setPiStatus('offline'); 
    }
  }, [getCleanUrl, settings.email]);

  const triggerCheckin = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastTriggerRef.current < 10000) return; 
    if (settings.vacationMode && !force) return;
    if (!isTodayActive() && !force) return;

    const url = getCleanUrl();
    if (!url || !settings.email || !isSyncActive) return;

    setIsProcessing(true);
    const batt = await getBattery();

    try {
      const response = await robustFetch(`${url}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: settings.email,
          startTime: settings.startTime,
          endTime: settings.endTime,
          vacationMode: settings.vacationMode,
          activeDays: settings.activeDays,
          battery: batt,
          contacts: settings.contacts
        }),
        mode: 'cors'
      }, 12000);
      
      if (response.ok) {
        setPiStatus('online');
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        updateHistory(timeStr, batt);
        lastTriggerRef.current = Date.now();
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 2000);
      }
    } catch (err: any) { 
      setPiStatus('offline'); 
    } finally { 
      setIsProcessing(false); 
    }
  }, [settings, isSyncActive, getCleanUrl, history]);

  useEffect(() => {
    getBattery();
    const interval = setInterval(() => {
      if (isSyncActive) {
        checkPiStatus(true);
        triggerCheckin();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [checkPiStatus, isSyncActive, triggerCheckin]);

  useEffect(() => {
    const handleSyncTrigger = () => {
      const now = Date.now();
      if (now - lastEventRef.current < 5000) return;
      lastEventRef.current = now;
      if (document.visibilityState === 'visible' && isSyncActive) {
        setTimeout(() => {
          triggerCheckin(true);
          checkPiStatus(true);
        }, 1200);
      }
    };
    document.addEventListener('visibilitychange', handleSyncTrigger);
    window.addEventListener('focus', handleSyncTrigger);
    return () => {
      document.removeEventListener('visibilitychange', handleSyncTrigger);
      window.removeEventListener('focus', handleSyncTrigger);
    };
  }, [isSyncActive, triggerCheckin, checkPiStatus]);

  useEffect(() => {
    localStorage.setItem('safeguard_settings', JSON.stringify(settings));
    localStorage.setItem('safeguard_server_url', serverUrl);
  }, [settings, serverUrl]);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans select-none overflow-x-hidden">
      <header className="flex items-center justify-between p-6 bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl transition-all duration-500 ${isSyncActive ? 'bg-orange-500' : 'bg-slate-200'}`}>
            <ShieldCheck className={`${isSyncActive ? 'text-white' : 'text-slate-500'} w-5 h-5`} />
          </div>
          <div>
            <h1 className="text-xs font-black uppercase tracking-widest text-slate-900">SafeGuard</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${
                piStatus === 'online' ? 'bg-emerald-500' : 
                piStatus === 'checking' ? 'bg-amber-500 animate-pulse' : 
                piStatus === 'error' ? 'bg-orange-400' : 'bg-rose-500'}`} 
              />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                {piStatus === 'online' ? 'Status: Online' : 
                 piStatus === 'checking' ? 'Verbinden...' : 
                 piStatus === 'error' ? 'Tunnel Fout' : 'Geen verbinding'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-100 rounded-2xl active:scale-95 transition-all">
          <SettingsIcon className="w-5 h-5 text-slate-600" />
        </button>
      </header>

      <main className="flex-1 px-6 flex flex-col space-y-4 py-6 pb-20">
        
        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                <User size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Monitoren van</p>
                <p className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{settings.email || 'Gebruiker'}</p>
              </div>
           </div>
           <div className="flex flex-col items-end text-emerald-600">
              <div className="flex items-center gap-1.5">
                <Battery size={16} className={batteryLevel !== null && batteryLevel < 20 ? 'text-rose-500' : ''} />
                <span className="text-xs font-black">{batteryLevel !== null ? `${batteryLevel}%` : '--'}</span>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Toestel</p>
           </div>
        </div>

        {/* Status Alarm melding bij offline */}
        {piStatus !== 'online' && isSyncActive && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-3xl flex items-center gap-3 animate-pulse">
            <AlertTriangle className="text-rose-500 flex-shrink-0" size={18} />
            <p className="text-[10px] font-bold text-rose-700 leading-tight">
              Let op: Er is momenteel geen verbinding met de Raspberry Pi. Checks komen mogelijk niet aan!
            </p>
            <button onClick={() => checkPiStatus()} className="p-2 bg-rose-100 rounded-xl text-rose-600 active:rotate-180 transition-transform">
              <RefreshCw size={14} />
            </button>
          </div>
        )}

        {/* Schema Status */}
        <div className="bg-orange-500 rounded-3xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-100 italic">Huidig Schema</p>
            <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${isTodayActive() ? 'bg-white text-orange-600' : 'bg-orange-600 border border-orange-400 text-orange-100'}`}>
              {isTodayActive() ? 'Vandaag Actief' : 'Vandaag Rust'}
            </div>
          </div>
          <h2 className="text-xl font-bold mb-1">{getDaySummary()}</h2>
          <div className="flex items-center gap-2 text-orange-50">
            <Clock size={14} />
            <span className="text-xs font-medium italic">{settings.startTime} tot {settings.endTime} uur</span>
          </div>
        </div>

        {/* Vakantie Schakelaar */}
        <button 
          onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
          className={`w-full p-5 rounded-3xl border transition-all flex items-center justify-between ${settings.vacationMode ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings.vacationMode ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
              <Plane size={20} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-900">Vakantie Modus</p>
              <p className="text-[10px] text-slate-500 font-medium">Alle meldingen tijdelijk uit</p>
            </div>
          </div>
          <div className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 ${settings.vacationMode ? 'bg-amber-500' : 'bg-slate-200'}`}>
            <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${settings.vacationMode ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </button>

        {/* Belangrijke Disclaimer */}
        <div className="bg-slate-100 border border-slate-200 rounded-3xl p-5 flex gap-4">
          <div className="text-amber-600 mt-1">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase text-slate-900 tracking-tight mb-1">Let op voor contactpersonen</p>
            <p className="text-[11px] text-slate-600 leading-relaxed italic">
              Het kan zijn dat de monitor niet werkt bij een defect of lege telefoon van de hoofdpersoon. 
              Breng je contacten hiervan op de hoogte zodat zij bij een alarm ook technische storingen overwegen.
            </p>
          </div>
        </div>

        {/* Historie */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <History size={14} className="text-slate-400" />
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Activiteiten Log</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {history.length === 0 ? (
              <p className="p-6 text-center text-slate-400 text-xs italic">Nog geen pings vastgelegd</p>
            ) : (
              history.map((log, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap size={14} className="text-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{log.timeStr}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(log.timestamp).toLocaleDateString('nl-NL', {weekday: 'short', day: 'numeric'})}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{log.battery ? `${log.battery}%` : '--'}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Action */}
        <div className="pt-2 flex flex-col items-center">
          <button 
            onClick={() => triggerCheckin(true)}
            disabled={isProcessing}
            className={`w-32 h-32 rounded-full flex flex-col items-center justify-center mb-6 border transition-all duration-500 bg-white active:scale-95 ${isSyncActive && !settings.vacationMode ? 'border-orange-500' : 'border-slate-200 grayscale opacity-50'}`}
          >
            <Smartphone className={`w-8 h-8 mb-2 ${isSyncActive ? 'text-orange-500' : 'text-slate-300'} ${isProcessing ? 'animate-bounce' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {isProcessing ? 'Systeem Bezig' : 'Handmatige Check'}
            </span>
          </button>

          <button 
            onClick={() => {
              if (!serverUrl || !settings.email) return setShowSettings(true);
              const newState = !isSyncActive;
              setIsSyncActive(newState);
              localStorage.setItem('safeguard_active', newState.toString());
              if (newState) {
                checkPiStatus();
                setTimeout(() => triggerCheckin(true), 1200);
              }
            }} 
            className={`w-full py-5 rounded-3xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 ${isSyncActive ? 'bg-slate-900 text-white' : 'bg-orange-500 text-white'}`}
          >
            <Power size={18} />
            {isSyncActive ? 'Bewaking Stopzetten' : 'Bewaking Starten'}
          </button>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
             <div>
               <h3 className="text-xl font-black uppercase text-slate-900 italic">Instellingen</h3>
               <p className="text-[10px] font-bold text-orange-600 uppercase mt-1">Configuratie</p>
             </div>
             <button onClick={() => setShowSettings(false)} className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center active:scale-90"><X size={24}/></button>
          </div>
          
          <div className="space-y-6 pb-20">
            {/* Problemen op iPhone? */}
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-3">
              <Info className="text-orange-500 shrink-0" size={16} />
              <p className="text-[10px] text-orange-900 leading-tight">
                <span className="font-bold">Problemen op mobiel?</span><br/>
                Zet de app op je thuisscherm via "Zet op beginscherm" in Safari/Chrome voor een stabielere verbinding.
              </p>
            </div>

            <section className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1">Actieve Dagen</label>
              <div className="flex justify-between gap-1">
                {DAYS.map((day, idx) => {
                  const isActive = settings.activeDays.includes(idx);
                  return (
                    <button
                      key={day}
                      onClick={() => {
                        const newDays = isActive 
                          ? settings.activeDays.filter(d => d !== idx)
                          : [...settings.activeDays, idx];
                        setSettings({...settings, activeDays: newDays});
                      }}
                      className={`flex-1 h-12 rounded-xl flex items-center justify-center text-[10px] font-black transition-all ${isActive ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
                <Globe size={14}/> Cloudflare URL
              </label>
              <input type="text" value={serverUrl} onChange={e => setServerUrl(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-xl font-mono text-xs outline-none focus:border-orange-500" />
              <button onClick={() => checkPiStatus()} className="w-full py-2 bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                <RefreshCw size={12} /> Test Verbinding
              </button>
            </section>

            <section className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1">Naam Gebruiker</label>
              <input type="text" placeholder="Bijv. Aldo" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-bold" />
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1">Start Tijd</label>
                <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-rose-500 px-1 italic">Deadline</label>
                <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-bold text-rose-600" />
              </div>
            </section>

            <section className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Emergency Contacten</h4>
                  <button onClick={() => setShowHelp(!showHelp)} className="text-orange-500 hover:scale-110 transition-transform">
                    <HelpCircle size={18} />
                  </button>
                </div>
                <button onClick={() => setSettings(prev => ({ ...prev, contacts: [...prev.contacts, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '', apiKey: '' }] }))} className="w-10 h-10 bg-orange-500 rounded-xl text-white flex items-center justify-center active:scale-95"><Plus size={20} /></button>
              </div>

              {showHelp && (
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 text-[11px] text-orange-900 space-y-4 animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center gap-2 font-black uppercase text-[10px] text-orange-600 border-b border-orange-200 pb-2">
                    <Info size={16} /> Hoe activeer ik een contact?
                  </div>
                  <ol className="space-y-3">
                    <li className="flex gap-3">
                      <span className="w-5 h-5 bg-orange-200 rounded-full flex-shrink-0 flex items-center justify-center font-bold">1</span>
                      <span>Contact stuurt WhatsApp naar <span className="font-bold">+34 623 78 95 80</span></span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-5 h-5 bg-orange-200 rounded-full flex-shrink-0 flex items-center justify-center font-bold">2</span>
                      <span>Berichtinhoud: <span className="font-mono bg-white px-1 border border-orange-100 rounded">I allow callmebot to send me messages</span></span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-5 h-5 bg-orange-200 rounded-full flex-shrink-0 flex items-center justify-center font-bold">3</span>
                      <span>De bot stuurt een <span className="font-bold">API Key (pincode)</span> terug.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-5 h-5 bg-orange-500 text-white rounded-full flex-shrink-0 flex items-center justify-center font-bold italic">4</span>
                      <span className="font-bold text-orange-950 underline decoration-orange-300">Het contact stuurt deze pincode naar jou (de hoofdgebruiker).</span>
                    </li>
                  </ol>
                  <button onClick={() => setShowHelp(false)} className="w-full py-2 bg-orange-500 text-white rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-2">
                    <CheckCircle2 size={12} /> Ik begrijp het
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {settings.contacts.map((c) => (
                  <div key={c.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-200 space-y-3 relative">
                    <div className="flex justify-between items-center">
                      <input type="text" placeholder="Naam contact" value={c.name} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, name: e.target.value} : x)})} className="bg-transparent font-bold text-slate-900 outline-none w-2/3" />
                      <button onClick={() => setSettings(prev => ({ ...prev, contacts: prev.contacts.filter(x => x.id !== c.id) }))} className="text-rose-500 p-2"><Trash2 size={18} /></button>
                    </div>
                    <input type="text" placeholder="Telefoon (316...)" value={c.phone} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, phone: e.target.value} : x)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-orange-500" />
                    <input type="password" placeholder="API Key (Pincode)" value={c.apiKey} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, apiKey: e.target.value} : x)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-orange-500" />
                  </div>
                ))}
                {settings.contacts.length === 0 && (
                  <p className="text-center py-6 text-slate-400 text-[10px] italic">Voeg een contact toe om alarmen te kunnen versturen.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
