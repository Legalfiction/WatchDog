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
  Phone,
  CalendarDays,
  Zap,
  HelpCircle,
  AlertTriangle,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Calendar,
  ShieldAlert,
  Fingerprint
} from 'lucide-react';
import { UserSettings, EmergencyContact, ActivityLog, DaySchedule } from './types';

// NIEUW: We importeren het plaatje direct uit dezelfde map
import logo from './logo.png';

const VERSION = '10.1.0';
const DEFAULT_URL = 'https://barkr.nl';
const DAYS_FULL = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
const DAYS_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

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
  
  const serverUrl = DEFAULT_URL;
  const lastTriggerRef = useRef<number>(0);
  const initialFetchDone = useRef(false);
  
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('safeguard_settings');
    const parsed = saved ? JSON.parse(saved) : null;
    
    const defaultSchedules: Record<number, DaySchedule> = {};
    [0,1,2,3,4,5,6].forEach(d => {
      defaultSchedules[d] = { startTime: parsed?.startTime || '07:00', endTime: parsed?.endTime || '08:30' };
    });

    return { 
      email: parsed?.email || '', 
      myPhone: parsed?.myPhone || parsed?.phone || '',
      startTime: parsed?.startTime || '07:00', 
      endTime: parsed?.endTime || '08:30', 
      contacts: parsed?.contacts || [],
      vacationMode: parsed?.vacationMode || false,
      activeDays: parsed?.activeDays || [0, 1, 2, 3, 4, 5, 6],
      useCustomSchedule: parsed?.useCustomSchedule || false,
      schedules: parsed?.schedules || defaultSchedules
    };
  });

  const fetchSettingsFromServer = useCallback(async () => {
    try {
      const phone = settings.myPhone || localStorage.getItem('last_known_phone');
      const url = `${serverUrl}/get_settings${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const serverData = await res.json();
        if (serverData && serverData.myPhone) {
          setSettings(prev => ({
            ...prev,
            ...serverData,
            activeDays: Array.isArray(serverData.activeDays) ? serverData.activeDays : prev.activeDays,
            contacts: Array.isArray(serverData.contacts) ? serverData.contacts : prev.contacts,
            schedules: serverData.schedules || prev.schedules
          }));
          initialFetchDone.current = true;
          setPiStatus('online');
        }
      }
    } catch (e) {
      console.error("Kon settings niet ophalen:", e);
      setPiStatus('offline');
    }
  }, [serverUrl, settings.myPhone]);

  const saveSettingsToServer = useCallback(async (currentSettings: UserSettings) => {
    if (!currentSettings.myPhone) return;
    try {
      await fetch(`${serverUrl}/save_settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSettings)
      });
      localStorage.setItem('last_known_phone', currentSettings.myPhone);
    } catch (e) {
      console.error("Kon settings niet opslaan op server:", e);
    }
  }, [serverUrl]);

  const toggleDay = (dayIndex: number) => {
    setSettings(prev => {
      const activeDays = prev.activeDays.includes(dayIndex)
        ? prev.activeDays.filter(d => d !== dayIndex)
        : [...prev.activeDays, dayIndex].sort((a, b) => a - b);
      const newSettings = { ...prev, activeDays };
      saveSettingsToServer(newSettings);
      return newSettings;
    });
  };

  const updateDaySchedule = (dayIndex: number, field: keyof DaySchedule, value: string) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        schedules: {
          ...prev.schedules,
          [dayIndex]: {
            ...prev.schedules[dayIndex],
            [field]: value
          }
        }
      };
      saveSettingsToServer(newSettings);
      return newSettings;
    });
  };

  const getDaySummary = () => {
    if (settings.activeDays.length === 7) return "Elke dag";
    if (settings.activeDays.length === 0) return "Geen actieve dagen";
    return settings.activeDays.map(d => DAYS_SHORT[d]).join(', ');
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

  const triggerCheckin = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastTriggerRef.current < 15000) return; 

    if (!settings.email || !settings.myPhone) return;

    setIsProcessing(true);
    const batt = await getBattery();

    const payload = {
        ...settings,
        user: settings.email.trim(),
        battery: batt,
        phone: settings.myPhone
    };

    try {
      const response = await fetch(`${serverUrl}/ping`, {
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
  }, [settings, serverUrl]);

  const checkPiStatus = useCallback(async (silent = false) => {
    if (!silent) setPiStatus('checking');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const res = await fetch(`${serverUrl}/status?user=${encodeURIComponent(settings.email.trim() || 'check')}`, { 
        method: 'GET',
        mode: 'cors',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) setPiStatus('online');
      else setPiStatus('error');
    } catch (err) { 
      setPiStatus('offline'); 
    }
  }, [serverUrl, settings.email]);

  useEffect(() => {
    fetchSettingsFromServer();
  }, [fetchSettingsFromServer]);

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
  }, [settings]);

  const handleSettingsUpdate = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveSettingsToServer(newSettings);
    setTimeout(() => triggerCheckin(true), 200);
  };

  const currentDayIndex = (new Date().getDay() + 6) % 7;
  const currentDeadline = settings.useCustomSchedule 
    ? settings.schedules[currentDayIndex]?.endTime 
    : settings.endTime;

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans select-none overflow-x-hidden">
      <header className="flex items-center justify-between p-6 bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 overflow-hidden rounded-xl shadow-lg shadow-orange-100 flex items-center justify-center">
            {/* AANGEPAST: Gebruik de geïmporteerde 'logo' variabele */}
            <img src={logo} alt="Barkr Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-slate-900">Barkr</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${piStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className={`text-[9px] font-bold uppercase tracking-tight ${piStatus === 'online' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {piStatus === 'online' ? 'Barkr is waakzaam' : 'Barkr is offline'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowManual(true)} className="p-3 bg-orange-50 rounded-2xl border border-orange-100"><Info size={20} className="text-orange-600" /></button>
          <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-100 rounded-2xl"><SettingsIcon size={20} className="text-slate-600" /></button>
        </div>
      </header>

      <main className="flex-1 px-6 flex flex-col space-y-5 py-6 pb-12">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 flex flex-col gap-6 shadow-sm">
           <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 border border-orange-100">
                  <User size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Actieve Monitor</p>
                  <p className="text-base font-bold text-slate-900">{settings.email || 'Gebruiker'}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{settings.myPhone || 'Geen nummer'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-100">
                <Battery size={16} />
                <span className="text-xs font-black">{batteryLevel !== null ? `${batteryLevel}%` : '--'}</span>
              </div>
           </div>
           
           <div className={`rounded-2xl p-6 flex items-center justify-between border transition-all duration-500 ${lastSuccessTime ? 'bg-emerald-50 border-emerald-200 ring-4 ring-emerald-50' : 'bg-slate-50 border-slate-100'}`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck size={14} className={lastSuccessTime ? 'text-emerald-500' : 'text-slate-300'} />
                  <p className={`text-[10px] font-black uppercase tracking-tight ${lastSuccessTime ? 'text-emerald-600' : 'text-slate-400'}`}>
                    Systeem Status: {lastSuccessTime ? 'GEDETECTEERD' : 'WACHTEN'}
                  </p>
                </div>
                <p className={`text-3xl font-black tracking-tight ${lastSuccessTime ? 'text-emerald-900' : 'text-slate-200'}`}>{lastSuccessTime || '--:--'}</p>
              </div>
              {isProcessing ? <RefreshCw size={24} className="text-orange-500 animate-spin" /> : (
                lastSuccessTime ? <CheckCircle2 size={36} className="text-emerald-500 animate-in zoom-in-50 duration-300" /> : <div className="w-9 h-9 border-4 border-slate-100 rounded-full border-t-orange-200 animate-spin" />
              )}
           </div>

           <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-rose-500" />
                <p className="text-[11px] font-bold text-slate-600">Vandaag deadline: <span className="text-rose-600 font-black">{currentDeadline} uur</span></p>
              </div>
              <p className="text-[10px] font-bold text-slate-400 italic">v{VERSION}</p>
           </div>
        </div>

        <div className="bg-orange-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-100 mb-2 flex items-center gap-2">
            <CalendarDays size={12} /> Bewakingsdagen
          </p>
          <h2 className="text-xl font-bold mb-1">{getDaySummary()}</h2>
          <p className="text-xs text-orange-50 opacity-90 leading-relaxed italic">Barkr waakt over je op de oranje gemarkeerde dagen.</p>
        </div>

        <button 
          onClick={() => handleSettingsUpdate({...settings, vacationMode: !settings.vacationMode})}
          className={`w-full p-5 rounded-3xl border transition-all flex items-center justify-between group ${settings.vacationMode ? 'bg-amber-50 border-amber-200 ring-4 ring-amber-50' : 'bg-white border-slate-200 hover:border-orange-200'}`}
        >
          <div className="flex items-center gap-4 text-left">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${settings.vacationMode ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-orange-50 group-hover:text-orange-500'}`}><Plane size={20} /></div>
            <div>
              <p className="text-sm font-bold text-slate-900">Vakantie Modus</p>
              <p className="text-[10px] text-slate-500 italic">Bewaking is nu {settings.vacationMode ? 'gepauzeerd' : 'actief'}</p>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.vacationMode ? 'bg-amber-500' : 'bg-slate-200'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.vacationMode ? 'translate-x-6' : 'translate-x-0'}`} />
          </div>
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <History size={14} className="text-slate-400" />
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Activiteit Logboek</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {history.length === 0 ? <p className="p-8 text-center text-slate-300 text-[10px] font-bold uppercase">Geen data beschikbaar</p> : history.map((log, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-100" />
                  <p className="text-xs font-black text-slate-900">{log.timeStr} <span className="text-slate-300 ml-2 font-normal">| {new Date(log.timestamp).toLocaleDateString('nl-NL', {weekday: 'short'})}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <Battery size={10} className="text-slate-300" />
                  <span className="text-[10px] font-bold text-slate-400">{log.battery}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
                 {/* AANGEPAST: Gebruik de geïmporteerde 'logo' variabele */}
                 <img src={logo} alt="Barkr Logo" className="w-full h-full object-cover" />
               </div>
               <h3 className="text-xl font-black uppercase italic text-slate-900">Configuratie</h3>
             </div>
             <button onClick={() => { setShowSettings(false); triggerCheckin(true); }} className="p-3 bg-slate-100 rounded-2xl"><X size={24}/></button>
          </div>
          
          <div className="space-y-8 pb-24">
            <section className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1 italic flex items-center gap-2">
                <CalendarDays size={14}/> Bewakingsdagen
              </label>
              <div className="flex w-full gap-1.5">
                {DAYS_SHORT.map((day, idx) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(idx)}
                    className={`flex-1 min-w-0 py-3.5 rounded-xl text-[11px] font-black transition-all border ${
                      settings.activeDays.includes(idx) 
                        ? 'bg-orange-600 text-white border-orange-700 shadow-lg shadow-orange-100' 
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 italic">Slimme Planning</h4>
                    <p className="text-[10px] text-slate-400">Instellingen per dag variëren</p>
                  </div>
                  <button 
                    onClick={() => handleSettingsUpdate({ ...settings, useCustomSchedule: !settings.useCustomSchedule })}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.useCustomSchedule ? 'bg-orange-500' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.useCustomSchedule ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {!settings.useCustomSchedule ? (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-400 px-1 italic">Start Venster</label>
                      <input type="time" value={settings.startTime} onChange={e => handleSettingsUpdate({...settings, startTime: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-orange-500 transition-colors" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-rose-500 px-1 italic">Deadline</label>
                      <input type="time" value={settings.endTime} onChange={e => handleSettingsUpdate({...settings, endTime: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm text-rose-600 outline-none focus:border-rose-500 transition-colors" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 animate-in fade-in slide-in-from-top-2">
                    {DAYS_FULL.map((dayName, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl border transition-opacity ${settings.activeDays.includes(idx) ? 'bg-orange-50/30 border-orange-100' : 'bg-slate-50 border-slate-200 opacity-40'}`}>
                        <div className="flex items-center justify-between mb-3">
                           <div className="flex items-center gap-2">
                             <Calendar size={12} className={settings.activeDays.includes(idx) ? 'text-orange-500' : 'text-slate-400'} />
                             <span className="text-[11px] font-black uppercase text-slate-700 tracking-tight">{dayName}</span>
                           </div>
                           {!settings.activeDays.includes(idx) && <span className="text-[9px] font-bold text-slate-400 uppercase">Gepauzeerd</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input 
                            type="time" 
                            value={settings.schedules[idx]?.startTime || '07:00'} 
                            onChange={e => updateDaySchedule(idx, 'startTime', e.target.value)} 
                            className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" 
                            disabled={!settings.activeDays.includes(idx)}
                          />
                          <input 
                            type="time" 
                            value={settings.schedules[idx]?.endTime || '08:30'} 
                            onChange={e => updateDaySchedule(idx, 'endTime', e.target.value)} 
                            className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-rose-600 outline-none" 
                            disabled={!settings.activeDays.includes(idx)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </section>

            <div className="space-y-5">
              <section className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1 italic">Jouw Naam</label>
                <input type="text" placeholder="Naam voor meldingen" value={settings.email} onChange={e => handleSettingsUpdate({...settings, email: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-orange-500 transition-colors" />
              </section>
              <section className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1 italic">Mijn Mobiel (Bewaakt Nummer)</label>
                <input type="text" placeholder="Bijv. 0612345678" value={settings.myPhone} onChange={e => handleSettingsUpdate({...settings, myPhone: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm outline-none focus:border-orange-500 transition-colors" />
              </section>
            </div>

            <section className="space-y-5 pt-6 border-t border-slate-100">
               <div className="flex items-center justify-between px-1">
                  <h4 className="text-[10px] font-black uppercase text-orange-600 tracking-widest italic">Noodcontacten</h4>
                  <button onClick={() => handleSettingsUpdate({ ...settings, contacts: [...settings.contacts, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '', apiKey: '' }] })} className="w-11 h-11 bg-orange-600 rounded-2xl text-white flex items-center justify-center shadow-lg shadow-orange-100 active:scale-90 transition-transform"><Plus size={22} /></button>
               </div>
               {settings.contacts.map((c) => (
                  <div key={c.id} className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Fingerprint size={16} className="text-slate-300" />
                        <input type="text" placeholder="Naam contact" value={c.name} onChange={e => handleSettingsUpdate({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, name: e.target.value} : x)})} className="bg-transparent font-bold text-slate-900 outline-none w-full" />
                      </div>
                      <button onClick={() => handleSettingsUpdate({ ...settings, contacts: settings.contacts.filter(x => x.id !== c.id) })} className="text-rose-400 p-2 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={20} /></button>
                    </div>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input type="text" placeholder="Mobiel nummer" value={c.phone} onChange={e => handleSettingsUpdate({...settings, contacts: settings.contacts.
