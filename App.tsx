import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Info, Dog, Clock, Plus, Trash2, X, Activity, HeartPulse, ChevronDown, Smartphone } from 'lucide-react';
import { COUNTRIES } from './constants/countries';
import { TRANSLATIONS } from './constants/translations';
import { InfoPage } from './components/InfoPage';

const ENDPOINTS = ['https://barkr.nl', 'http://192.168.1.38:5000'];
const APP_KEY = 'BARKR_SECURE_V1';

const getLocalYYYYMMDD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const t = (key: string, lang: string) => (TRANSLATIONS[lang] || TRANSLATIONS['nl'])[key] || key;

export default function App() {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'connected' | 'offline'>('offline');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showWeekPlan, setShowWeekPlan] = useState(false);
  const [lastPing, setLastPing] = useState('23:23');
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const now = new Date();
  const todayStr = getLocalYYYYMMDD(now);
  const todayIdx = (now.getDay() + 6) % 7;
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalYYYYMMDD(tomorrow);
  const tomorrowIdx = (tomorrow.getDay() + 6) % 7;

  const [activeTab, setActiveTab] = useState<'base' | 'today' | 'tomorrow'>('base');
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    const p = saved ? JSON.parse(saved) : {};
    return {
      name: p.name || 'Aldo gebruiker', vacationMode: p.vacationMode || false, country: p.country || 'NL',
      overrides: p.overrides || {}, contacts: p.contacts || [{name: 'Aldo user', phone: '+31615964009'}],
      schedules: p.schedules || {0:{startTime:'06:00',endTime:'10:00'},1:{startTime:'06:00',endTime:'10:00'},2:{startTime:'06:00',endTime:'10:00'},3:{startTime:'06:00',endTime:'10:00'},4:{startTime:'06:00',endTime:'10:00'},5:{startTime:'06:00',endTime:'10:00'},6:{startTime:'06:00',endTime:'10:00'}}
    };
  });

  const lang = COUNTRIES[settings.country]?.lang || 'nl';
  const daysVoluit = COUNTRIES[settings.country]?.days || COUNTRIES['NL'].days;

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setDeferredPrompt(e); setShowInstallBtn(true); });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstallBtn(false);
    setDeferredPrompt(null);
  };

  useEffect(() => {
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
    if (activeUrl) {
      fetch(`${activeUrl}/save_settings`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ ...settings, app_key: APP_KEY })
      }).catch(() => {});
    }
  }, [settings, activeUrl]);

  const findConnection = useCallback(async () => {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) { setActiveUrl(url); setStatus('connected'); return; }
      } catch (e) {}
    }
    setStatus('offline');
  }, []);

  useEffect(() => {
    findConnection();
    const i = setInterval(findConnection, 10000);
    return () => clearInterval(i);
  }, [findConnection]);

  useEffect(() => {
    if (status !== 'connected' || !activeUrl || settings.vacationMode) return;
    const sendPing = () => {
        fetch(`${activeUrl}/ping`, { 
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app_key: APP_KEY, name: settings.name })
        }).then(res => {
          if(res.ok) setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
        }).catch(() => {});
    };
    const pingInterval = setInterval(sendPing, 5000); 
    return () => clearInterval(pingInterval);
  }, [status, activeUrl, settings.vacationMode, settings.name]);

  const activeDateStr = activeTab === 'today' ? todayStr : tomorrowStr;
  const activeDayIdx = activeTab === 'today' ? todayIdx : tomorrowIdx;
  let displayStart = settings.schedules[activeDayIdx]?.startTime || '06:00';
  let displayEnd = settings.schedules[activeDayIdx]?.endTime || '10:00';
  if (activeTab !== 'base' && settings.overrides[activeDateStr]) {
    displayStart = settings.overrides[activeDateStr].start;
    displayEnd = settings.overrides[activeDateStr].end;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white font-sans text-[#1a2b3c] flex flex-col overflow-hidden">
      <style>{`@keyframes bounce-zz { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-15px); opacity: 1; } } .animate-zz { animation: bounce-zz 2.5s infinite ease-in-out; } .no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      
      <header className="px-6 py-4 flex justify-between items-center sticky top-0 bg-white z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#f26522] p-2 rounded-xl shadow-md"><Dog size={24} fill="white" className="text-white" /></div>
          <div><h1 className="text-xl font-black italic tracking-tight">BARKR</h1>
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

      <main className="flex-1 flex flex-col items-center justify-start pt-8 p-6 gap-8">
        <button onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
          className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center transition-all duration-700 shadow-2xl active:scale-95 ${!settings.vacationMode ? 'bg-[#f26522] border-8 border-orange-400' : 'bg-[#242f3e] border-8 border-slate-700'}`}>
          <div className="flex flex-col items-center gap-2">
             <div className="relative">
                <Dog size={100} fill="white" className={`text-white transition-opacity ${settings.vacationMode ? 'opacity-20' : 'opacity-100'}`} />
                {settings.vacationMode && <span className="absolute -top-4 -right-4 text-4xl font-black text-blue-400 animate-zz">Zzz</span>}
                {!settings.vacationMode && <Activity size={32} className="absolute -right-8 top-0 text-orange-200 animate-pulse" />}
             </div>
             <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white mt-4">{settings.vacationMode ? t('wake_up', lang) : t('tap_sleep', lang)}</span>
          </div>
        </button>

        <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] border border-slate-50 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400 mb-2 font-bold text-[10px] uppercase tracking-widest"><HeartPulse size={14} /> {t('heartbeat', lang)}</div>
          <div className="text-6xl font-black text-slate-800 tracking-tighter">{lastPing}</div>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <button onClick={() => setShowWeekPlan(true)} className="w-full py-4 rounded-2xl bg-slate-800 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg">
            <Clock size={16}/> {t('week_plan', lang)}
          </button>
          <div className="flex gap-3">
             <button onClick={() => setActiveTab('today')} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'today' ? 'bg-[#f26522] text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>{t('today', lang)}</button>
             <button onClick={() => setActiveTab('tomorrow')} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'tomorrow' ? 'bg-[#f26522] text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>{t('tomorrow', lang)}</button>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-50 grid grid-cols-2 gap-4">
             <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{t('start', lang)}</label><input type="time" value={displayStart} onChange={e => { if(activeTab==='base') return; const o={...settings.overrides}; o[activeDateStr]={...o[activeDateStr],start:e.target.value}; setSettings({...settings, overrides:o}) }} className="w-full bg-slate-50 rounded-xl py-3 px-4 font-black outline-none border-none text-slate-700" /></div>
             <div className="space-y-1"><label className="text-[9px] font-black text-orange-500 uppercase tracking-wider">{t('deadline', lang)}</label><input type="time" value={displayEnd} onChange={e => { if(activeTab==='base') return; const o={...settings.overrides}; o[activeDateStr]={...o[activeDateStr],end:e.target.value}; setSettings({...settings, overrides:o}) }} className="w-full bg-orange-50 rounded-xl py-3 px-4 font-black outline-none border-none text-[#f26522]" /></div>
             <div className="col-span-2 pt-2 border-t border-slate-50 text-center"><span className="text-[10px] font-bold text-slate-400 italic">{activeTab==='base' ? t('base_active', lang) : `${t('planning_for', lang)} ${daysVoluit[activeDayIdx]}`}</span></div>
          </div>
        </div>
      </main>

      {showManual && <InfoPage lang={lang} t={t} onClose={() => setShowManual(false)} />}

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 space-y-6 max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black italic tracking-tighter uppercase">{t('setup', lang)}</h2><button onClick={() => setShowSettings(false)}><X size={24} className="text-slate-300"/></button></div>
            <div className="space-y-5">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">{t('user_name', lang)}</label><input type="text" value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl py-5 px-6 font-black text-slate-700 focus:ring-2 focus:ring-[#f26522]" /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">{t('country', lang)}</label><div className="relative"><select value={settings.country} onChange={e => setSettings({...settings, country: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl py-5 px-6 font-black text-slate-700 appearance-none focus:ring-2 focus:ring-[#f26522]">{Object.keys(COUNTRIES).map(c => <option key={c} value={c}>{COUNTRIES[c].flag} {COUNTRIES[c].name}</option>)}</select><ChevronDown size={20} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" /></div></div>
              <div className="space-y-3">
                 <div className="flex justify-between items-center ml-1"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('contacts', lang)}</label><button onClick={() => setSettings({...settings, contacts: [...settings.contacts, { name: '', phone: COUNTRIES[settings.country].prefix }]})} className="p-2 bg-[#f26522] text-white rounded-xl shadow-md"><Plus size={16}/></button></div>
                 {settings.contacts.map((c: any, i: number) => (
                    <div key={i} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 relative space-y-2">
                       <button onClick={() => { const nc=[...settings.contacts]; nc.splice(i,1); setSettings({...settings, contacts:nc}) }} className="absolute top-4 right-4 text-slate-200 hover:text-red-400"><Trash2 size={16}/></button>
                       <input value={c.name} onChange={e => { const nc=[...settings.contacts]; nc[i].name=e.target.value; setSettings({...settings, contacts:nc}) }} placeholder={t('c_name', lang)} className="w-full bg-transparent font-black text-sm p-0 border-none focus:ring-0 placeholder:text-slate-200" />
                       <input value={c.phone} onChange={e => { const nc=[...settings.contacts]; nc[i].phone=e.target.value; setSettings({...settings, contacts:nc}) }} placeholder={t('c_phone', lang)} className="w-full bg-transparent font-black text-xs text-[#f26522] p-0 border-none focus:ring-0" />
                    </div>
                 ))}
              </div>
            </div>
            {showInstallBtn && <button onClick={handleInstallClick} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 shadow-lg"><Smartphone size={18}/> {t('install_app', lang)}</button>}
            <button onClick={() => setShowSettings(false)} className="w-full bg-slate-800 text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl text-xs">{t('save', lang)}</button>
          </div>
        </div>
      )}

      {showWeekPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 space-y-6 overflow-y-auto no-scrollbar shadow-2xl">
            <div className="flex justify-between items-start"><div className="space-y-1"><h2 className="text-2xl font-black italic tracking-tighter uppercase">{t('week_plan', lang)}</h2><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('week_plan_desc', lang)}</p></div><button onClick={() => setShowWeekPlan(false)} className="bg-slate-100 p-2 rounded-full text-slate-300"><X size={20}/></button></div>
            <div className="space-y-3">
              {daysVoluit.map((d:string, i:number) => (
                <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-black text-slate-600 text-xs uppercase">{d}</span>
                  <div className="flex gap-2 items-center">
                    <input type="time" value={settings.schedules[i].startTime} onChange={e => { const s={...settings.schedules}; s[i].startTime=e.target.value; setSettings({...settings, schedules:s}) }} className="bg-white p-2 rounded-lg font-black text-[10px] shadow-sm border-none" />
                    <span className="text-slate-300 font-black">-</span>
                    <input type="time" value={settings.schedules[i].endTime} onChange={e => { const s={...settings.schedules}; s[i].endTime=e.target.value; setSettings({...settings, schedules:s}) }} className="bg-white p-2 rounded-lg font-black text-[10px] text-[#f26522] shadow-sm border-none" />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowWeekPlan(false)} className="w-full bg-slate-800 text-white py-6 rounded-2xl font-black uppercase shadow-xl text-xs">{t('ok', lang)}</button>
          </div>
        </div>
      )}
    </div>
  );
}
