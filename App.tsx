import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  X,
  Trash2,
  Plus,
  User,
  Battery,
  Plane,
  History,
  Clock,
  Info,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Phone,
  CalendarDays,
  Fingerprint,
  Link2,
  Dog,
  Shield,
  BellRing,
  AlertCircle,
  ChevronRight,
  Activity,
  Check,
  Mail,
  Globe,
  ExternalLink,
  Smartphone,
  MessageSquare
} from 'lucide-react';
import { UserSettings, ActivityLog, DaySchedule } from './types';

const VERSION = '11.0.2'; 
const DEFAULT_URL = 'https://barkr.nl';

// Gebruik het logo uit de root
const LOGO_PATH = "/logo.png"; 

const DAYS_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

const formatToBarkrPhone = (phone: string) => {
  let p = phone.replace(/\D/g, ''); 
  if (p.startsWith('06') && p.length === 10) {
    return '0031' + p.substring(1);
  }
  if (p.startsWith('316') && p.length === 11) {
    return '00' + p;
  }
  return phone;
};

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
  
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('barkr_server_url') || DEFAULT_URL);
  const lastTriggerRef = useRef<number>(0);
  
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
      schedules: parsed?.schedules || defaultSchedules,
      serverUrl: localStorage.getItem('barkr_server_url') || DEFAULT_URL
    };
  });

  const fetchSettingsFromServer = useCallback(async (customUrl?: string) => {
    const targetUrl = customUrl || serverUrl;
    if (!targetUrl) return;

    try {
      const phone = settings.myPhone || localStorage.getItem('last_known_phone');
      const url = `${targetUrl}/get_settings${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`;
      const res = await fetch(url, { mode: 'cors', cache: 'no-cache' });
      if (res.ok) {
        const serverData = await res.json();
        if (serverData && (serverData.myPhone || serverData.email)) {
          setSettings(prev => ({
            ...prev,
            ...serverData,
            activeDays: Array.isArray(serverData.activeDays) ? serverData.activeDays : prev.activeDays,
            contacts: Array.isArray(serverData.contacts) ? serverData.contacts : prev.contacts,
            schedules: serverData.schedules || prev.schedules
          }));
          setPiStatus('online');
        }
      }
    } catch (e) {
      setPiStatus('offline');
    }
  }, [serverUrl, settings.myPhone]);

  const saveSettingsToServer = useCallback(async (currentSettings: UserSettings) => {
    if (!currentSettings.myPhone) return;
    try {
      const formattedSettings = {
        ...currentSettings,
        myPhone: formatToBarkrPhone(currentSettings.myPhone),
        contacts: currentSettings.contacts.map(c => ({ ...c, phone: formatToBarkrPhone(c.phone) }))
      };
      await fetch(`${serverUrl}/save_settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedSettings),
        mode: 'cors'
      });
      localStorage.setItem('last_known_phone', formattedSettings.myPhone);
    } catch (e) {}
  }, [serverUrl]);

  const updateHistory = (timeStr: string, batt: number | null) => {
    const newLog = { timestamp: Date.now(), timeStr, battery: batt || undefined };
    const updated = [newLog, ...history].slice(0, 5);
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
    if (!force && now - lastTriggerRef.current < 30000) return; 
    if (!settings.myPhone) return;

    setIsProcessing(true);
    const batt = await getBattery();

    try {
      const response = await fetch(`${serverUrl}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...settings, 
          user: settings.email.trim(), 
          battery: batt, 
          phone: formatToBarkrPhone(settings.myPhone) 
        }),
        mode: 'cors'
      });
      
      if (response.ok) {
        setPiStatus('online');
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        updateHistory(timeStr, batt);
        lastTriggerRef.current = Date.now();
      }
    } catch (err) { 
      setPiStatus('offline'); 
    } finally { 
      setIsProcessing(false); 
    }
  }, [settings, serverUrl]);

  const checkPiStatus = useCallback(async (silent = false) => {
    if (!serverUrl) return;
    if (!silent) setPiStatus('checking');
    try {
      const res = await fetch(`${serverUrl}/status`, { method: 'GET', mode: 'cors' });
      if (res.ok) setPiStatus('online');
      else setPiStatus('error');
    } catch (err) { 
      setPiStatus('offline'); 
    }
  }, [serverUrl]);

  useEffect(() => {
    fetchSettingsFromServer();
    checkPiStatus();
    triggerCheckin(true); 
    const interval = setInterval(() => {
      checkPiStatus(true);
      triggerCheckin();
    }, 60000); 
    return () => clearInterval(interval);
  }, [checkPiStatus, triggerCheckin, fetchSettingsFromServer]);

  useEffect(() => {
    localStorage.setItem('safeguard_settings', JSON.stringify(settings));
  }, [settings]);

  const handleSettingsUpdate = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveSettingsToServer(newSettings);
  };

  const isSetupIncomplete = !settings.myPhone || settings.contacts.length === 0;
  const currentDayIndex = (new Date().getDay() + 6) % 7;
  const currentDeadline = settings.useCustomSchedule 
    ? settings.schedules[currentDayIndex]?.endTime 
    : settings.endTime;

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans antialiased overflow-x-hidden">
      
      {/* PROFESSIONAL HEADER */}
      <header className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#EA580C] rounded-xl flex items-center justify-center overflow-hidden relative border border-orange-700/10">
            <Dog className="text-white absolute opacity-20" size={20} strokeWidth={1.5} />
            <img src={LOGO_PATH} alt="Barkr" className="relative z-10 w-8 h-8 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight uppercase">Barkr <span className="text-slate-400 font-medium lowercase">v{VERSION}</span></h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${piStatus === 'online' ? 'bg-emerald-500' : 'bg-slate-300 animate-pulse'}`} />
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                {piStatus === 'online' ? 'Barkr is waakzaam' : 'Verbinden...'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors">
            <Info size={18} strokeWidth={1.5} />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors">
            <SettingsIcon size={18} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 flex flex-col space-y-6">
        
        {/* SETUP WIZARD BANNER */}
        {isSetupIncomplete && (
          <div className="bg-orange-50 border border-orange-200 rounded-3xl p-5 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shrink-0">
              <Shield size={24} strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-orange-900 uppercase tracking-wide">Configuratie vereist</p>
              <p className="text-xs text-orange-800/80 mt-0.5 font-medium leading-tight">Voltooi de setup om bewaking te activeren.</p>
            </div>
            <button onClick={() => setShowSettings(true)} className="bg-orange-600 text-white p-2 rounded-xl">
              <ChevronRight size={20} strokeWidth={2} />
            </button>
          </div>
        )}

        {/* SYSTEM STATUS - VISUAL FOCUS */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 flex flex-col items-center text-center space-y-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-700 ${lastSuccessTime ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-300 border border-slate-100'}`}>
            {lastSuccessTime ? <ShieldCheck size={40} strokeWidth={1.2} /> : <Activity size={40} strokeWidth={1.2} className="animate-pulse" />}
          </div>
          <div>
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Huidige Status</h2>
            <p className={`text-4xl font-bold tracking-tight ${lastSuccessTime ? 'text-slate-900' : 'text-slate-300'}`}>
              {lastSuccessTime || 'In afwachting'}
            </p>
          </div>
          <div className="flex items-center gap-4 pt-2">
            <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-2">
              <Clock size={14} className="text-[#EA580C]" strokeWidth={2} />
              <span className="text-xs font-bold text-slate-600">Deadline: {currentDeadline}u</span>
            </div>
            {isProcessing && <RefreshCw size={16} className="text-orange-600 animate-spin" />}
          </div>
        </div>

        {/* USER & BIO METRICS */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
              <User size={18} strokeWidth={1.5} />
            </div>
            <div className="overflow-hidden">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Profiel</p>
              <p className="text-xs font-bold truncate">{settings.email || 'Gebruiker'}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-5 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${batteryLevel && batteryLevel > 20 ? 'bg-slate-50 text-slate-400' : 'bg-rose-50 text-rose-500'}`}>
              <Battery size={18} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Batterij</p>
              <p className="text-xs font-bold">{batteryLevel !== null ? `${batteryLevel}%` : '--%'}</p>
            </div>
          </div>
        </div>

        {/* PLANNING GRID */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-slate-400" strokeWidth={1.5} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 italic">Planning</h3>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {DAYS_SHORT.map((day, idx) => {
              const isActive = settings.activeDays.includes(idx);
              const isCurrent = currentDayIndex === idx;
              return (
                <div key={day} className="flex flex-col items-center space-y-2">
                  <div className={`w-full py-2.5 rounded-xl flex flex-col items-center justify-center transition-all ${
                    isActive 
                      ? (isCurrent ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'bg-slate-900 text-white') 
                      : 'bg-slate-50 text-slate-300'
                  }`}>
                    <span className="text-[9px] font-black">{day}</span>
                  </div>
                  {isCurrent && <div className="w-1 h-1 rounded-full bg-orange-600 animate-pulse" />}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 font-medium italic text-center">Barkr optimaliseert bewaking op basis van uw schema.</p>
        </div>

        {/* VACATION MODE */}
        <button 
          onClick={() => handleSettingsUpdate({...settings, vacationMode: !settings.vacationMode})}
          className={`w-full p-5 rounded-3xl border transition-all flex items-center justify-between group ${settings.vacationMode ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${settings.vacationMode ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
              <Plane size={24} strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-900">Pauzeer Monitor</p>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Vakantie Modus</p>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.vacationMode ? 'bg-amber-500' : 'bg-slate-200'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${settings.vacationMode ? 'translate-x-6' : 'translate-x-0'}`} />
          </div>
        </button>

        {/* LOGS PANEL */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={14} className="text-slate-400" />
              <h3 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Activiteit</h3>
            </div>
            <button onClick={() => triggerCheckin(true)} className="text-[10px] font-bold text-orange-600 uppercase">Vernieuwen</button>
          </div>
          <div className="divide-y divide-slate-50">
            {history.length === 0 ? (
              <div className="p-10 text-center space-y-2 opacity-30">
                <Dog size={24} className="mx-auto" strokeWidth={1.5} />
                <p className="text-[9px] font-bold uppercase tracking-widest">Geen data</p>
              </div>
            ) : history.slice(0, 5).map((log, idx) => (
              <div key={idx} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-xs font-bold text-slate-900">{log.timeStr} <span className="text-slate-300 ml-2 font-medium">| {new Date(log.timestamp).toLocaleDateString('nl-NL', {weekday: 'short'})}</span></p>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Battery size={10} strokeWidth={2} />
                  <span className="text-[10px] font-bold">{log.battery}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col p-8 overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-10">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                 <img src={LOGO_PATH} alt="Barkr" className="w-6 h-6 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
               </div>
               <h3 className="text-xl font-bold italic tracking-tighter text-slate-900">Configuratie</h3>
             </div>
             <button onClick={() => { setShowSettings(false); triggerCheckin(true); }} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900"><X size={24}/></button>
          </div>
          
          <div className="space-y-10 pb-24">
            {/* SETUP PROGRESS INDICATOR */}
            <div className="flex gap-1.5">
              <div className={`h-1 flex-1 rounded-full ${settings.myPhone ? 'bg-orange-600' : 'bg-slate-100'}`} />
              <div className={`h-1 flex-1 rounded-full ${settings.contacts.length > 0 ? 'bg-orange-600' : 'bg-slate-100'}`} />
              <div className={`h-1 flex-1 rounded-full ${settings.activeDays.length > 0 ? 'bg-orange-600' : 'bg-slate-100'}`} />
            </div>

            <section className="space-y-4">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] italic">Basis Gegevens</label>
              <div className="space-y-4">
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="Uw Naam" 
                    value={settings.email} 
                    onChange={e => handleSettingsUpdate({...settings, email: e.target.value})} 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="Gemonitord Mobiel Nummer (bijv. 0612345678)" 
                    value={settings.myPhone} 
                    onChange={e => handleSettingsUpdate({...settings, myPhone: e.target.value})} 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs font-bold outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] italic">Planning & Deadlines</label>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Custom</span>
                  <button 
                    onClick={() => handleSettingsUpdate({ ...settings, useCustomSchedule: !settings.useCustomSchedule })}
                    className={`w-10 h-5 rounded-full p-1 transition-colors ${settings.useCustomSchedule ? 'bg-orange-500' : 'bg-slate-200'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${settings.useCustomSchedule ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
              
              {!settings.useCustomSchedule ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Start Bewaking</p>
                    <input type="time" value={settings.startTime} onChange={e => handleSettingsUpdate({...settings, startTime: e.target.value})} className="bg-transparent font-bold text-lg outline-none w-full" />
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <p className="text-[9px] font-bold text-rose-500 uppercase italic">Harde Deadline</p>
                    <input type="time" value={settings.endTime} onChange={e => handleSettingsUpdate({...settings, endTime: e.target.value})} className="bg-transparent font-bold text-lg text-rose-600 outline-none w-full" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {DAYS_SHORT.map((day, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${settings.activeDays.includes(idx) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-300'}`}>{day}</div>
                       <div className="flex-1 grid grid-cols-2 gap-2">
                          <input type="time" value={settings.schedules[idx]?.startTime || '07:00'} onChange={e => {
                            const newScheds = { ...settings.schedules, [idx]: { ...settings.schedules[idx], startTime: e.target.value } };
                            handleSettingsUpdate({...settings, schedules: newScheds});
                          }} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                          <input type="time" value={settings.schedules[idx]?.endTime || '08:30'} onChange={e => {
                            const newScheds = { ...settings.schedules, [idx]: { ...settings.schedules[idx], endTime: e.target.value } };
                            handleSettingsUpdate({...settings, schedules: newScheds});
                          }} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-rose-600" />
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
               <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] italic">Noodcontacten</label>
                  <button onClick={() => handleSettingsUpdate({ ...settings, contacts: [...settings.contacts, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '' }] })} className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-orange-600 transition-colors">
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
               </div>
               <div className="space-y-4">
                {settings.contacts.map((c) => (
                    <div key={c.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-200 space-y-4 transition-all">
                      <div className="flex justify-between items-center border-b border-slate-200/50 pb-3">
                        <div className="flex items-center gap-3 flex-1">
                           <Fingerprint size={16} className="text-slate-300" />
                           <input type="text" placeholder="Naam contact" value={c.name} onChange={e => handleSettingsUpdate({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, name: e.target.value} : x)})} className="bg-transparent font-bold text-slate-900 text-sm outline-none w-full" />
                        </div>
                        <button onClick={() => handleSettingsUpdate({ ...settings, contacts: settings.contacts.filter(x => x.id !== c.id) })} className="text-slate-300 hover:text-rose-500 transition-colors">
                          <Trash2 size={18} strokeWidth={1.5} />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                          <input type="text" placeholder="Nummer" value={c.phone} onChange={e => handleSettingsUpdate({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, phone: e.target.value} : x)})} className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-3 text-xs font-bold outline-none focus:border-orange-500" />
                        </div>
                        <button onClick={() => alert(`Test alarm verstuurd naar ${c.name || 'contact'}`)} className="px-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                          <BellRing size={14} /> Test
                        </button>
                      </div>
                    </div>
                  ))}
               </div>
            </section>
          </div>
        </div>
      )}

      {/* INFO / MANUAL MODAL */}
      {showManual && (
        <div className="fixed inset-0 z-[120] bg-[#F8FAFC] flex flex-col animate-in slide-in-from-bottom-4 duration-500">
          {/* HEADER */}
          <header className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-[130]">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-[#EA580C] rounded-lg flex items-center justify-center">
                 <img src={LOGO_PATH} alt="Barkr" className="w-6 h-6 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
               </div>
               <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 italic">OVER BARKR – JOUW DIGITALE WAAKHOND</h3>
             </div>
             <button onClick={() => setShowManual(false)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"><X size={20}/></button>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 pb-32">
            
            {/* WELCOME BOX */}
            <section className="bg-orange-50/50 border border-orange-100 rounded-3xl p-6 relative overflow-hidden">
              <div className="relative z-10 space-y-4">
                <p className="text-sm text-orange-900 leading-relaxed italic font-medium">
                  Welkom bij Barkr. Deze applicatie is ontworpen om een oogje in het zeil te houden wanneer jij dat zelf even niet kunt.
                </p>
                <p className="text-[11px] text-orange-800/70 leading-relaxed font-medium">
                  De naam Barkr is afgeleid van het Engelse "Barker" (blaffer) – zie het als een trouwe waakhond die alleen aanslaat ("blaft") als er iets mis lijkt te zijn.
                </p>
              </div>
              <Dog className="absolute -bottom-6 -right-6 w-32 h-32 text-orange-200/40 rotate-12" strokeWidth={1} />
            </section>

            {/* HOW IT WORKS */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 px-1">
                <Shield size={16} className="text-blue-500" strokeWidth={2} />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 italic">HOE WERKT BARKR?</h4>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-900 italic">Het principe is simpel maar effectief: Levensteken door activiteit.</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium italic">
                    Barkr controleert of jij je telefoon hebt gebruikt binnen een door jou ingestelde tijdspanne (bijvoorbeeld tussen 07:00 en 08:30).
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0 border border-emerald-100">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Alles oké:</p>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic mt-0.5">Als jij je telefoon ontgrendelt of gebruikt vóór de deadline, weet Barkr dat je wakker en actief bent. Het systeem reset zich voor de volgende dag.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shrink-0 border border-rose-100">
                      <AlertCircle size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Alarm:</p>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic mt-0.5">Heb jij je telefoon ná de deadline nog steeds niet aangeraakt? Dan "blaft" Barkr: de applicatie stuurt automatisch een noodbericht via WhatsApp naar jouw ingestelde contactpersonen.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* INSTRUCTIONS */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 px-1">
                <SettingsIcon size={16} className="text-[#EA580C]" strokeWidth={2} />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600 italic">HANDLEIDING & INSTELLINGEN</h4>
              </div>
              <p className="text-[11px] text-slate-400 font-medium px-1 italic">Hieronder vind je uitleg over alle opties die je in het instellingenmenu (het tandwiel-icoon) en op het hoofdscherm vindt.</p>

              <div className="space-y-4">
                {[
                  { id: 1, title: 'BEWAKINGSDAGEN', text: 'Bovenin het menu zie je de dagen van de week (Ma t/m Zo). Selecteer hier de dagen waarop je wilt dat Barkr actief is. Dagen die oranje zijn, zijn actief. Op grijze dagen is de bewaking uitgeschakeld.' },
                  { id: 2, title: 'PLANNING: STANDAARD VS. SLIM', text: 'Je kunt kiezen hoe strikt de tijden moeten zijn:\n\n• Standaard: Zet de schakelaar \'Slimme Planning\' uit. Je stelt één Start Venster en één Deadline in die voor alle geselecteerde dagen geldt.\n\n• Slimme Planning: Zet de schakelaar aan. Er klapt nu een menu open per dag. Hiermee kun je bijvoorbeeld instellen dat je doordeweeks om 08:30 actief moet zijn, maar in het weekend pas om 10:00.' },
                  { id: 3, title: 'JOUW GEGEVENS', text: 'Vul bij Jouw Naam en Mijn Mobiel je eigen gegevens in. Het nummer wordt gebruikt om te verifiëren dat jij het bent.' },
                  { id: 4, title: 'NOODCONTACTEN & WHATSAPP KOPPELING', text: 'Dit is een cruciale stap om de alarmering te laten werken.\n\n• Klik op de grote oranje plus (+) om een contact toe te voegen.\n• Vul de naam en het mobiele nummer van je contactpersoon in (bijv. partner, kind of buurman).' },
                  { id: 5, title: 'VAKANTIE MODUS', text: 'Ga je op vakantie of wilt je even geen bewaking? Op het hoofdscherm vind je de knop Vakantie Modus. Zet de schakelaar om en Barkr pauzeert alle activiteiten totdat jij hem weer uitzet. Je hoeft je instellingen dus niet te wissen.' },
                  { id: 6, title: 'STATUS & ACTIVITEIT', text: 'Op het dashboard zie je direct de status:\n\n• Systeem Status: Geeft aan of de monitoring actief is (\'Wachten\' of \'Gedetecteerd\').\n• Vandaag Deadline: De tijd waarop je uiterlijk je telefoon gebruikt moet hebben.\n• Activiteit: Onderaan zie je een logboek van de laatste detecties, zodat je kunt terugzien wanneer Barkr activiteit heeft waargenomen.' }
                ].map((item) => (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-2">
                    <h5 className="text-[11px] font-black text-slate-900 uppercase italic">{item.id}. {item.title}</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium italic whitespace-pre-line">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* MORE INFO */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 px-1">
                <Info size={16} className="text-blue-500" strokeWidth={2} />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 italic">MEER INFORMATIE</h4>
              </div>
              <p className="text-[11px] text-slate-400 font-medium px-1 italic">Heb je vragen, lukt het instellen niet of wil je meer weten over de privacy?</p>

              <div className="space-y-3">
                <a href="https://www.barkr.nl" target="_blank" rel="noopener noreferrer" className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between group active:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-[#EA580C] transition-colors">
                      <Globe size={18} strokeWidth={1.5} />
                    </div>
                    <span className="text-xs font-bold text-slate-900">Bezoek onze website: www.barkr.nl</span>
                  </div>
                  <ExternalLink size={16} className="text-slate-300" />
                </a>
                <a href="mailto:info@barkr.nl" className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between group active:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-[#EA580C] transition-colors">
                      <Mail size={18} strokeWidth={1.5} />
                    </div>
                    <span className="text-xs font-bold text-slate-900">Stuur ons een e-mail: info@barkr.nl</span>
                  </div>
                  <ExternalLink size={16} className="text-slate-300" />
                </a>
              </div>
            </section>

            {/* FINAL CTA */}
            <div className="pt-6 space-y-4">
              <button 
                onClick={() => setShowManual(false)} 
                className="w-full py-5 bg-[#0F172A] text-white rounded-3xl text-xs font-black uppercase tracking-[0.1em] shadow-xl shadow-slate-200 active:scale-95 transition-transform"
              >
                IK HEB HET BEGREPEN
              </button>
              <div className="flex flex-col items-center gap-1 opacity-20 italic">
                 <p className="text-[10px] font-black uppercase tracking-widest">SafeGuard Protocol v{VERSION}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
