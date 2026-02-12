
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Settings as SettingsIcon, X, Trash2, Plus, User, Battery, Plane, Clock, 
  Info, RefreshCw, ShieldCheck, Phone, CalendarDays, Shield, BellRing, 
  ChevronRight, Activity, Wifi, Signal
} from 'lucide-react';
import { UserSettings, ActivityLog, DaySchedule, EmergencyContact } from './types';

const VERSION = '11.2.3'; 
const PUBLIC_IP = '94.157.47.162';
const LOCAL_IP = '192.168.1.38';
const PORT = '5000';

const LOGO_SVG = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiByeD0iOTYiIGZpbGw9IiNFQTU4MEMiLz4KPHBhdGggZD0iTTM2OCAxNjBDMzM2IDE2MCAzMDQgMTkyIDI4OCAyMjRMMjQwIDE5MkwxNjAgMTYwQzEyOCAxNjAgOTYgMTkyIDk2IDIyNEM5NiAyNTYgMTI4IDI4OCAxNjAgMjg4TDI0MCAzMjBMMjg4IDM4NEMzMDQgNDE2IDMzNiA0NDggMzY4IDQ0OEM0MDAgNDQ4IDQzMiA0MTYgNDMyIDM4NEM0MzIgMzUyIDQwMCAzMjAgMzY4IDMyMEgyODhMMzY4IDE2MFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xNjAgMjI0QzE0OS40IDIyNCAxNDAgMjE0LjYgMTQwIDIwNEMxNDAgMTkzLjQgMTQ5LjQgMTg0IDE2MCAxODRDMTcwLjYgMTg0IDE4MCAxOTMuNCAxODAgMjA0QzE4MCAyMTQuNiAxNzAuNiAyMjQgMTYwIDIyNFoiIGZpbGw9IiNFQTU4MEMiLz4KPCEtLSBCYXJraW5nIExpbmVzIC0tPgo8cGF0aCBkPSJNNDUwIDIyMEM0NjAgMjQwIDQ2MCAyNzIgNDUwIDI5MiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik00ODAgMTkwQzQ5NSAyMjAgNDk1IDI5MiA0ODAgMzIyIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIwIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+`;

const DAYS_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

const formatToBarkrPhone = (phone: string) => {
  let p = phone.replace(/\s/g, '').replace(/-/g, '');
  if (p.startsWith('06')) return '+316' + p.substring(2);
  if (p.startsWith('00316')) return '+316' + p.substring(5);
  if (p.startsWith('316') && !p.startsWith('+')) return '+316' + p.substring(3);
  return p.startsWith('+') ? p : p; 
};

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [lastSuccessTime, setLastSuccessTime] = useState<string | null>(localStorage.getItem('safeguard_last_success'));
  const [piStatus, setPiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [activeUrl, setActiveUrl] = useState(`http://${PUBLIC_IP}:${PORT}`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [history, setHistory] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('safeguard_history');
    return saved ? JSON.parse(saved) : [];
  });
  
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
      myPhone: parsed?.myPhone || '',
      startTime: parsed?.startTime || '07:00', 
      endTime: parsed?.endTime || '08:30', 
      contacts: parsed?.contacts || [],
      vacationMode: parsed?.vacationMode || false,
      activeDays: parsed?.activeDays || [0, 1, 2, 3, 4, 5, 6],
      useCustomSchedule: parsed?.useCustomSchedule || false,
      schedules: parsed?.schedules || defaultSchedules,
      serverUrl: activeUrl
    };
  });

  const checkConnection = useCallback(async () => {
    // We proberen eerst het publieke IP (voor 4G)
    try {
      const res = await fetch(`http://${PUBLIC_IP}:${PORT}/status`, { mode: 'cors', signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        setActiveUrl(`http://${PUBLIC_IP}:${PORT}`);
        setPiStatus('online');
        return;
      }
    } catch (e) {
      // Als publiek faalt, probeer lokaal (voor Wi-Fi)
      try {
        const res = await fetch(`http://${LOCAL_IP}:${PORT}/status`, { mode: 'cors', signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          setActiveUrl(`http://${LOCAL_IP}:${PORT}`);
          setPiStatus('online');
          return;
        }
      } catch (err) {
        setPiStatus('offline');
      }
    }
  }, []);

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

  const updateHistory = (timeStr: string, batt: number | null) => {
    const newLog = { timestamp: Date.now(), timeStr, battery: batt || undefined };
    const updated = [newLog, ...history].slice(0, 5);
    setHistory(updated);
    setLastSuccessTime(timeStr);
    localStorage.setItem('safeguard_history', JSON.stringify(updated));
    localStorage.setItem('safeguard_last_success', timeStr);
  };

  const triggerCheckin = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastTriggerRef.current < 30000) return; 
    if (!settings.myPhone || piStatus !== 'online') return;
    
    setIsProcessing(true);
    const batt = await getBattery(); 
    try {
      const response = await fetch(`${activeUrl}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...settings, 
          phone: formatToBarkrPhone(settings.myPhone),
          battery: batt 
        }),
        mode: 'cors'
      });
      if (response.ok) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        updateHistory(timeStr, batt);
        lastTriggerRef.current = Date.now();
      }
    } catch (err) {
      console.error("Ping failed", err);
    } finally { 
      setIsProcessing(false); 
    }
  }, [settings, activeUrl, piStatus, history]);

  const testContact = async (contact: EmergencyContact) => {
    if (!contact.phone) return alert('Vul eerst een telefoonnummer in.');
    try {
      const res = await fetch(`${activeUrl}/test_contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatToBarkrPhone(contact.phone), name: contact.name }),
        mode: 'cors'
      });
      if (res.ok) alert(`Test WhatsApp verzonden naar ${contact.name || 'contact'}`);
      else alert('Kon test niet versturen. Controleer de Pi verbinding.');
    } catch (e) { alert('Pi niet bereikbaar.'); }
  };

  useEffect(() => {
    checkConnection();
    const connInterval = setInterval(checkConnection, 10000);
    const pingInterval = setInterval(() => triggerCheckin(), 60000);
    
    // Direct checkin on startup if online
    if (piStatus === 'online') triggerCheckin(true);

    return () => {
      clearInterval(connInterval);
      clearInterval(pingInterval);
    };
  }, [checkConnection, triggerCheckin, piStatus]);

  const handleSettingsUpdate = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem('safeguard_settings', JSON.stringify(newSettings));
  };

  const isSetupIncomplete = !settings.myPhone || settings.contacts.length === 0;
  const currentDayIndex = (new Date().getDay() + 6) % 7;
  const currentDeadline = settings.useCustomSchedule 
    ? settings.schedules[currentDayIndex]?.endTime 
    : settings.endTime;

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans antialiased">
      <header className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src={LOGO_SVG} alt="Barkr" className="w-12 h-12 rounded-xl" />
          <div>
            <h1 className="text-base font-black tracking-tight uppercase leading-none">Barkr <span className="text-slate-400 font-medium lowercase text-[10px]">v{VERSION}</span></h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full ${piStatus === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {piStatus === 'online' ? 'Status: Verbonden' : 'Verbinden...'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setShowManual(true)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 active:bg-slate-100">
            <Info size={18} strokeWidth={1.5} />
          </button>
           <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 active:bg-slate-100">
            <SettingsIcon size={18} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 space-y-6">
        {isSetupIncomplete && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-center gap-4">
            <Shield className="text-orange-600 shrink-0" size={24} strokeWidth={1.5} />
            <div className="flex-1">
              <p className="text-[10px] font-black text-orange-900 uppercase">Configuratie vereist</p>
              <p className="text-xs text-orange-800/70 mt-0.5 font-medium leading-tight">Telefoonnummer en contacten nodig.</p>
            </div>
            <button onClick={() => setShowSettings(true)} className="bg-orange-600 text-white p-2 rounded-lg">
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center text-center space-y-4 shadow-sm">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${piStatus === 'online' ? 'bg-emerald-50 text-emerald-600 border-emerald-500' : 'bg-slate-50 text-slate-300 border-slate-300'}`}>
            {piStatus === 'online' ? <ShieldCheck size={48} strokeWidth={1.5} /> : <Activity size={48} strokeWidth={1.5} className="animate-pulse" />}
          </div>
          <div>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Actief Levensteken</h2>
            <p className={`text-4xl font-black tracking-tighter ${lastSuccessTime ? 'text-slate-900' : 'text-slate-300'}`}>
              {lastSuccessTime || 'Wachten...'}
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <div className="px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
              <Clock size={14} className="text-[#EA580C]" />
              <span className="text-xs font-black text-slate-600 uppercase tracking-wide">Deadline: {currentDeadline}u</span>
            </div>
            {isProcessing && <RefreshCw size={16} className="text-orange-600 animate-spin" />}
          </div>
        </div>

        {/* CONNECTION MODE INDICATOR */}
        <div className={`rounded-2xl p-5 flex items-center justify-between shadow-lg transition-colors ${piStatus === 'online' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
           <div className="flex items-center gap-3">
             <div className={`w-2 h-2 rounded-full ${piStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
             <p className="text-[10px] font-black uppercase tracking-widest">
               {piStatus === 'online' ? 'Verbinding Actief' : 'Zoeken naar Pi...'}
             </p>
           </div>
           <div className={`px-4 py-1.5 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase ${piStatus === 'online' ? 'bg-white/10' : 'bg-slate-300/50'}`}>
              {activeUrl.includes(PUBLIC_IP) ? <Signal size={12} /> : <Wifi size={12} />}
              {activeUrl.includes(PUBLIC_IP) ? '4G Mode' : 'Wi-Fi Mode'}
           </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-3">
            <User size={18} className="text-slate-400" />
            <div className="overflow-hidden">
              <p className="text-[9px] font-black text-slate-400 uppercase">Nummer</p>
              <p className="text-xs font-bold truncate">{settings.myPhone || '--'}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-3">
            <Battery size={18} className={batteryLevel && batteryLevel > 20 ? 'text-slate-400' : 'text-rose-500'} />
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">Batterij</p>
              <p className="text-xs font-bold">{batteryLevel !== null ? `${batteryLevel}%` : '--%'}</p>
            </div>
          </div>
        </div>

        {/* VACATION MODE */}
        <button 
          onClick={() => handleSettingsUpdate({...settings, vacationMode: !settings.vacationMode})}
          className={`w-full p-6 rounded-2xl border transition-all flex items-center justify-between ${settings.vacationMode ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center gap-4">
            <Plane size={24} className={settings.vacationMode ? 'text-amber-500' : 'text-slate-400'} />
            <div className="text-left">
              <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Vakantiemodus</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Geen bewaking actief</p>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full p-1 ${settings.vacationMode ? 'bg-amber-500' : 'bg-slate-200'}`}>
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.vacationMode ? 'translate-x-6' : 'translate-x-0'}`} />
          </div>
        </button>
      </main>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col p-8 overflow-y-auto animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between mb-10">
             <div className="flex items-center gap-3">
               <img src={LOGO_SVG} alt="Barkr" className="w-10 h-10 rounded-xl" />
               <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Instellingen</h3>
             </div>
             <button onClick={() => { setShowSettings(false); checkConnection(); }} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"><X size={28}/></button>
          </div>
          <div className="space-y-8 pb-24">
            <section className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Verbinding</label>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-slate-400 tracking-wider">Huidige URL:</span>
                  <span className="text-emerald-600">{activeUrl}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-slate-400 tracking-wider">Status:</span>
                  <span className={piStatus === 'online' ? 'text-emerald-600' : 'text-rose-600'}>{piStatus}</span>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Mijn Gegevens</label>
              <div className="space-y-3">
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input type="text" placeholder="Naam" value={settings.email} onChange={e => handleSettingsUpdate({...settings, email: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm outline-none focus:border-orange-500" />
                </div>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input type="text" placeholder="+31 6 ..." value={settings.myPhone} onChange={e => handleSettingsUpdate({...settings, myPhone: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-black outline-none focus:border-orange-500" />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Waak Tijden</label>
                <button onClick={() => handleSettingsUpdate({ ...settings, useCustomSchedule: !settings.useCustomSchedule })} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors ${settings.useCustomSchedule ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {settings.useCustomSchedule ? 'Eigen Schema' : 'Standaard'}
                </button>
              </div>
              
              {!settings.useCustomSchedule ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Begin Dag</p>
                    <input type="time" value={settings.startTime} onChange={e => handleSettingsUpdate({...settings, startTime: e.target.value})} className="bg-transparent font-black text-xl outline-none w-full" />
                  </div>
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Controle</p>
                    <input type="time" value={settings.endTime} onChange={e => handleSettingsUpdate({...settings, endTime: e.target.value})} className="bg-transparent font-black text-xl text-rose-600 outline-none w-full" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {DAYS_SHORT.map((day, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                       <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black ${settings.activeDays.includes(idx) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-300'}`}>{day}</div>
                       <div className="flex-1 grid grid-cols-2 gap-2">
                          <input type="time" value={settings.schedules[idx]?.startTime || '07:00'} onChange={e => handleSettingsUpdate({...settings, schedules: { ...settings.schedules, [idx]: { ...settings.schedules[idx], startTime: e.target.value } }})} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black" />
                          <input type="time" value={settings.schedules[idx]?.endTime || '08:30'} onChange={e => handleSettingsUpdate({...settings, schedules: { ...settings.schedules, [idx]: { ...settings.schedules[idx], endTime: e.target.value } }})} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-rose-600" />
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
               <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Noodcontacten</label>
                  <button onClick={() => handleSettingsUpdate({ ...settings, contacts: [...settings.contacts, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '' }] })} className="w-12 h-12 bg-orange-600 text-white rounded-2xl flex items-center justify-center active:scale-95 transition-transform shadow-sm">
                    <Plus size={24} strokeWidth={3} />
                  </button>
               </div>
               <div className="space-y-4">
                {settings.contacts.map((c) => (
                    <div key={c.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-200/50 pb-4">
                        <input type="text" placeholder="Naam Contact" value={c.name} onChange={e => handleSettingsUpdate({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, name: e.target.value} : x)})} className="bg-transparent font-black text-slate-900 text-sm outline-none w-full uppercase tracking-tight" />
                        <button onClick={() => handleSettingsUpdate({ ...settings, contacts: settings.contacts.filter(x => x.id !== c.id) })} className="text-slate-300 active:text-rose-500 transition-colors"><Trash2 size={20}/></button>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                          <input type="text" placeholder="+31 6 ..." value={c.phone} onChange={e => handleSettingsUpdate({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, phone: e.target.value} : x)})} className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-10 pr-3 text-xs font-black outline-none" />
                        </div>
                        <button onClick={() => testContact(c)} className="px-5 bg-white border border-slate-200 text-slate-900 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 active:bg-slate-100 transition-colors">
                          <BellRing size={14} className="text-orange-600" /> Test
                        </button>
                      </div>
                    </div>
                  ))}
               </div>
            </section>
          </div>
        </div>
      )}

      {/* MANUAL MODAL */}
      {showManual && (
        <div className="fixed inset-0 z-[120] bg-white flex flex-col animate-in slide-in-from-bottom-4">
          <header className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0">
             <div className="flex items-center gap-3">
               <img src={LOGO_SVG} alt="Barkr" className="w-10 h-10 rounded-xl" />
               <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest">Handleiding</h3>
             </div>
             <button onClick={() => setShowManual(false)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"><X size={24}/></button>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 pb-32">
            <section className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
              <p className="text-sm text-orange-900 leading-relaxed font-bold italic">
                Barkr is uw trouwe digitale waakhond. Hij kijkt elke dag of u de app opent voor uw ingestelde deadline.
              </p>
            </section>

            <section className="space-y-6">
              <h4 className="text-[10px] font-black uppercase text-slate-400 italic tracking-widest">Stappenplan</h4>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100 font-black">1</div>
                  <p className="text-xs text-slate-600 leading-relaxed"><span className="font-black text-slate-900 uppercase">Gebruik:</span> Open de app minstens één keer per dag tussen het begin van de dag en de controle tijd (bijv. 08:30).</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0 border border-orange-100 font-black">2</div>
                  <p className="text-xs text-slate-600 leading-relaxed"><span className="font-black text-slate-900 uppercase">Geen Gebruik:</span> Wordt de app niet geopend? Dan stuurt Barkr direct een WhatsApp naar uw contacten.</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0 font-black">3</div>
                  <p className="text-xs text-slate-600 leading-relaxed"><span className="font-black text-slate-900 uppercase">Nummers:</span> Zorg dat alle nummers beginnen met <span className="text-orange-600 font-black">+31 6</span> voor een gegarandeerde verbinding.</p>
                </div>
              </div>
            </section>

            <button onClick={() => setShowManual(false)} className="w-full py-6 bg-[#0F172A] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] active:scale-95 transition-transform shadow-lg">
              Begrepen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
