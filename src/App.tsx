import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Plus, Trash2, X, Dog, Clock, Info, Wifi, ShieldCheck, ChevronDown, UserCheck, UserX
} from 'lucide-react';

import { COUNTRIES } from './constants/countries';
import { t } from './constants/translations';
import InfoPage from './components/InfoPage';
import WeekPlanPage from './components/WeekPlanPage';

const ENDPOINTS = ['https://barkr.nl', 'http://192.168.1.38:5000'];

const COUNTRY_CALLING_CODES = [
  { name: "Nederland", code: "+31" }, { name: "België", code: "+32" }, { name: "Duitsland", code: "+49" },
  { name: "Frankrijk", code: "+33" }, { name: "Spanje", code: "+34" }, { name: "Verenigd Koninkrijk", code: "+44" }
].sort((a, b) => a.name.localeCompare(b.name));

const LANG_NAMES: any = {
  nl: "Nederlands", en: "English", de: "Deutsch", fr: "Français", 
  es: "Español", it: "Italiano", pl: "Polski", tr: "Türkçe"
};

const getLocalYYYYMMDD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const defaultSchedules: any = {};
for(let i=0; i<7; i++) defaultSchedules[i] = {startTime: '06:00', endTime: '10:00'};

export default function App() {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'searching' | 'connected' | 'offline'>('searching');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showWeekPlan, setShowWeekPlan] = useState(false);
  const [lastPing, setLastPing] = useState('--:--');
  
  const interactionTimer = useRef<number>(0); 
  
  const now = new Date();
  const todayStr = getLocalYYYYMMDD(now);
  const todayIdx = (now.getDay() + 6) % 7; 
  const tomorrowStr = getLocalYYYYMMDD(new Date(now.getTime() + 86400000));
  const tomorrowIdx = (todayIdx + 1) % 7;

  const [activeTab, setActiveTab] = useState<'base' | 'today' | 'tomorrow'>(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.overrides && parsed.overrides[todayStr]) return 'today';
      if (parsed.overrides && parsed.overrides[tomorrowStr]) return 'tomorrow';
    }
    return 'base';
  });
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    const p = saved ? JSON.parse(saved) : {};
    let defaultCountry = 'NL';
    if (p.country && COUNTRIES[p.country]) defaultCountry = p.country;

    return { 
      name: p.name || '', 
      vacationMode: p.vacationMode || false, 
      country: defaultCountry, 
      overrides: p.overrides || {}, 
      contacts: p.contacts || [], 
      schedules: (p.schedules && Object.keys(p.schedules).length > 0) ? p.schedules : defaultSchedules 
    };
  });

  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const countryObj = COUNTRIES[settings.country] || COUNTRIES['NL'];
  const lang = countryObj.lang;
  const daysVoluit = countryObj.days;

  const getBottomStatus = () => {
    if (activeTab === 'base') return t('base_active', lang);
    const dayName = activeTab === 'today' ? daysVoluit[todayIdx] : daysVoluit[tomorrowIdx];
    return `${t('planning_for', lang)} ${activeTab === 'today' ? t('today', lang).toLowerCase() : t('tomorrow', lang).toLowerCase()} (${dayName})`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      const dStr = getLocalYYYYMMDD(d);
      const tStr = d.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});

      setSettings((prev: any) => {
        if (prev.overrides && prev.overrides[dStr] && tStr > prev.overrides[dStr].end) {
          const newOverrides = { ...prev.overrides };
          delete newOverrides[dStr];
          return { ...prev, overrides: newOverrides };
        }
        return prev;
      });
    }, 5000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
    if (!activeUrl) return;
    
    const payload: any = { ...settings };
    payload.useCustomSchedule = true;
    payload.activeDays = [0,1,2,3,4,5,6];
    payload.schedules = JSON.parse(JSON.stringify(settings.schedules)); 

    if (settings.overrides[todayStr]) {
        payload.schedules[todayIdx] = { startTime: settings.overrides[todayStr].start, endTime: settings.overrides[todayStr].end };
    }
    if (settings.overrides[tomorrowStr]) {
        payload.schedules[tomorrowIdx] = { startTime: settings.overrides[tomorrowStr].start, endTime: settings.overrides[tomorrowStr].end };
    }

    const timer = setTimeout(() => {
      fetch(`${activeUrl}/save_settings`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) }).catch(() => {});
    }, 1500); 
    return () => clearTimeout(timer);
  }, [settings, activeUrl, todayStr, todayIdx, tomorrowStr, tomorrowIdx]);

  useEffect(() => {
    const find = async () => {
      for (const url of ENDPOINTS) { try { const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(1500) }); if (res.ok) { setActiveUrl(url); setStatus('connected'); return; } } catch (e) {} }
      setStatus('offline');
    };
    find(); const i = setInterval(find, 5000); return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (status !== 'connected' || !activeUrl) return;
    const doPing = () => {
      if (!settingsRef.current.vacationMode) {
        fetch(`${activeUrl}/ping`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ name: settingsRef.current.name, secret: 'BARKR_SECURE_V1' }) 
        })
        .then(res => { if(res.ok) setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})); });
      }
    };
    doPing();
    const i = setInterval(doPing, 5000); 
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') doPing(); });
    return () => { clearInterval(i); };
  }, [status, activeUrl]);

  const toggleOverride = (type: 'today' | 'tomorrow') => {
    if (activeTab === type) { 
      setActiveTab('base'); 
      const newOverrides = {...settings.overrides};
      delete newOverrides[type === 'today' ? todayStr : tomorrowStr];
      setSettings({...settings, overrides: newOverrides});
    } else { 
      setActiveTab(type); 
      const targetStr = type === 'today' ? todayStr : tomorrowStr; 
      const targetIdx = type === 'today' ? todayIdx : tomorrowIdx; 
      if (!settings.overrides[targetStr]) { 
        setSettings({...settings, overrides: {...settings.overrides, [targetStr]: {start: settings.schedules[targetIdx]?.startTime || '06:00', end: settings.schedules[targetIdx]?.endTime || '10:00'}}}); 
      } 
    }
  };

  const updateOverrideTime = (field: 'start'|'end', val: string) => {
    let currentTab = activeTab === 'base' ? 'today' : activeTab;
    if (activeTab === 'base') setActiveTab('today');
    const dStr = currentTab === 'today' ? todayStr : tomorrowStr; 
    const dIdx = currentTab === 'today' ? todayIdx : tomorrowIdx;
    const newO = {...settings.overrides}; 
    if (!newO[dStr]) newO[dStr] = { start: settings.schedules[dIdx]?.startTime || '06:00', end: settings.schedules[dIdx]?.endTime || '10:00' };
    newO[dStr][field] = val; 
    setSettings({...settings, overrides: newO});
  };

  const isBase = activeTab === 'base';
  const activeDateStr = activeTab === 'today' ? todayStr : tomorrowStr;
  const activeDayIdx = activeTab === 'today' ? todayIdx : tomorrowIdx;
  const displayStart = (!isBase && settings.overrides[activeDateStr]) ? settings.overrides[activeDateStr].start : settings.schedules[activeDayIdx].startTime;
  const displayEnd = (!isBase && settings.overrides[activeDateStr]) ? settings.overrides[activeDateStr].end : settings.schedules[activeDayIdx].endTime;

  const isUserSet = settings.name && settings.name.trim().length > 0 && settings.contacts && settings.contacts.length > 0;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col overflow-x-hidden">
      <style>{`
        @keyframes bounce-zz { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-15px); opacity: 1; } }
        .animate-zz { animation: bounce-zz 2.5s infinite ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes gentle-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .animate-gentle-bounce { animation: gentle-bounce 3s infinite ease-in-out; }
        @keyframes alert-pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 70% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(239,68,68,0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0); } }
        .animate-alert-pulse { animation: alert-pulse 2s infinite; }
      `}</style>

      <header className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg shadow-sm"><Dog size={20} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-slate-800 uppercase leading-none">Digitale Waakhond</h1>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase mt-1">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? (settings.vacationMode ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-red-500'}`} />
              <span>{status === 'offline' ? t('offline', lang) : settings.vacationMode ? t('idle', lang) : t('vigilant', lang)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><Info size={20} className="text-slate-600"/></button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><Settings size={20} className="text-slate-600"/></button>
        </div>
      </header>

      {!showSettings && !showManual && !showWeekPlan && (
        <main className="flex-1 p-4 space-y-6 overflow-y-auto">
          <div className="flex flex-col items-center pt-4">
            <button onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})} disabled={status !== 'connected'} className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl overflow-hidden border-[10px] ${status !== 'connected' ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' : settings.vacationMode ? 'bg-slate-900 border-slate-700' : 'bg-orange-600 border-orange-700'}`}>
              {status !== 'connected' ? <Wifi size={80} className="text-slate-400 animate-pulse"/> : settings.vacationMode ? (
                <div className="flex flex-col items-center justify-center relative w-full h-full">
                  <div className="absolute top-16 right-20 flex font-black text-blue-300 pointer-events-none z-10"><span className="text-3xl animate-zz">Z</span><span className="text-2xl animate-zz ml-1">z</span><span className="text-xl animate-zz ml-1">z</span></div>
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-[1.02] opacity-40 grayscale" />
                  <div className="absolute bottom-6 inset-x-0 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-widest text-center px-4 leading-tight italic">
                      De mand roept! Geen gewaak of geblaf: ik slaap nu.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full relative">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-[1.02] drop-shadow-xl" />
                  <div className="absolute bottom-6 inset-x-0 text-center">
                    <span className="text-[11px] font-black uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] tracking-widest text-center px-4 leading-tight italic">Tik voor slaapstand</span>
                  </div>
                </div>
              )}
            </button>
            
            <div onClick={() => { if (!isUserSet) setShowSettings(true); }} className={`mt-8 w-full px-6 py-4 rounded-2xl border shadow-sm flex items-center justify-center gap-4 transition-all duration-500 ${isUserSet ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-200 cursor-pointer hover:bg-red-100/50 active:scale-[0.98]'}`}>
              <div className={`p-3 rounded-full ${isUserSet ? 'bg-emerald-100 text-emerald-600 animate-gentle-bounce' : 'bg-red-100 text-red-600 animate-alert-pulse'}`}>{isUserSet ? <UserCheck size={24} /> : <UserX size={24} />}</div>
              <div className="text-left"><p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isUserSet ? 'text-emerald-500' : 'text-red-500'}`}>Contactpersoon</p><p className={`text-sm font-black ${isUserSet ? 'text-emerald-700' : 'text-red-700'}`}>{isUserSet ? "Baasje is gekoppeld" : "Waar is het baasje?"}</p></div>
            </div>
          </div>

          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all">
            <header className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center"><div className="flex items-center gap-2"><Clock size={16} className="text-orange-600" /><h3 className="font-black text-xs uppercase tracking-tight text-slate-800">{t('smart_plan', lang)}</h3></div><button onClick={() => setShowWeekPlan(true)} className="text-[9px] font-black px-3 py-1.5 rounded-full transition-all bg-slate-800 text-white shadow-sm active:scale-95">{t('open_week_plan', lang).toUpperCase()}</button></header>
            <div className="p-4 space-y-4">
              <div className="flex gap-3"><button onClick={() => toggleOverride('today')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${activeTab === 'today' ? 'bg-orange-600 border-orange-700 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>{t('today', lang)}</button><button onClick={() => toggleOverride('tomorrow')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${activeTab === 'tomorrow' ? 'bg-orange-600 border-orange-700 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>{t('tomorrow', lang)}</button></div>
              <div className={`border rounded-2xl p-4 transition-all ${!isBase ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
                <div className="grid grid-cols-2 gap-4"><div><label className="text-[9px] font-black text-slate-400 uppercase ml-1">{t('start', lang)}</label><input type="time" value={displayStart} onChange={e=>updateOverrideTime('start', e.target.value)} className={`w-full border rounded-xl p-3 font-black text-center outline-none ${!isBase ? 'bg-white border-orange-200 text-orange-900' : 'bg-white border-slate-200 text-slate-700'}`}/></div><div><label className="text-[9px] font-black text-red-400 uppercase ml-1">{t('deadline', lang)}</label><input type="time" value={displayEnd} onChange={e=>updateOverrideTime('end', e.target.value)} className={`w-full border rounded-xl p-3 font-black text-center outline-none ${!isBase ? 'bg-white border-orange-200 text-red-600' : 'bg-white border-slate-200 text-red-600'}`}/></div></div>
                <p className={`text-[9px] font-black uppercase tracking-widest text-center mt-4 ${!isBase ? 'text-orange-600' : 'text-slate-400'}`}>{getBottomStatus()}</p>
              </div>
            </div>
          </section>
        </main>
      )}

      {showWeekPlan && <WeekPlanPage onClose={() => setShowWeekPlan(false)} settings={settings} setSettings={setSettings} lang={lang} daysVoluit={daysVoluit} t={t} />}
      {showManual && <InfoPage onClose={() => setShowManual(false)} lang={lang} t={t} />}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20 no-scrollbar"><header className="flex justify-between items-center mb-4"><h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">{t('setup', lang)}</h2><button onClick={() => setShowSettings(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button></header>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="relative"><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Taal</label><div className="relative"><select value={settings.country} onChange={e=>setSettings({...settings, country: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-slate-700 appearance-none outline-none">{Object.keys(COUNTRIES).map(k => (<option key={k} value={k}>{COUNTRIES[k].flag} {COUNTRIES[k].name}</option>))}</select><ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={18} /></div></div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase">{t('user_name', lang)}</label><input value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700"/></div>
          </div>
          <button onClick={() => setShowSettings(false)} className="w-full py-5 bg-slate-900 text-white font-black uppercase rounded-[28px] tracking-[0.2em] shadow-2xl">{t('save', lang)}</button>
        </div>
      )}
    </div>
  );
}
