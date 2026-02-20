import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Info, Activity, HeartPulse, Plus, Trash2, X, ChevronDown, Clock } from 'lucide-react';
import { COUNTRIES } from './constants/countries';
import { TRANSLATIONS } from './constants/translations';
import { InfoPage } from './components/InfoPage';

const ENDPOINTS = ['https://barkr.nl', 'http://192.168.1.38:5000'];
const APP_KEY = 'BARKR_SECURE_V1';

const getLocalYYYYMMDD = (d: Date) => {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const t = (key: string, lang: string) => (TRANSLATIONS[lang] || TRANSLATIONS['nl'])[key] || key;

export default function App() {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'connected' | 'offline'>('offline');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showWeekPlan, setShowWeekPlan] = useState(false);
  const [lastPing, setLastPing] = useState('--:--');
  
  const now = new Date();
  const todayStr = getLocalYYYYMMDD(now); const tomorrowStr = getLocalYYYYMMDD(new Date(now.getTime() + 86400000));
  const todayIdx = (now.getDay() + 6) % 7; const tomorrowIdx = (new Date(now.getTime() + 86400000).getDay() + 6) % 7;

  const [activeTab, setActiveTab] = useState<'base' | 'today' | 'tomorrow'>('base');
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data'); const p = saved ? JSON.parse(saved) : {};
    return {
      name: p.name || 'Aldo gebruiker', vacationMode: p.vacationMode || false, country: p.country || 'NL',
      overrides: p.overrides || {}, contacts: p.contacts || [{name: 'Aldo user', phone: '+31615964009'}],
      schedules: p.schedules || {0:{startTime:'06:00',endTime:'10:00'},1:{startTime:'06:00',endTime:'10:00'},2:{startTime:'06:00',endTime:'10:00'},3:{startTime:'06:00',endTime:'10:00'},4:{startTime:'06:00',endTime:'10:00'},5:{startTime:'06:00',endTime:'10:00'},6:{startTime:'06:00',endTime:'10:00'}}
    };
  });

  const lang = COUNTRIES[settings.country]?.lang || 'nl';
  const daysVoluit = COUNTRIES[settings.country]?.days || COUNTRIES['NL'].days;

  const syncBackend = useCallback((data: any) => {
    if (activeUrl) {
      fetch(`${activeUrl}/save_settings`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ ...data, app_key: APP_KEY }) }).catch(() => {});
    }
  }, [activeUrl]);

  useEffect(() => { localStorage.setItem('barkr_v16_data', JSON.stringify(settings)); syncBackend(settings); }, [settings, syncBackend]);

  const findConnection = useCallback(async () => {
    for (const url of ENDPOINTS) { try { const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(1500) }); if (res.ok) { setActiveUrl(url); setStatus('connected'); return; } } catch (e) {} }
    setStatus('offline');
  }, []);

  useEffect(() => { findConnection(); const i = setInterval(findConnection, 10000); return () => clearInterval(i); }, [findConnection]);

  useEffect(() => {
    if (status !== 'connected' || !activeUrl || settings.vacationMode) return;
    const sendPing = () => { fetch(`${activeUrl}/ping`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app_key: APP_KEY, name: settings.name }) }).then(res => { if(res.ok) setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})); }); };
    const pingInterval = setInterval(sendPing, 5000); return () => clearInterval(pingInterval);
  }, [status, activeUrl, settings.vacationMode, settings.name]);

  const activeDateStr = activeTab === 'today' ? todayStr : tomorrowStr;
  const activeDayIdx = activeTab === 'today' ? todayIdx : tomorrowIdx;
  let displayStart = settings.schedules[activeDayIdx]?.startTime || '06:00';
  let displayEnd = settings.schedules[activeDayIdx]?.endTime || '10:00';
  if (activeTab !== 'base' && settings.overrides[activeDateStr]) { displayStart = settings.overrides[activeDateStr].start; displayEnd = settings.overrides[activeDateStr].end; }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white font-sans text-[#1a2b3c] flex flex-col overflow-hidden">
      <style>{`@keyframes bounce-zz { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-15px); opacity: 1; } } .animate-zz { animation: bounce-zz 2.5s infinite ease-in-out; } .no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      
      <header className="px-6 py-4 flex justify-between items-center sticky top-0 bg-white z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#f26522] p-2 rounded-xl shadow-md"><img src="/logo.png" className="w-6 h-6 brightness-0 invert" alt="Barkr" /></div>
          <div><h1 className="text-xl font-black italic tracking-tight leading-none">BARKR</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${settings.vacationMode ? 'bg-[#3b82f6]' : 'bg-[#10b981] animate-pulse'}`} />
              <span className={`text-[10px] font-bold tracking-wider ${settings.vacationMode ? 'text-[#3b82f6]' : 'text-[#10b981]'}`}>{settings.vacationMode ? t('idle', lang) : t('vigilant', lang)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"><Info size={20}/></button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"><Settings size={20}/></button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start pt-8 p-6 gap-8 overflow-y-auto no-scrollbar">
        {/* Status Cirkel met PNG-AFBEELDING */}
        <button onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})} className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center transition-all duration-700 shadow-2xl active:scale-95 ${!settings.vacationMode ? 'bg-[#f26522] border-8 border-orange-400' : 'bg-[#242f3e] border-8 border-slate-700'}`}>
          <div className="flex flex-col items-center gap-2">
             <div className="relative">
                <img src="/logo.png" className={`w-[120px] h-[120px] transition-opacity brightness-0 invert ${settings.vacationMode ? 'opacity-20' : 'opacity-100'}`} alt="Barkr" />
                {settings.vacationMode && <span className="absolute -top-4 -right-4 text-4xl font-black text-blue-400 animate-zz">Zzz</span>}
                {!settings.vacationMode && <Activity size={32} className="absolute -right-8 top-0 text-orange-200 animate-pulse" />}
             </div>
             <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white mt-4">{settings.vacationMode ? t('wake_up', lang) : t('tap_sleep', lang)}</span>
          </div>
        </button>

        {/* Hartslag Kaart */}
        <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0
