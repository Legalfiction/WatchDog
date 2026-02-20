import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Activity, ShieldCheck, Dog, Clock, Info, ChevronDown, Wifi
} from 'lucide-react';

// --- EXTERNE BESTANDEN ---
import { TRANSLATIONS } from './constants/translations';
import { COUNTRIES } from './constants/countries';
import { InfoPage } from './components/InfoPage';

const ENDPOINTS = ['https://barkr.nl', 'http://192.168.1.38:5000'];

const getLocalYYYYMMDD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const t = (key: string, lang: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['nl']?.[key] || key;

const defaultSchedules: any = {};
for(let i=0; i<7; i++) defaultSchedules[i] = {startTime: '06:00', endTime: '10:00'};

export default function App() {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'searching' | 'connected' | 'offline'>('searching');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showWeekPlan, setShowWeekPlan] = useState(false);
  const [lastPing, setLastPing] = useState('09:16');
  
  const now = new Date();
  const todayStr = getLocalYYYYMMDD(now);
  const todayIdx = (now.getDay() + 6) % 7; 
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalYYYYMMDD(tomorrow);
  const tomorrowIdx = (tomorrow.getDay() + 6) % 7;

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
    const parsed = saved ? JSON.parse(saved) : {};
    
    let defaultCountry = 'NL';
    if (parsed.country && COUNTRIES[parsed.country]) defaultCountry = parsed.country;
    else if (parsed.language && COUNTRIES[parsed.language]) defaultCountry = parsed.language;

    return {
      name: parsed.name || '', 
      vacationMode: parsed.vacationMode || false, 
      country: defaultCountry,
      overrides: parsed.overrides || {},
      contacts: parsed.contacts || [], 
      schedules: (parsed.schedules && Object.keys(parsed.schedules).length > 0) ? parsed.schedules : defaultSchedules
    };
  });

  const countryObj = COUNTRIES[settings.country] || COUNTRIES['NL'];
  const lang = countryObj?.lang || 'nl';
  const daysVoluit = countryObj?.days || ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

  // Bepalen actuele weergave tijden
  const isBase = activeTab === 'base';
  const activeDateStr = activeTab === 'today' ? todayStr : tomorrowStr;
  const activeDayIdx = activeTab === 'today' ? todayIdx : tomorrowIdx;
  
  let displayStart = settings.schedules[todayIdx]?.startTime || '06:00';
  let displayEnd = settings.schedules[todayIdx]?.endTime || '10:00';
  
  if (!isBase && settings.overrides[activeDateStr]) {
    displayStart = settings.overrides[activeDateStr].start;
    displayEnd = settings.overrides[activeDateStr].end;
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      const dStr = getLocalYYYYMMDD(d);
      const tStr = d.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});

      setSettings((prev: any) => {
        if (prev.overrides && prev.overrides[dStr] && tStr > prev.overrides[dStr].end) {
          console.log(`[Barkr Log] Override window verstreken voor ${dStr}. Terug naar basis weekplanning.`);
          const newOverrides = { ...prev.overrides };
          delete newOverrides[dStr];
          if (activeTab === 'today') setActiveTab('base');
          return { ...prev, overrides: newOverrides };
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
    if (!activeUrl) return;

    const payload: any = { ...settings };
    payload.app_key = 'BARKR_SECURE_V1';
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
      console.log(`[Barkr Log] Configuratie sync naar backend:`, payload);
      fetch(`${activeUrl}/save_settings`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
      }).catch(err => console.error(`[Barkr Log] Fout bij opslaan configuratie:`, err));
    }, 800);
    return () => clearTimeout(timer);
  }, [settings, activeUrl, todayStr, todayIdx, tomorrowStr, tomorrowIdx]);

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
    const interval = setInterval(findConnection, 5000);
    return () => clearInterval(interval);
  }, [findConnection]);

  useEffect(() => {
    if (status !== 'connected' || !activeUrl || settings.vacationMode) return;
    const sendPing = () => {
      if (document.visibilityState === 'visible') {
        const pingPayload = { 
          name: settings.name, 
          app_key: 'BARKR_SECURE_V1',
          active_window: { start: displayStart, end: displayEnd }
        };
        
        console.log(`[Barkr Log] Ping verstuurd -> Gebruiker: ${settings.name} | Window: ${displayStart} - ${displayEnd}`);
        
        fetch(`${activeUrl}/ping`, { 
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pingPayload)
        }).then(res => {
          if(res.ok) {
            setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
          } else {
             console.log(`[Barkr Log] Backend weigert ping (buiten window of fout): HTTP ${res.status}`);
          }
        }).catch(err => console.error(`[Barkr Log] Ping mislukt:`, err));
      }
    };
    if (document.visibilityState === 'visible') sendPing();
    const pingInterval = setInterval(sendPing, 5000); 
    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') sendPing(); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => { clearInterval(pingInterval); document.removeEventListener('visibilitychange', handleVisibilityChange); };
  }, [status, activeUrl, settings.vacationMode, settings.name, displayStart, displayEnd]);

  const toggleOverride = (type: 'today' | 'tomorrow') => {
    if (activeTab === type) {
      setActiveTab('base');
      const newOverrides = {...settings.overrides};
      const dateStr = type === 'today' ? todayStr : tomorrowStr;
      delete newOverrides[dateStr];
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

  const updateOverrideTime = (field: 'start'|'end', value: string) => {
    let currentTab = activeTab;
    if (currentTab === 'base') {
      currentTab = 'today';
      setActiveTab('today');
    }
    const dateStr = currentTab === 'today' ? todayStr : tomorrowStr;
    const dayIdx = currentTab === 'today' ? todayIdx : tomorrowIdx;
    
    const newOverrides = {...settings.overrides};
    if (!newOverrides[dateStr]) {
      newOverrides[dateStr] = { start: settings.schedules[dayIdx]?.startTime || '06:00', end: settings.schedules[dayIdx]?.endTime || '10:00' };
    }
    newOverrides[dateStr][field] = value;
    setSettings({...settings, overrides: newOverrides});
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col overflow-hidden">
      <style>{`
        @keyframes bounce-zz { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-15px); opacity: 1; } }
        .animate-zz { animation: bounce-zz 2.5s infinite ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-20 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg shadow-sm"><Dog size={20} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-black italic tracking-tighter text-slate-800 uppercase">Barkr</h1>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? (settings.vacationMode ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-red-500'}`} />
              <span className={status === 'connected' ? (settings.vacationMode ? 'text-blue-600' : 'text-emerald-600') : 'text-red-500'}>
                {status === 'offline' ? t('offline', lang) : status === 'searching' ? '...' : settings.vacationMode ? t('idle', lang) : t('vigilant', lang)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><Info size={20} className="text-slate-600"/></button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><Settings size={20} className="text-slate-600"/></button>
        </div>
      </header>

      {!showSettings && !showManual && !showWeekPlan && (
        <main className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
          {/* HOOFD ACTIE KNOP */}
          <div className="flex flex-col items-center pt-2">
            <button 
              onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
              disabled={status !== 'connected'}
              className={`relative w-64 h-64 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl overflow-hidden border-[8px] ${
                status !== 'connected' ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' : 
                settings.vacationMode ? 'bg-slate-900 border-slate-700' : 'bg-orange-600 border-orange-700'
              }`}
            >
              {status !== 'connected' ? <Wifi size={60} className="text-slate-400 animate-pulse"/> : 
               settings.vacationMode ? (
                <div className="flex flex-col items-center justify-center relative w-full h-full">
                  <div className="absolute top-12 right-16 flex font-black text-blue-300 pointer-events-none z-10"><span className="text-3xl animate-zz">Z</span><span className="text-2xl animate-zz ml-1">z</span><span className="text-xl animate-zz ml-1">z</span></div>
                  <img src="/logo.png" alt="Barkr Logo" className="w-full h-full object-cover scale-[1.02] opacity-40 grayscale" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full relative">
                   <img src="/logo.png" alt="Barkr Logo" className="w-full h-full object-cover scale-[1.02] drop-shadow-xl" />
                   <div className="absolute bottom-5 inset-x-0 text-center">
                      <span className="text-[10px] font-black uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] tracking-widest text-center px-4 leading-tight italic">{t('tap_sleep', lang)}</span>
                   </div>
                </div>
              )}
            </button>
            
            {/* HARTSLAG KAART (Minder margin, kleine tijd) */}
            <div className="mt-4 w-full bg-white px-6 py-3 rounded-[20px] border border-slate-100 shadow-sm text-center flex flex-col items-center">
               <div className="flex items-center gap-2 mb-1">
                 <Activity size={14} className="text-slate-400" />
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   {status === 'connected' ? t('heartbeat', lang) : t('last_check', lang)}
                 </p>
               </div>
               <p className="text-sm font-black text-slate-800 tabular-nums tracking-tight">{lastPing}</p>
            </div>
          </div>

          {/* VANDAAG / MORGEN PLANNING (Compactere spacing) */}
          <section className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden transition-all">
            <header className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-orange-600" />
                <h3 className="font-black text-[10px] uppercase tracking-tight text-slate-800">{t('current_planning', lang)}</h3>
              </div>
              <button onClick={() => setShowWeekPlan(true)} className="text-[9px] font-black px-3 py-1.5 rounded-full transition-all bg-slate-800 text-white shadow-sm active:scale-95">
                {t('week_plan', lang).toUpperCase()}
              </button>
            </header>

            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => toggleOverride('today')} 
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${activeTab === 'today' ? 'bg-orange-600 border-orange-700 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                >
                  {t('today', lang)}
                </button>
                <button 
                  onClick={() => toggleOverride('tomorrow')} 
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${activeTab === 'tomorrow' ? 'bg-orange-600 border-orange-700 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                >
                  {t('tomorrow', lang)}
                </button>
              </div>

              <div className={`border rounded-xl p-3 transition-all ${!isBase ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{t('start', lang)}</label>
                    <input type="time" value={displayStart} onChange={e=>updateOverrideTime('start', e.target.value)} className={`w-full border rounded-lg p-2.5 font-black text-center outline-none ${!isBase ? 'bg-white border-orange-200 text-orange-900' : 'bg-white border-slate-200 text-slate-700'}`}/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-red-400 uppercase ml-1">{t('deadline', lang)}</label>
                    <input type="time" value={displayEnd} onChange={e=>updateOverrideTime('end', e.target.value)} className={`w-full border rounded-lg p-2.5 font-black text-center outline-none ${!isBase ? 'bg-white border-orange-200 text-red-600' : 'bg-white border-slate-200 text-red-600'}`}/>
                  </div>
                </div>
                
                <p className={`text-[8px] font-black uppercase tracking-widest text-center mt-3 ${!isBase ? 'text-orange-600' : 'text-slate-400'}`}>
                  {isBase ? t('base_active', lang) : `${t('planning_for', lang)} ${activeTab === 'today' ? t('today', lang) : t('tomorrow', lang)} (${daysVoluit[activeDayIdx]})`}
                </p>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* WEEKPLANNING */}
      {showWeekPlan && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20 no-scrollbar">
          <header className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800">{t('week_plan', lang)}</h2>
            <button onClick={() => setShowWeekPlan(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={24}/></button>
          </header>
          <p className="text-sm font-medium text-slate-600 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm leading-relaxed">
            {t('week_plan_desc', lang)}
          </p>
          <div className="space-y-3">
            {daysVoluit.map((dayName: string, d: number) => (
              <div key={d} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="w-24 text-[11px] font-black text-slate-700 uppercase">{dayName}</span>
                <input type="time" value={settings.schedules[d]?.startTime || '06:00'} onChange={e => setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], startTime:e.target.value}}})} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2 text-xs font-black text-center outline-none"/>
                <input type="time" value={settings.schedules[d]?.endTime || '10:00'} onChange={e => setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], endTime:e.target.value}}})} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2 text-xs font-black text-red-600 text-center outline-none"/>
              </div>
            ))}
          </div>
          <button onClick={() => setShowWeekPlan(false)} className="w-full py-5 bg-orange-600 text-white font-black uppercase rounded-[28px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all">{t('save', lang)}</button>
        </div>
      )}

      {/* EXTERNE INFOPAGE */}
      {showManual && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto no-scrollbar">
          <InfoPage onClose={() => setShowManual(false)} lang={lang} />
        </div>
      )}

      {/* SETUP */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20 no-scrollbar">
          <header className="flex justify-between items-center mb-4"><h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">{t('setup', lang)}</h2><button onClick={() => setShowSettings(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button></header>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">{t('country', lang)}</label>
              <div className="relative">
                <select value={settings.country} onChange={e=>setSettings({...settings, country: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-slate-700 appearance-none outline-none">
                  {Object.keys(COUNTRIES).map(key => (
                    <option key={key} value={key}>{COUNTRIES[key].flag} {COUNTRIES[key].name} ({COUNTRIES[key].prefix})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase">{t('user_name', lang)}</label><input value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700"/></div>
          </div>

          <div><label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block mb-2 px-1">{t('contacts', lang)}</label>
            <button onClick={()=> setSettings({...settings, contacts:[...settings.contacts, {name:'', phone: COUNTRIES[settings.country]?.prefix || ''}]})} className="w-full bg-orange-600 text-white p-3 rounded-xl shadow-md flex justify-center mb-4"><Plus size={20}/></button>
            <div className="space-y-4">{settings.contacts.map((c: any, i: number) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative space-y-4">
                <button onClick={()=> {const n=[...settings.contacts]; n.splice(i,1); setSettings({...settings, contacts:n})}} className="absolute top-4 right-4 text-slate-300"><Trash2 size={18}/></button>
                <div><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">{t('c_name', lang)}</label><input placeholder={t('c_name', lang)} value={c.name} onChange={e=>{const n=[...settings.contacts]; n[i].name=e.target.value; setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none"/></div>
                <div><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">{t('c_phone', lang)}</label><input value={c.phone} onChange={e=>{const n=[...settings.contacts]; n[i].phone=e.target.value; setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-mono text-slate-600 outline-none"/></div>
                <button onClick={() => activeUrl && fetch(`${activeUrl}/test_contact`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(c)})} className="w-full bg-emerald-50 text-emerald-600 text-[10px] font-black py-2 rounded-lg border border-emerald-100 flex items-center justify-center gap-2"><ShieldCheck size={14}/> {t('test', lang)}</button>
              </div>
            ))}</div>
          </div>
          <button onClick={() => setShowSettings(false)} className="w-full py-5 bg-slate-900 text-white font-black uppercase rounded-[28px] tracking-[0.2em] shadow-2xl">{t('save', lang)}</button>
        </div>
      )}
    </div>
  );
}
