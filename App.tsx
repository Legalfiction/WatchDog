
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
  Calendar
} from 'lucide-react';
import { UserSettings, EmergencyContact, ActivityLog, DaySchedule } from './types';

const VERSION = '9.6.0';
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
  
  // Hardcoded serverUrl, geen gebruiker invoer meer nodig
  const serverUrl = DEFAULT_URL;
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
      schedules: parsed?.schedules || defaultSchedules
    };
  });

  const toggleDay = (dayIndex: number) => {
    setSettings(prev => {
      const activeDays = prev.activeDays.includes(dayIndex)
        ? prev.activeDays.filter(d => d !== dayIndex)
        : [...prev.activeDays, dayIndex].sort((a, b) => a - b);
      return { ...prev, activeDays };
    });
  };

  const updateDaySchedule = (dayIndex: number, field: keyof DaySchedule, value: string) => {
    setSettings(prev => ({
      ...prev,
      schedules: {
        ...prev.schedules,
        [dayIndex]: {
          ...prev.schedules[dayIndex],
          [field]: value
        }
      }
    }));
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

    if (!serverUrl || !settings.email || !settings.myPhone) return;

    setIsProcessing(true);
    const batt = await getBattery();

    const payload = {
        ...settings,
        user: settings.email.trim(),
        battery: batt
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
    if (!serverUrl) { setPiStatus('offline'); return; }
    if (!silent) setPiStatus('checking');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const res = await fetch(`${serverUrl}/status?user=${encodeURIComponent(settings.email.trim())}`, { 
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
          <div className="p-2 bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-100">
            <Dog size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-slate-900">Barkr</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${piStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className={`text-[9px] font-bold uppercase tracking-tight ${piStatus === 'online' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {piStatus === 'online' ? 'Barkr is waakzaam' : 'Barkr is niet waakzaam'}
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
              <p className="text-[11px] font-bold text-slate-600">Vandaag deadline: <span className="text-rose-600 font-black">{currentDeadline} uur</span></p>
           </div>
        </div>

        <div className="bg-orange-600 rounded-3xl p-6 text-white shadow-lg shadow-orange-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-100 mb-2 flex items-center gap-2">
            <CalendarDays size={12} /> Bewakingsdagen
          </p>
          <h2 className="text-xl font-bold mb-1">{getDaySummary()}</h2>
          <p className="text-xs text-orange-50 opacity-90 leading-relaxed italic">Barkr bewaakt je op de geselecteerde dagen en tijden.</p>
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
             <div className="flex items-center gap-3">
               <div className="p-2 bg-orange-600 text-white rounded-lg"><Dog size={18}/></div>
               <h3 className="text-xl font-black uppercase italic text-slate-900">Barkr Setup</h3>
             </div>
             <button onClick={() => { setShowSettings(false); triggerCheckin(true); }} className="p-3 bg-slate-100 rounded-2xl"><X size={24}/></button>
          </div>
          
          <div className="space-y-6 pb-20">
            <section className="bg-white p-2 space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1 italic flex items-center gap-2">
                <CalendarDays size={14}/> Bewakingsdagen
              </label>
              <div className="flex w-full gap-1">
                {DAYS_SHORT.map((day, idx) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(idx)}
                    className={`flex-1 min-w-0 py-3 rounded-xl text-[11px] font-black transition-all border ${
                      settings.activeDays.includes(idx) 
                        ? 'bg-orange-600 text-white border-orange-700 shadow-sm' 
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white border border-slate-100 rounded-3xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 italic">Slimme Planning</h4>
                    <p className="text-[10px] text-slate-400">Verschillende tijden per dag instellen</p>
                  </div>
                  <button 
                    onClick={() => setSettings(prev => ({ ...prev, useCustomSchedule: !prev.useCustomSchedule }))}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.useCustomSchedule ? 'bg-orange-500' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.useCustomSchedule ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {!settings.useCustomSchedule ? (
                  <div className="grid grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-1">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 px-1 italic">Standaard Start</label>
                      <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-rose-500 px-1 italic">Standaard Deadline</label>
                      <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-rose-600" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2 max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2">
                    {DAYS_FULL.map((dayName, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl border ${settings.activeDays.includes(idx) ? 'bg-orange-50/50 border-orange-100' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                        <div className="flex items-center gap-2 mb-2">
                           <Calendar size={12} className={settings.activeDays.includes(idx) ? 'text-orange-500' : 'text-slate-400'} />
                           <span className="text-[11px] font-black uppercase text-slate-700 tracking-tight">{dayName}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input 
                            type="time" 
                            value={settings.schedules[idx]?.startTime || '07:00'} 
                            onChange={e => updateDaySchedule(idx, 'startTime', e.target.value)} 
                            className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold" 
                            disabled={!settings.activeDays.includes(idx)}
                          />
                          <input 
                            type="time" 
                            value={settings.schedules[idx]?.endTime || '08:30'} 
                            onChange={e => updateDaySchedule(idx, 'endTime', e.target.value)} 
                            className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-rose-600" 
                            disabled={!settings.activeDays.includes(idx)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

            <section className="space-y-4 pt-4 border-t">
               <div className="flex items-center justify-between px-1">
                  <h4 className="text-[10px] font-black uppercase text-orange-600 tracking-widest italic">Noodcontacten</h4>
                  <button onClick={() => setSettings(prev => ({ ...prev, contacts: [...prev.contacts, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '', apiKey: '' }] }))} className="w-10 h-10 bg-orange-600 rounded-xl text-white flex items-center justify-center shadow-md shadow-orange-100"><Plus size={20} /></button>
               </div>
               {settings.contacts.map((c) => (
                  <div key={c.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <input type="text" placeholder="Naam" value={c.name} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, name: e.target.value} : x)})} className="bg-transparent font-bold text-slate-900 outline-none w-full" />
                      <button onClick={() => setSettings(prev => ({ ...prev, contacts: prev.contacts.filter(x => x.id !== c.id) }))} className="text-rose-400 p-2"><Trash2 size={18} /></button>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Nummer" value={c.phone} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, phone: e.target.value} : x)})} className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-sm" />
                      <button onClick={() => window.open(`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent("I allow callmebot to send me messages")}`, '_blank')} className="p-3 bg-emerald-500 text-white rounded-xl"><MessageCircle size={20} /></button>
                    </div>
                    <input type="password" placeholder="CallMeBot API Key" value={c.apiKey} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, apiKey: e.target.value} : x)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm" />
                  </div>
                ))}
            </section>
          </div>
        </div>
      )}

      {showManual && (
        <div className="fixed inset-0 z-[120] bg-white flex flex-col p-8 overflow-y-auto animate-in slide-in-from-bottom-4">
           <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-600 text-white rounded-lg shadow-lg shadow-orange-100">
                  <Dog size={20} />
                </div>
                <h2 className="text-xl font-black uppercase italic text-slate-900">Over Barkr</h2>
              </div>
              <button onClick={() => setShowManual(false)} className="p-3 bg-slate-100 rounded-2xl text-slate-900"><X size={24}/></button>
           </div>

           <div className="space-y-10 pb-16">
              <section className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
                <h3 className="text-sm font-black uppercase text-orange-600 mb-3 flex items-center gap-2">
                  <ShieldCheck size={18} /> De Waakhond die over je waakt
                </h3>
                <p className="text-sm text-orange-950 leading-relaxed italic mb-4">
                  De naam <strong>Barkr</strong> is afgeleid van het Engelse 'to bark' (blaffen). Net als een trouwe viervoeter is deze applicatie ontworpen om over je veiligheid te waken en onraad te detecteren.
                </p>
                <p className="text-xs text-orange-900 leading-relaxed">
                  Een waakhond is stil zolang alles goed gaat. Maar als er onraad is — in dit geval als jij je niet tijdig meldt — dan "blaft" Barkr door direct een alarmsignaal via WhatsApp te sturen naar je naasten. Zo ben je nooit ongemerkt in nood.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400 px-1 tracking-widest flex items-center gap-2">
                  <BookOpen size={16} /> Wat doet Barkr precies?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Barkr is een geautomatiseerde welzijnsmonitor. In grote lijnen controleert het systeem dagelijks of je actief bent binnen een vooraf ingesteld tijdvenster. 
                  Zodra je de applicatie opent, ontvangt onze server een 'hartslag'. Blijft deze hartslag uit na de gestelde deadline? 
                  Dan wordt er automatisch een noodmelding verstuurd naar je vooraf ingestelde contacten.
                </p>
              </section>

              <section className="space-y-6">
                <h3 className="text-xs font-black uppercase text-slate-400 px-1 tracking-widest flex items-center gap-2">
                  <HelpCircle size={16} /> Uitgebreide Handleiding
                </h3>
                
                <div className="space-y-4">
                  <div className="p-5 bg-white border border-slate-200 rounded-3xl space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <Smartphone size={18} className="text-orange-500" /> Dashboard & Schermen
                    </div>
                    <p className="text-xs text-slate-500 leading-normal">
                      <strong>Dashboard:</strong> Toont je huidige status. Groen betekent "waakzaam". De grote tijdstempel geeft aan hoe laat je vandaag voor het laatst succesvol bent ingecheckt. Ook zie je hier je batterijpercentage; dit is belangrijk omdat Barkr dit meestuurt in noodmeldingen zodat contacten weten of je mobiel simpelweg leeg is.
                    </p>
                    <p className="text-xs text-slate-500 leading-normal">
                      <strong>Activiteit:</strong> Hieronder zie je de geschiedenis van je laatste aanmeldingen. Zo kun je zelf controleren of het systeem goed functioneert.
                    </p>
                  </div>

                  <div className="p-5 bg-white border border-slate-200 rounded-3xl space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <SettingsIcon size={18} className="text-slate-400" /> Waarom gegevens invoeren?
                    </div>
                    <ul className="text-xs text-slate-500 space-y-3">
                      <li className="flex gap-2">
                        <span className="font-bold text-slate-700 min-w-[100px]">Naam & Nummer:</span> 
                        Deze zijn essentieel zodat we in de alarmmelding aan je contacten kunnen doorgeven wie er hulp nodig heeft.
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-slate-700 min-w-[100px]">Planning:</span> 
                        We moeten weten tussen welke tijden je gewoonlijk wakker bent, zodat we niet onnodig "blaffen" terwijl je nog slaapt.
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-slate-700 min-w-[100px]">Contacten:</span> 
                        Zonder noodcontacten kan Barkr niemand waarschuwen. De CallMeBot API key is nodig om veilig via WhatsApp te kunnen communiceren.
                      </li>
                    </ul>
                  </div>

                  <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold">
                      <Zap size={18} className="text-emerald-600" /> Belangrijke Gebruiksregel
                    </div>
                    <p className="text-xs text-emerald-800 leading-normal font-medium">
                      Vooralsnog is de techniek zo dat je de applicatie <strong>altijd éénmaal per dag moet openen</strong> binnen je gekozen tijdsvenster. 
                      Zodra je de app opent en de melding "Barkr is waakzaam" ziet, is je veiligheid voor die dag bevestigd. Verder hoef je niets te doen!
                    </p>
                  </div>
                </div>
              </section>

              <section className="bg-slate-900 p-6 rounded-3xl text-white">
                <h3 className="text-xs font-black uppercase text-orange-400 mb-3 flex items-center gap-2">
                  <RefreshCw size={16} /> De Toekomst
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  In de nabije toekomst zal Barkr zo intelligent worden dat het volledig op de achtergrond draait. 
                  Je hoeft de app dan niet meer handmatig te openen; Barkr zal zelfstandig detecteren of je actief bent geweest op je telefoon.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400 px-1 tracking-widest flex items-center gap-2">
                  <Mail size={16} /> Meer informatie & Support
                </h3>
                <p className="text-xs text-slate-500 px-1 leading-relaxed">
                  Heb je vragen of wil je meer weten over hoe Barkr jouw veiligheid waarborgt? Kijk op onze website of stuur ons een bericht.
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <a href="https://barkr.nl" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-2xl group transition-all hover:bg-white hover:border-orange-200">
                    <div className="flex items-center gap-3">
                      <Globe size={20} className="text-slate-400 group-hover:text-orange-500" />
                      <span className="text-xs font-bold text-slate-700">www.barkr.nl</span>
                    </div>
                    <ExternalLink size={16} className="text-slate-300 group-hover:text-orange-500" />
                  </a>
                  <a href="mailto:info@barkr.nl" className="flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-2xl group transition-all hover:bg-white hover:border-orange-200">
                    <div className="flex items-center gap-3">
                      <Mail size={20} className="text-slate-400 group-hover:text-orange-500" />
                      <span className="text-xs font-bold text-slate-700">info@barkr.nl</span>
                    </div>
                    <ExternalLink size={16} className="text-slate-300 group-hover:text-orange-500" />
                  </a>
                </div>
              </section>

              <div className="pt-6 flex flex-col items-center gap-3">
                 <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
                    <Dog size={14} className="text-slate-400" />
                    <p className="text-[10px] text-slate-400 font-mono font-bold tracking-tighter">Barkr SafeGuard v{VERSION}</p>
                 </div>
                 <button onClick={() => setShowManual(false)} className="w-full py-5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-transform">Ik heb het begrepen</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
