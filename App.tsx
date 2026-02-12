
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
  Dog
} from 'lucide-react';
import { UserSettings, ActivityLog, DaySchedule } from './types';

// HIER IS DE FIX: Gebruik een vaste path string voor het logo
const LOGO_PATH = '/logo.png';
const VERSION = '10.5.2'; 
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
      console.warn("Server tijdelijk onbereikbaar:", e);
      // We zetten status op offline maar tonen geen rode waarschuwingen meer
      setPiStatus('offline');
    }
  }, [serverUrl, settings.myPhone]);

  const saveSettingsToServer = useCallback(async (currentSettings: UserSettings) => {
    if (!currentSettings.myPhone) return;
    try {
      await fetch(`${serverUrl}/save_settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSettings),
        mode: 'cors'
      });
      localStorage.setItem('last_known_phone', currentSettings.myPhone);
    } catch (e) {
      console.error("Opslaan mislukt:", e);
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
        schedules: { ...prev.schedules, [dayIndex]: { ...prev.schedules[dayIndex], [field]: value } }
      };
      saveSettingsToServer(newSettings);
      return newSettings;
    });
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
    if (!force && now - lastTriggerRef.current < 20000) return; 
    if (!settings.email || !settings.myPhone) return;

    setIsProcessing(true);
    const batt = await getBattery();

    try {
      const response = await fetch(`${serverUrl}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, user: settings.email.trim(), battery: batt, phone: settings.myPhone }),
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
    }, 45000); 
    return () => clearInterval(interval);
  }, [checkPiStatus, triggerCheckin, fetchSettingsFromServer]);

  useEffect(() => {
    localStorage.setItem('safeguard_settings', JSON.stringify(settings));
  }, [settings]);

  const handleSettingsUpdate = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveSettingsToServer(newSettings);
  };

  const getDaySummary = () => {
    if (settings.activeDays.length === 7) return 'Elke dag';
    if (settings.activeDays.length === 0) return 'Geen bewaking';
    return settings.activeDays.map(d => DAYS_SHORT[d]).join(', ');
  };

  const currentDayIndex = (new Date().getDay() + 6) % 7;
  const currentDeadline = settings.useCustomSchedule 
    ? settings.schedules[currentDayIndex]?.endTime 
    : settings.endTime;

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans select-none overflow-x-hidden">
      <header className="flex items-center justify-between p-6 bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 overflow-hidden rounded-xl shadow-lg shadow-orange-100 flex items-center justify-center bg-orange-600">
            <img src={LOGO_PATH} alt="Barkr" className="w-full h-full object-cover" />
            <Dog className="text-white absolute opacity-0" size={24} />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-slate-900">Barkr</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${piStatus === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span className={`text-[9px] font-bold uppercase tracking-tight ${piStatus === 'online' ? 'text-emerald-600' : 'text-slate-400'}`}>
                {piStatus === 'online' ? 'Barkr is waakzaam' : 'Verbinden...'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowManual(true)} className="p-3 bg-orange-50 rounded-2xl border border-orange-100 text-orange-600"><Info size={20} /></button>
          <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-100 rounded-2xl text-slate-600"><SettingsIcon size={20} /></button>
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
                lastSuccessTime ? <CheckCircle2 size={36} className="text-emerald-500 animate-in zoom-in-50 duration-300" /> : <RefreshCw size={36} className="text-slate-100" />
              )}
           </div>

           <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3 text-slate-600">
                <Clock size={16} className="text-rose-500" />
                <p className="text-[11px] font-bold">Vandaag deadline: <span className="text-rose-600 font-black">{currentDeadline} uur</span></p>
              </div>
              <p className="text-[10px] font-bold text-slate-400 italic">v{VERSION}</p>
           </div>
        </div>

        <div className="bg-orange-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-100 mb-2 flex items-center gap-2">
            <CalendarDays size={12} /> Bewakingsdagen
          </p>
          <h2 className="text-xl font-bold mb-1">{getDaySummary()}</h2>
          <p className="text-xs text-orange-50 opacity-90 leading-relaxed italic">Barkr waakt over je op de geselecteerde dagen.</p>
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
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recent Logboek</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {history.length === 0 ? <p className="p-8 text-center text-slate-300 text-[10px] font-bold uppercase">Geen data beschikbaar</p> : history.map((log, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <p className="text-xs font-black text-slate-900">{log.timeStr} <span className="text-slate-300 ml-2 font-normal">| {new Date(log.timestamp).toLocaleDateString('nl-NL', {weekday: 'short'})}</span></p>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Battery size={10} />
                  <span className="text-[10px] font-bold">{log.battery}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col p-8 overflow-y-auto animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
                 <img src={LOGO_PATH} alt="Barkr" className="w-full h-full object-cover" />
               </div>
               <h3 className="text-xl font-black uppercase italic text-slate-900 tracking-tight">Configuratie</h3>
             </div>
             <button onClick={() => { setShowSettings(false); triggerCheckin(true); }} className="p-3 bg-slate-100 rounded-2xl text-slate-600"><X size={24}/></button>
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
                    className={`flex-1 py-3.5 rounded-xl text-[11px] font-black transition-all border ${
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
                    <h4 className="text-sm font-black text-slate-900 italic">Planning</h4>
                    <p className="text-[10px] text-slate-400 italic">Variëren per dag mogelijk</p>
                  </div>
                  <button 
                    onClick={() => handleSettingsUpdate({ ...settings, useCustomSchedule: !settings.useCustomSchedule })}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.useCustomSchedule ? 'bg-orange-500' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.useCustomSchedule ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {!settings.useCustomSchedule ? (
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                    {DAYS_FULL.map((dayName, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl border ${settings.activeDays.includes(idx) ? 'bg-orange-50/20 border-orange-100' : 'bg-slate-50 border-slate-200 opacity-40'}`}>
                        <div className="flex items-center justify-between mb-3">
                           <span className="text-[11px] font-black uppercase text-slate-700 italic">{dayName}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="time" value={settings.schedules[idx]?.startTime || '07:00'} onChange={e => updateDaySchedule(idx, 'startTime', e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" disabled={!settings.activeDays.includes(idx)} />
                          <input type="time" value={settings.schedules[idx]?.endTime || '08:30'} onChange={e => updateDaySchedule(idx, 'endTime', e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-rose-600" disabled={!settings.activeDays.includes(idx)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </section>

            <div className="space-y-5">
              <section className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1 italic">Jouw Naam</label>
                <input type="text" placeholder="Naam" value={settings.email} onChange={e => handleSettingsUpdate({...settings, email: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-orange-500" />
              </section>
              <section className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1 italic">Bewaakt Mobiel Nummer</label>
                <input type="text" placeholder="Bijv. 0612345678" value={settings.myPhone} onChange={e => handleSettingsUpdate({...settings, myPhone: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm outline-none focus:border-orange-500" />
              </section>
            </div>

            <section className="space-y-5 pt-6 border-t border-slate-100">
               <div className="flex items-center justify-between px-1">
                  <h4 className="text-[10px] font-black uppercase text-orange-600 tracking-widest italic">Noodcontacten</h4>
                  <button onClick={() => handleSettingsUpdate({ ...settings, contacts: [...settings.contacts, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '' }] })} className="w-10 h-10 bg-orange-600 rounded-xl text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"><Plus size={20} /></button>
               </div>
               {settings.contacts.map((c) => (
                  <div key={c.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3 flex-1">
                         <Fingerprint size={16} className="text-slate-300" />
                         <input type="text" placeholder="Naam contact" value={c.name} onChange={e => handleSettingsUpdate({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, name: e.target.value} : x)})} className="bg-transparent font-bold text-slate-900 outline-none w-full" />
                      </div>
                      <button onClick={() => handleSettingsUpdate({ ...settings, contacts: settings.contacts.filter(x => x.id !== c.id) })} className="text-rose-400 p-2 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                    </div>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input type="text" placeholder="Mobiel nummer" value={c.phone} onChange={e => handleSettingsUpdate({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, phone: e.target.value} : x)})} className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 pl-10 text-xs font-medium outline-none focus:border-orange-500" />
                    </div>
                  </div>
                ))}
            </section>
            
            <section className="pt-6 border-t border-slate-100 opacity-20 hover:opacity-100 transition-opacity">
               <div className="flex items-center gap-2 mb-2 px-1">
                  <Link2 size={12} className="text-slate-400" />
                  <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest italic">Server Verbinding</p>
               </div>
               <p className="text-[9px] text-slate-500 font-mono break-all px-1 italic">Host: {serverUrl}</p>
            </section>
          </div>
        </div>
      )}

      {showManual && (
        <div className="fixed inset-0 z-[120] bg-white flex flex-col p-8 overflow-y-auto animate-in slide-in-from-bottom-4">
           <div className="flex justify-between items-center mb-8">
              <div className="w-8 h-8 overflow-hidden rounded-lg mr-2">
                <img src={LOGO_PATH} alt="Barkr" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-xl font-black uppercase italic text-slate-900">Over Barkr</h2>
              <button onClick={() => setShowManual(false)} className="p-3 bg-slate-100 rounded-2xl text-slate-900"><X size={24}/></button>
           </div>
           <div className="space-y-8 pb-20 text-slate-600 leading-relaxed">
              <p className="text-sm italic">Barkr is je trouwe digitale waakhond die over je veiligheid waakt.</p>
              <div className="bg-orange-50 p-6 rounded-3xl space-y-4 border border-orange-100">
                <p className="text-xs font-black text-orange-950 uppercase italic tracking-widest">Hoe het werkt:</p>
                <ul className="text-xs space-y-3 text-orange-900">
                  <li className="flex items-start gap-2">
                    <span className="font-black text-orange-600">1.</span>
                    <span>Stel je actieve tijden en deadlines in.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-black text-orange-600">2.</span>
                    <span>Open de app in je startvenster om je activiteit te bevestigen.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-black text-orange-600">3.</span>
                    <span>Geen activiteit voor de deadline? Barkr verstuurt automatisch een WhatsApp alarm naar je contacten.</span>
                  </li>
                </ul>
              </div>
              <button onClick={() => setShowManual(false)} className="w-full py-5 bg-slate-900 text-white rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200">Begrepen</button>
              <div className="flex flex-col items-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                 <p>SafeGuard Protocol</p>
                 <p>v{VERSION}</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
