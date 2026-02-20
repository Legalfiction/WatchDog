import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Activity, ShieldCheck, Dog, Clock, Info, ExternalLink, Mail, AlertTriangle, Wifi, Smartphone, BellRing, HeartPulse, Plane, Briefcase, Home, Mountain, Zap, CalendarDays, ChevronDown
} from 'lucide-react';

const ENDPOINTS = ['https://barkr.nl', 'http://192.168.1.38:5000'];

const getLocalYYYYMMDD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// --- VOLLEDIGE TAAL & DAGEN CONFIGURATIE ---
const LANGUAGES: any = {
  NL: { flag: '🇳🇱', prefix: '+31', name: 'Nederlands', days: ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'] },
  EN: { flag: '🇬🇧', prefix: '+44', name: 'English (UK)', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
  US: { flag: '🇺🇸', prefix: '+1', name: 'English (US)', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
  DE: { flag: '🇩🇪', prefix: '+49', name: 'Deutsch', days: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] },
  FR: { flag: '🇫🇷', prefix: '+33', name: 'Français', days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] },
  BE: { flag: '🇧🇪', prefix: '+32', name: 'België (NL)', days: ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'] },
  ES: { flag: '🇪🇸', prefix: '+34', name: 'Español', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] },
  IT: { flag: '🇮🇹', prefix: '+39', name: 'Italiano', days: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'] },
  PL: { flag: '🇵🇱', prefix: '+48', name: 'Polski', days: ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'] },
  TR: { flag: '🇹🇷', prefix: '+90', name: 'Türkçe', days: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'] }
};

const TRANSLATIONS: any = {
  NL: {
    vigilant: 'Barkr is waakzaam', idle: 'Systeem in rust', offline: 'Geen verbinding', tap_sleep: 'Tik om te slapen', heartbeat: 'Systeem Hartslag', manual: 'Handleiding', setup: 'Barkr Setup', user_name: 'Naam Gebruiker', smart_plan: 'Slimme Planning', start: 'Start', deadline: 'Deadline', contacts: 'Contacten', c_name: 'Naam', c_phone: 'Telefoonnummer', test: 'TEST VERBINDING', save: 'Opslaan', close: 'Sluiten', ok: 'Begrepen', barkr_mean: 'De betekenis van Barkr', barkr_desc: 'Barkr is afgeleid van het Engelse \'Barker\' (blaffer). Het staat voor een trouwe digitale waakhond die over je waakt.', why: 'Waarom deze applicatie?', how: 'Hoe gebruik je Barkr?', ins_title: 'Wanneer gebruik je Barkr?', info_support: 'Informatie & Support', launch_alert: 'Belangrijk: Opstarten', launch_desc: 'In deze fase dient de app handmatig opgestart te worden.', smart_help_t: 'Wat is Slimme Planning?', smart_help_d: 'De slimme planning is leidend. Wil je incidenteel een andere tijd? Selecteer dan "Vandaag" of "Morgen". Na het verstrijken van die dag valt de app automatisch terug op je standaard tijden.', today: 'Vandaag', tomorrow: 'Morgen', smart_plan_base: 'Standaard Planning (Elke Dag)', planning_for: 'Planning voor'
  },
  EN: {
    vigilant: 'Barkr is vigilant', idle: 'System idle', offline: 'No connection', tap_sleep: 'Tap to sleep', heartbeat: 'System Heartbeat', manual: 'Manual', setup: 'Barkr Setup', user_name: 'User Name', smart_plan: 'Smart Planning', start: 'Start', deadline: 'Deadline', contacts: 'Contacts', c_name: 'Name', c_phone: 'Phone Number', test: 'TEST CONNECTION', save: 'Save', close: 'Close', ok: 'Understood', barkr_mean: 'The meaning of Barkr', barkr_desc: 'Barkr represents a loyal digital watchdog.', why: 'Why this application?', how: 'How to use Barkr?', ins_title: 'Inspiration', info_support: 'Support', launch_alert: 'Important: Startup', launch_desc: 'Currently, the app must be started manually.', smart_help_t: 'What is Smart Planning?', smart_help_d: 'Smart planning is the default. Want a temporary different time? Select "Today" or "Tomorrow". It reverts to default after expiration.', today: 'Today', tomorrow: 'Tomorrow', smart_plan_base: 'Default Schedule (Every Day)', planning_for: 'Schedule for'
  },
  DE: { today: 'Heute', tomorrow: 'Morgen', smart_plan_base: 'Standardplan (Jeden Tag)', planning_for: 'Planung für' },
  FR: { today: 'Aujourd\'hui', tomorrow: 'Demain', smart_plan_base: 'Planning par défaut', planning_for: 'Planning pour' },
  ES: { today: 'Hoy', tomorrow: 'Mañana', smart_plan_base: 'Horario estándar', planning_for: 'Horario para' },
  IT: { today: 'Oggi', tomorrow: 'Domani', smart_plan_base: 'Orario predefinito', planning_for: 'Orario per' },
  PL: { today: 'Dziś', tomorrow: 'Jutro', smart_plan_base: 'Domyślny harmonogram', planning_for: 'Harmonogram dla' },
  TR: { today: 'Bugün', tomorrow: 'Yarın', smart_plan_base: 'Varsayılan Program', planning_for: 'Program:' }
};

// Fallback logic
Object.keys(LANGUAGES).forEach(l => { if(!TRANSLATIONS[l]) TRANSLATIONS[l] = {}; Object.assign(TRANSLATIONS[l], { ...TRANSLATIONS.EN, ...TRANSLATIONS[l] }); });
const t = (key: string, lang: string) => (TRANSLATIONS[lang] || TRANSLATIONS['NL'])[key] || key;

export default function App() {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'searching' | 'connected' | 'offline'>('searching');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [lastPing, setLastPing] = useState('--:--');
  const [activeTab, setActiveTab] = useState<'base' | 'today' | 'tomorrow'>('base');
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      name: parsed.name || '', 
      vacationMode: parsed.vacationMode || false, 
      language: parsed.language || 'NL',
      baseStartTime: parsed.baseStartTime || parsed.startTime || '07:00',
      baseEndTime: parsed.baseEndTime || parsed.endTime || '08:30',
      overrides: parsed.overrides || {},
      contacts: parsed.contacts || []
    };
  });

  const lang = settings.language || 'NL';
  const daysVoluit = LANGUAGES[lang].days;

  const now = new Date();
  const todayStr = getLocalYYYYMMDD(now);
  const todayIdx = (now.getDay() + 6) % 7; 
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalYYYYMMDD(tomorrow);
  const tomorrowIdx = (tomorrow.getDay() + 6) % 7;

  // Sync state & cleanup expired overrides
  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      const dStr = getLocalYYYYMMDD(d);
      const tStr = d.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});

      setSettings(prev => {
        if (prev.overrides && prev.overrides[dStr] && tStr > prev.overrides[dStr].end) {
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

  // Construct backend payload dynamically
  useEffect(() => {
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
    if (!activeUrl) return;

    const payload: any = { ...settings };
    payload.useCustomSchedule = true;
    payload.schedules = {};
    payload.activeDays = [0,1,2,3,4,5,6]; // Altijd actief in backend

    // Basis tijden vullen voor alle 7 dagen
    for(let i=0; i<7; i++) {
        payload.schedules[i] = { startTime: settings.baseStartTime, endTime: settings.baseEndTime };
    }
    // Specifieke overschrijvingen injecteren voor Vandaag/Morgen
    if (settings.overrides[todayStr]) {
        payload.schedules[todayIdx] = { startTime: settings.overrides[todayStr].start, endTime: settings.overrides[todayStr].end };
    }
    if (settings.overrides[tomorrowStr]) {
        payload.schedules[tomorrowIdx] = { startTime: settings.overrides[tomorrowStr].start, endTime: settings.overrides[tomorrowStr].end };
    }

    const timer = setTimeout(() => {
      fetch(`${activeUrl}/save_settings`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
      }).catch(() => {});
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
        fetch(`${activeUrl}/ping`, { 
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: settings.name, secret: 'BARKR_SECURE_V1' })
        }).then(res => {
          if(res.ok) setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
        }).catch(() => {});
      }
    };
    if (document.visibilityState === 'visible') sendPing();
    const pingInterval = setInterval(sendPing, 5000); 
    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') sendPing(); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => { clearInterval(pingInterval); document.removeEventListener('visibilitychange', handleVisibilityChange); };
  }, [status, activeUrl, settings.vacationMode, settings.name]);

  const toggleOverride = (type: 'today' | 'tomorrow') => {
    if (activeTab === type) {
      setActiveTab('base');
    } else {
      setActiveTab(type);
      const targetStr = type === 'today' ? todayStr : tomorrowStr;
      if (!settings.overrides[targetStr]) {
        setSettings({...settings, overrides: {...settings.overrides, [targetStr]: {start: settings.baseStartTime, end: settings.baseEndTime}}});
      }
    }
  };

  const updateTime = (field: 'start'|'end', value: string) => {
    if (activeTab === 'base') {
      setSettings({...settings, [field === 'start' ? 'baseStartTime' : 'baseEndTime']: value});
    } else {
      const activeStr = activeTab === 'today' ? todayStr : tomorrowStr;
      const newOverrides = {...settings.overrides};
      if (!newOverrides[activeStr]) newOverrides[activeStr] = { start: settings.baseStartTime, end: settings.baseEndTime };
      newOverrides[activeStr][field] = value;
      setSettings({...settings, overrides: newOverrides});
    }
  };

  const activeDateStr = activeTab === 'today' ? todayStr : (activeTab === 'tomorrow' ? tomorrowStr : null);
  const displayStart = activeTab === 'base' ? settings.baseStartTime : settings.overrides[activeDateStr!]?.start || settings.baseStartTime;
  const displayEnd = activeTab === 'base' ? settings.baseEndTime : settings.overrides[activeDateStr!]?.end || settings.baseEndTime;

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

      {!showSettings && !showManual && (
        <main className="flex-1 p-6 space-y-8 overflow-y-auto">
          {/* HOOFD ACTIE KNOP (HERSTELD NAAR W-72) */}
          <div className="flex flex-col items-center pt-8">
            <button 
              onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
              disabled={status !== 'connected'}
              className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl overflow-hidden border-[10px] ${
                status !== 'connected' ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' : 
                settings.vacationMode ? 'bg-slate-900 border-slate-700' : 'bg-orange-600 border-orange-700'
              }`}
            >
              {status !== 'connected' ? <Wifi size={80} className="text-slate-400 animate-pulse"/> : 
               settings.vacationMode ? (
                <div className="flex flex-col items-center justify-center relative w-full h-full">
                  <div className="absolute top-16 right-20 flex font-black text-blue-300 pointer-events-none z-10"><span className="text-3xl animate-zz">Z</span><span className="text-2xl animate-zz ml-1">z</span><span className="text-xl animate-zz ml-1">z</span></div>
                  <img src="/logo.png" alt="Barkr Logo" className="w-full h-full object-cover scale-[1.02] opacity-40 grayscale" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full relative">
                   <img src="/logo.png" alt="Barkr Logo" className="w-full h-full object-cover scale-[1.02] drop-shadow-xl" />
                   <div className="absolute bottom-6 inset-x-0 text-center">
                      <span className="text-[11px] font-black uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] tracking-widest text-center px-4 leading-tight italic">{t('tap_sleep', lang)}</span>
                   </div>
                </div>
              )}
            </button>
            <div className="mt-8 bg-white px-8 py-3 rounded-2xl border border-slate-100 shadow-sm text-center">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('heartbeat', lang)}</p>
               <p className="text-3xl font-black text-slate-800 tabular-nums">{lastPing}</p>
            </div>
          </div>

          {/* NIEUWE SLIMME PLANNING LOGICA OP HOOFDSCHERM */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all">
            <header className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <CalendarDays size={16} className="text-orange-600" />
              <h3 className="font-black text-xs uppercase tracking-tight text-slate-800">{t('smart_plan', lang)}</h3>
            </header>

            <div className="p-5 space-y-5">
              
              {/* VANDAAG / MORGEN OVERRIDE KNOPPEN */}
              <div className="flex gap-3">
                <button 
                  onClick={() => toggleOverride('today')} 
                  className={`flex-1 py-2.5 rounded-xl text-sm font-normal transition-all border ${activeTab === 'today' ? 'bg-orange-600 border-orange-700 text-white shadow-md' : (settings.overrides[todayStr] ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-slate-50 border-slate-200 text-slate-600')}`}
                >
                  {t('today', lang)}
                </button>
                <button 
                  onClick={() => toggleOverride('tomorrow')} 
                  className={`flex-1 py-2.5 rounded-xl text-sm font-normal transition-all border ${activeTab === 'tomorrow' ? 'bg-orange-600 border-orange-700 text-white shadow-md' : (settings.overrides[tomorrowStr] ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-slate-50 border-slate-200 text-slate-600')}`}
                >
                  {t('tomorrow', lang)}
                </button>
              </div>

              {/* SUBTIELE INDICATOR WELKE PLANNING ACTIEF IS */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-3">
                  {activeTab === 'today' ? `${t('planning_for', lang)} ${t('today', lang).toLowerCase()} (${daysVoluit[todayIdx]})` :
                   activeTab === 'tomorrow' ? `${t('planning_for', lang)} ${t('tomorrow', lang).toLowerCase()} (${daysVoluit[tomorrowIdx]})` :
                   t('smart_plan_base', lang)}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{t('start', lang)}</label>
                    <input type="time" value={displayStart} onChange={e=>updateTime('start', e.target.value)} className={`w-full border rounded-xl p-3 font-black text-center outline-none ${activeTab === 'base' ? 'bg-white border-slate-200 text-slate-700' : 'bg-orange-50 border-orange-200 text-orange-900'}`}/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-red-400 uppercase ml-1">{t('deadline', lang)}</label>
                    <input type="time" value={displayEnd} onChange={e=>updateTime('end', e.target.value)} className={`w-full border rounded-xl p-3 font-black text-center outline-none ${activeTab === 'base' ? 'bg-white border-slate-200 text-red-600' : 'bg-orange-50 border-orange-200 text-red-600'}`}/>
                  </div>
                </div>
              </div>

            </div>
          </section>
        </main>
      )}

      {showManual && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-8 pb-20 no-scrollbar">
          <header className="flex justify-between items-center py-2"><h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-800">{t('manual', lang)}</h2><button onClick={() => setShowManual(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={24}/></button></header>
          <section className="bg-blue-600 p-6 rounded-[32px] text-white shadow-lg space-y-3 relative overflow-hidden"><h4 className="font-black flex items-center gap-2 uppercase text-xs tracking-[0.15em]"><AlertTriangle size={18} className="text-orange-400"/> {t('launch_alert', lang)}</h4><p className="text-sm font-bold">{t('launch_desc', lang)}</p></section>
          
          <section className="bg-orange-50 p-6 rounded-3xl border border-orange-200 space-y-3">
            <h4 className="font-black text-orange-800 flex items-center gap-2 uppercase text-xs tracking-widest"><CalendarDays size={18}/> {t('smart_help_t', lang)}</h4>
            <p className="text-sm text-orange-900 leading-relaxed font-medium">{t('smart_help_d', lang)}</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-2"><Zap size={14}/> {t('ins_title', lang)}</h3>
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex gap-4 items-start">
                  <div className="bg-orange-100 p-3 rounded-2xl text-orange-600">
                    {i===1 && <Plane size={24}/>} {i===2 && <Briefcase size={24}/>} {i===3 && <Home size={24}/>} {i===4 && <Mountain size={24}/>}
                  </div>
                  <div><h5 className="font-black text-slate-800 text-sm uppercase italic tracking-tight">{t(`ins_${i}_t`, lang)}</h5><p className="text-xs text-slate-500 leading-relaxed">{t(`ins_${i}_d`, lang)}</p></div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"><h4 className="font-black text-orange-600 flex items-center gap-2 uppercase text-xs tracking-[0.15em]"><Dog size={20}/> {t('barkr_mean', lang)}</h4><p className="text-sm text-slate-600 leading-relaxed font-medium">{t('barkr_desc', lang)}</p></section>

          <section className="bg-slate-900 p-8 rounded-[40px] text-white space-y-6 shadow-2xl">
            <h4 className="font-black flex items-center gap-2 uppercase text-xs tracking-widest text-orange-400"><ExternalLink size={18}/> {t('info_support', lang)}</h4>
            <div className="space-y-4">
              <a href="https://www.barkr.nl" target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 active:scale-95 transition-all"><div className="bg-orange-600 p-2 rounded-xl"><Wifi size={18} className="text-white"/></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Website</span><span className="font-bold text-sm tracking-tight">www.barkr.nl</span></div></a>
              <a href="mailto:info@barkr.nl" className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 active:scale-95 transition-all"><div className="bg-blue-600 p-2 rounded-xl"><Mail size={18} className="text-white"/></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Email</span><span className="font-bold text-sm tracking-tight">info@barkr.nl</span></div></a>
            </div>
          </section>

          <button onClick={() => setShowManual(false)} className="w-full py-5 bg-orange-600 text-white font-black uppercase rounded-3xl tracking-widest shadow-lg active:scale-95 transition-all">{t('close', lang)}</button>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20 no-scrollbar">
          <header className="flex justify-between items-center mb-4"><h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">{t('setup', lang)}</h2><button onClick={() => setShowSettings(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button></header>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">App Language</label>
              <div className="relative">
                <select value={settings.language} onChange={e=>setSettings({...settings, language: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-slate-700 appearance-none outline-none">
                  {Object.keys(LANGUAGES).map(key => (
                    <option key={key} value={key}>{LANGUAGES[key].flag} {LANGUAGES[key].name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase">{t('user_name', lang)}</label><input value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700"/></div>
          </div>

          <div><label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block mb-2 px-1">{t('contacts', lang)}</label>
            <button onClick={()=> setSettings({...settings, contacts:[...settings.contacts, {name:'', phone: LANGUAGES[lang]?.prefix || ''}]})} className="w-full bg-orange-600 text-white p-3 rounded-xl shadow-md flex justify-center mb-4"><Plus size={20}/></button>
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
