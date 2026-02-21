import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Plus, Trash2, X, Dog, Clock, Info, Wifi, ShieldCheck, ChevronDown
} from 'lucide-react';

import { COUNTRIES } from './constants/countries';
import { t } from './constants/translations';
import InfoPage from './components/InfoPage';
import WeekPlanPage from './components/WeekPlanPage';

const ENDPOINTS = ['https://barkr.nl', 'http://192.168.1.38:5000'];

const COUNTRY_CALLING_CODES = [
  { name: "Afghanistan", code: "+93" }, { name: "Albanië", code: "+355" }, { name: "Algerije", code: "+213" },
  { name: "Amerikaanse Maagdeneilanden", code: "+1340" }, { name: "Andorra", code: "+376" }, { name: "Angola", code: "+244" },
  { name: "Argentinië", code: "+54" }, { name: "Armenië", code: "+374" }, { name: "Aruba", code: "+297" },
  { name: "Australië", code: "+61" }, { name: "Azerbeidzjan", code: "+994" }, { name: "Bahama's", code: "+1242" },
  { name: "Bahrein", code: "+973" }, { name: "Bangladesh", code: "+880" }, { name: "Barbados", code: "+1246" },
  { name: "België", code: "+32" }, { name: "Belize", code: "+501" }, { name: "Bermuda", code: "+1441" },
  { name: "Bolivia", code: "+591" }, { name: "Bosnië en Herzegovina", code: "+387" }, { name: "Brazilië", code: "+55" },
  { name: "Bulgarije", code: "+359" }, { name: "Cambodja", code: "+855" }, { name: "Canada", code: "+1" },
  { name: "Chili", code: "+56" }, { name: "China", code: "+86" }, { name: "Colombia", code: "+57" },
  { name: "Costa Rica", code: "+506" }, { name: "Cuba", code: "+53" }, { name: "Curaçao", code: "+599" },
  { name: "Cyprus", code: "+357" }, { name: "Denemarken", code: "+45" }, { name: "Dominicaanse Republiek", code: "+1809" },
  { name: "Duitsland", code: "+49" }, { name: "Ecuador", code: "+593" }, { name: "Egypte", code: "+20" },
  { name: "El Salvador", code: "+503" }, { name: "Estland", code: "+372" }, { name: "Ethiopië", code: "+251" },
  { name: "Fiji", code: "+679" }, { name: "Filipijnen", code: "+63" }, { name: "Finland", code: "+358" },
  { name: "Frankrijk", code: "+33" }, { name: "Georgië", code: "+995" }, { name: "Ghana", code: "+233" },
  { name: "Griekenland", code: "+30" }, { name: "Guatemala", code: "+502" }, { name: "Honduras", code: "+504" },
  { name: "Hongarije", code: "+36" }, { name: "Hongkong", code: "+852" }, { name: "Ierland", code: "+353" },
  { name: "IJsland", code: "+354" }, { name: "India", code: "+91" }, { name: "Indonesië", code: "+62" },
  { name: "Irak", code: "+964" }, { name: "Iran", code: "+98" }, { name: "Israël", code: "+972" },
  { name: "Italië", code: "+39" }, { name: "Ivoorkust", code: "+225" }, { name: "Jamaica", code: "+1876" },
  { name: "Japan", code: "+81" }, { name: "Jemen", code: "+967" }, { name: "Jordanië", code: "+962" },
  { name: "Kaapverdië", code: "+238" }, { name: "Kameroen", code: "+237" }, { name: "Kenia", code: "+254" },
  { name: "Koeweit", code: "+965" }, { name: "Kroatië", code: "+385" }, { name: "Laos", code: "+856" },
  { name: "Letland", code: "+371" }, { name: "Libanon", code: "+961" }, { name: "Libië", code: "+218" },
  { name: "Liechtenstein", code: "+423" }, { name: "Litouwen", code: "+370" }, { name: "Luxemburg", code: "+352" },
  { name: "Madagaskar", code: "+261" }, { name: "Maleisië", code: "+60" }, { name: "Mali", code: "+223" },
  { name: "Malta", code: "+356" }, { name: "Marokko", code: "+212" }, { name: "Mauritius", code: "+230" },
  { name: "Mexico", code: "+52" }, { name: "Moldavië", code: "+373" }, { name: "Monaco", code: "+377" },
  { name: "Mongolië", code: "+976" }, { name: "Montenegro", code: "+382" }, { name: "Mozambique", code: "+258" },
  { name: "Myanmar", code: "+95" }, { name: "Namibië", code: "+264" }, { name: "Nederland", code: "+31" },
  { name: "Nepal", code: "+977" }, { name: "Nicaragua", code: "+505" }, { name: "Nieuw-Zeeland", code: "+64" },
  { name: "Nigeria", code: "+234" }, { name: "Noord-Macedonië", code: "+389" }, { name: "Noorwegen", code: "+47" },
  { name: "Oekraïne", code: "+380" }, { name: "Oezbekistan", code: "+998" }, { name: "Oman", code: "+968" },
  { name: "Oostenrijk", code: "+43" }, { name: "Pakistan", code: "+92" }, { name: "Panama", code: "+507" },
  { name: "Paraguay", code: "+595" }, { name: "Peru", code: "+51" }, { name: "Polen", code: "+48" },
  { name: "Portugal", code: "+351" }, { name: "Puerto Rico", code: "+1787" }, { name: "Qatar", code: "+974" },
  { name: "Roemenië", code: "+40" }, { name: "Rusland", code: "+7" }, { name: "Rwanda", code: "+250" },
  { name: "Saoedi-Arabië", code: "+966" }, { name: "Senegal", code: "+221" }, { name: "Servië", code: "+381" },
  { name: "Singapore", code: "+65" }, { name: "Slovenië", code: "+386" }, { name: "Slowakije", code: "+421" },
  { name: "Spanje", code: "+34" }, { name: "Sri Lanka", code: "+94" }, { name: "Suriname", code: "+597" },
  { name: "Syrië", code: "+963" }, { name: "Taiwan", code: "+886" }, { name: "Tanzania", code: "+255" },
  { name: "Thailand", code: "+66" }, { name: "Trinidad en Tobago", code: "+1868" }, { name: "Tsjechië", code: "+420" },
  { name: "Tunesië", code: "+216" }, { name: "Turkije", code: "+90" }, { name: "Uruguay", code: "+598" },
  { name: "Venezuela", code: "+58" }, { name: "Verenigd Koninkrijk", code: "+44" },
  { name: "Verenigde Arabische Emiraten", code: "+971" }, { name: "Verenigde Staten", code: "+1" },
  { name: "Vietnam", code: "+84" }, { name: "Wit-Rusland", code: "+375" }, { name: "Zambia", code: "+260" },
  { name: "Zimbabwe", code: "+263" }, { name: "Zuid-Afrika", code: "+27" }, { name: "Zuid-Korea", code: "+82" },
  { name: "Zweden", code: "+46" }, { name: "Zwitserland", code: "+41" }
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
    else if (p.language && COUNTRIES[p.language]) defaultCountry = p.language;

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

  // --- CACHE-KILLER EFFECT ---
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
  }, []);

  // 1. Verwijder verstreken overschrijvingen (Met 12s pauze bij activiteit)
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - interactionTimer.current < 12000) return; 

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
    }, 2000); 
    return () => clearInterval(interval);
  }, []);

  // 2. Bewaak de knoppen
  useEffect(() => {
    if (activeTab === 'today' && !settings.overrides[todayStr]) {
      setActiveTab('base');
    }
    if (activeTab === 'tomorrow' && !settings.overrides[tomorrowStr]) {
      setActiveTab('base');
    }
  }, [settings.overrides, activeTab, todayStr, tomorrowStr]);

  // Synchronisatie met de Raspberry Pi
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
      fetch(`${activeUrl}/save_settings`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(payload) 
      }).catch(() => {});
    }, 800); 
    
    return () => clearTimeout(timer);
  }, [settings, activeUrl, todayStr, todayIdx, tomorrowStr, tomorrowIdx]);

  // Zoek Raspberry Pi verbinding
  useEffect(() => {
    const find = async () => {
      for (const url of ENDPOINTS) { try { const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(1500) }); if (res.ok) { setActiveUrl(url); setStatus('connected'); return; } } catch (e) {} }
      setStatus('offline');
    };
    find(); const i = setInterval(find, 5000); return () => clearInterval(i);
  }, []);

  // Ping mechanisme
  useEffect(() => {
    if (status !== 'connected' || !activeUrl) return;
    const doPing = () => {
      if (document.visibilityState === 'visible' && !settingsRef.current.vacationMode) {
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
    document.addEventListener('visibilitychange', doPing);
    return () => { clearInterval(i); document.removeEventListener('visibilitychange', doPing); };
  }, [status, activeUrl]);

  const toggleOverride = (type: 'today' | 'tomorrow') => {
    interactionTimer.current = Date.now(); 
    const nowTime = new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});

    if (activeTab === type) { 
      setActiveTab('base'); 
      const newOverrides = {...settings.overrides};
      const dateStr = type === 'today' ? todayStr : tomorrowStr;
      delete newOverrides[dateStr];
      setSettings({...settings, overrides: newOverrides});
    } else { 
      const targetStr = type === 'today' ? todayStr : tomorrowStr; 
      const targetIdx = type === 'today' ? todayIdx : tomorrowIdx; 
      const defaultEnd = settings.schedules[targetIdx]?.endTime || '10:00';

      // VOORKOM VERLEDEN: Als je "Vandaag" kiest maar de standaardtijd is al voorbij
      if (type === 'today' && nowTime > defaultEnd) {
        setActiveTab('base');
        return;
      }

      setActiveTab(type); 
      if (!settings.overrides[targetStr]) { 
        setSettings({...settings, overrides: {...settings.overrides, [targetStr]: {start: settings.schedules[targetIdx]?.startTime || '06:00', end: defaultEnd}}}); 
      } 
    }
  };

  const updateOverrideTime = (field: 'start'|'end', val: string) => {
    interactionTimer.current = Date.now(); 
    let currentTab = activeTab;
    if (currentTab === 'base') { currentTab = 'today'; setActiveTab('today'); }

    const dStr = currentTab === 'today' ? todayStr : tomorrowStr; 
    const dIdx = currentTab === 'today' ? todayIdx : tomorrowIdx;
    const newO = {...settings.overrides}; 
    if (!newO[dStr]) newO[dStr] = { start: settings.schedules[dIdx]?.startTime || '06:00', end: settings.schedules[dIdx]?.endTime || '10:00' };
    
    newO[dStr][field] = val; 

    // VOORKOM VERLEDEN: Als de nieuwe eindtijd voor Vandaag in het verleden ligt
    if (currentTab === 'today') {
      const nowTime = new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
      if (nowTime > newO[dStr].end) {
        delete newO[dStr];
        setSettings({...settings, overrides: newO});
        setActiveTab('base');
        return;
      }
    }

    setSettings({...settings, overrides: newO});
  };

  const isBase = activeTab === 'base';
  const activeDateStr = activeTab === 'today' ? todayStr : tomorrowStr;
  const activeDayIdx = activeTab === 'today' ? todayIdx : tomorrowIdx;
  const hasOverride = !!settings.overrides[activeDateStr];
  
  let displayStart = settings.schedules[todayIdx]?.startTime || '06:00';
  let displayEnd = settings.schedules[todayIdx]?.endTime || '10:00';
  if (!isBase && hasOverride) {
    displayStart = settings.overrides[activeDateStr].start;
    displayEnd = settings.overrides[activeDateStr].end;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col overflow-x-hidden">
      <style>{`
        @keyframes bounce-zz { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-15px); opacity: 1; } }
        .animate-zz { animation: bounce-zz 2.5s infinite ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
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
              {status !== 'connected' ? <Wifi size={80} className="text-slate-400 animate-pulse"/> : settings.vacationMode ? <div className="flex flex-col items-center justify-center relative w-full h-full"><div className="absolute top-16 right-20 flex font-black text-blue-300 pointer-events-none z-10"><span className="text-3xl animate-zz">Z</span><span className="text-2xl animate-zz ml-1">z</span><span className="text-xl animate-zz ml-1">z</span></div><img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-[1.02] opacity-40 grayscale" /></div> : <div className="flex flex-col items-center justify-center w-full h-full relative"><img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-[1.02] drop-shadow-xl" /><div className="absolute bottom-6 inset-x-0 text-center"><span className="text-[11px] font-black uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] tracking-widest text-center px-4 leading-tight italic">{t('tap_sleep', lang)}</span></div></div>}
            </button>
            <div className="mt-5 bg-white px-8 py-3 rounded-2xl border border-slate-100 shadow-sm text-center"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('heartbeat', lang)}</p><p className="text-3xl font-black text-slate-800 tabular-nums">{lastPing}</p></div>
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
            <div className="relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Taal / Language</label>
              <div className="relative">
                <select value={settings.country} onChange={e=>setSettings({...settings, country: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-slate-700 appearance-none outline-none">
                  {Object.keys(COUNTRIES).map(k => (
                    <option key={k} value={k}>
                      {COUNTRIES[k].flag} {LANG_NAMES[COUNTRIES[k].lang] || COUNTRIES[k].name} ({COUNTRIES[k].name})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase">{t('user_name', lang)}</label><input value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700"/></div>
          </div>
          <div><label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block mb-2 px-1">{t('contacts', lang)}</label>
            <button onClick={()=> setSettings({...settings, contacts:[...settings.contacts, {name:'', phoneCode: COUNTRIES[settings.country]?.prefix || '+31', phoneNumber: '', phone: COUNTRIES[settings.country]?.prefix || '+31'}]})} className="w-full bg-orange-600 text-white p-3 rounded-xl shadow-md flex justify-center mb-4"><Plus size={20}/></button>
            <div className="space-y-4">
              {settings.contacts.map((c: any, i: number) => {
                let code = c.phoneCode; let num = c.phoneNumber;
                if (code === undefined || num === undefined) {
                  if (c.phone) {
                    const cleanPhone = c.phone.replace(/\s+/g, '');
                    const sortedCodes = [...COUNTRY_CALLING_CODES].map(x => x.code).sort((a,b) => b.length - a.length);
                    const foundCode = sortedCodes.find(cc => cleanPhone.startsWith(cc));
                    if (foundCode) { code = foundCode; num = cleanPhone.substring(foundCode.length); if (num.startsWith('0')) num = num.substring(1); } 
                    else { code = COUNTRIES[settings.country]?.prefix || '+31'; num = cleanPhone; }
                  } else { code = COUNTRIES[settings.country]?.prefix || '+31'; num = ''; }
                }
                return (
                  <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative space-y-4">
                    <button onClick={()=> {const n=[...settings.contacts]; n.splice(i,1); setSettings({...settings, contacts:n})}} className="absolute top-4 right-4 text-slate-300"><Trash2 size={18}/></button>
                    <div><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">{t('c_name', lang)}</label><input placeholder={t('c_name', lang)} value={c.name} onChange={e=>{const n=[...settings.contacts]; n[i].name=e.target.value; setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none"/></div>
                    <div><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">{t('c_phone', lang)}</label><div className="flex gap-2 relative"><div className="relative w-2/5">
                          <select value={code} onChange={e => { const n = [...settings.contacts]; n[i].phoneCode = e.target.value; n[i].phoneNumber = num; n[i].phone = e.target.value + num; setSettings({...settings, contacts: n}); }} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-semibold text-slate-700 outline-none appearance-none" >
                            {COUNTRY_CALLING_CODES.map(c => <option key={c.name+c.code} value={c.code}>{c.name} ({c.code})</option>)}
                          </select><ChevronDown className="absolute right-2 top-3.5 text-slate-400 pointer-events-none" size={14} /></div>
                        <input placeholder="612345678" value={num} onChange={e => { let inputVal = e.target.value; if (inputVal.startsWith('0')) inputVal = inputVal.substring(1); const n = [...settings.contacts]; n[i].phoneCode = code; n[i].phoneNumber = inputVal; n[i].phone = code + inputVal; setSettings({...settings, contacts: n}); }} className="w-3/5 bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-mono text-slate-600 outline-none"/>
                      </div></div>
                    <button onClick={() => activeUrl && fetch(`${activeUrl}/test_contact`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(c)})} className="w-full bg-emerald-50 text-emerald-600 text-[10px] font-black py-2 rounded-lg border border-emerald-100 flex items-center justify-center gap-2"><ShieldCheck size={14}/> {t('test', lang)}</button>
                  </div>
                )
              })}
            </div>
          </div>
          <button onClick={() => setShowSettings(false)} className="w-full py-5 bg-slate-900 text-white font-black uppercase rounded-[28px] tracking-[0.2em] shadow-2xl">{t('save', lang)}</button>
        </div>
      )}
    </div>
  );
}
