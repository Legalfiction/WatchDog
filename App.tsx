import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Activity, ShieldCheck, Dog, Clock, Info, ExternalLink, Mail, 
  Smartphone, Plane, Briefcase, Home, Wifi, ChevronDown 
} from 'lucide-react';

const ENDPOINTS = ['https://barkr.nl', 'http://192.168.1.38:5000'];
const APP_KEY = 'BARKR_SECURE_V1';

const getLocalYYYYMMDD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// --- VOLLEDIGE LANDEN CONFIGURATIE ---
const COUNTRIES: any = {
  NL: { flag: '🇳🇱', prefix: '+31', name: 'Nederland', lang: 'nl', days: ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'] },
  BE: { flag: '🇧🇪', prefix: '+32', name: 'België', lang: 'nl', days: ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'] },
  UK: { flag: '🇬🇧', prefix: '+44', name: 'United Kingdom', lang: 'en', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
  US: { flag: '🇺🇸', prefix: '+1', name: 'United States', lang: 'en', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
  DE: { flag: '🇩🇪', prefix: '+49', name: 'Deutschland', lang: 'de', days: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] },
  FR: { flag: '🇫🇷', prefix: '+33', name: 'France', lang: 'fr', days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] },
  ES: { flag: '🇪🇸', prefix: '+34', name: 'España', lang: 'es', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] },
  IT: { flag: '🇮🇹', prefix: '+39', name: 'Italia', lang: 'it', days: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'] },
  PL: { flag: '🇵🇱', prefix: '+48', name: 'Polska', lang: 'pl', days: ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'] },
  TR: { flag: '🇹🇷', prefix: '+90', name: 'Türkiye', lang: 'tr', days: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'] }
};

// --- VERTAAL-ENGINE ---
const TRANSLATIONS: any = {
  nl: {
    vigilant: 'Barkr is waakzaam', idle: 'Systeem in rust', offline: 'Geen verbinding', tap_sleep: 'Tik om te slapen', heartbeat: 'Systeem Hartslag', manual: 'Handleiding', setup: 'Barkr Setup', user_name: 'Naam Gebruiker', smart_plan: 'Actuele Planning', start: 'Start', deadline: 'Deadline', contacts: 'Contacten', c_name: 'Naam', c_phone: 'Telefoonnummer', save: 'Opslaan', close: 'Sluiten', ok: 'Begrepen', barkr_mean: 'De betekenis van Barkr', barkr_desc: 'Barkr is afgeleid van het Engelse \'Barker\' (blaffer). Het staat voor een trouwe digitale waakhond.', why: 'Waarom deze applicatie?', why_desc1: 'Welzijnsbewaking voor alleenwonenden.', why_desc2: 'Escalatie via WhatsApp bij inactiviteit.', how: 'Hoe gebruik je Barkr?', ins_title: 'Wanneer gebruik je Barkr?', ins_1_t: 'Vroege Reiziger', ins_2_t: 'Werk & Afspraak', ins_3_t: 'Alleenwonenden', info_support: 'Support', today: 'Vandaag', tomorrow: 'Morgen', week_plan: 'Weekplanning', base_active: 'Weekplanning actief', planning_for: 'Planning voor', country: 'Land', install_app: 'Installeer op Startscherm', launch_alert: 'Belangrijk', launch_desc: 'App handmatig opstarten, mag daarna op achtergrond.'
  },
  en: {
    vigilant: 'Barkr is vigilant', idle: 'System idle', offline: 'Offline', tap_sleep: 'Tap to sleep', heartbeat: 'Heartbeat', manual: 'Manual', setup: 'Barkr Setup', user_name: 'User Name', smart_plan: 'Current Plan', start: 'Start', deadline: 'Deadline', contacts: 'Contacts', save: 'Save', close: 'Close', ok: 'OK', install_app: 'Install on Home Screen', today: 'Today', tomorrow: 'Tomorrow', week_plan: 'Weekly Plan', base_active: 'Weekly schedule active', country: 'Country'
  }
};

// Fallback logic
Object.keys(TRANSLATIONS).forEach(l => { if (l !== 'en') Object.assign(TRANSLATIONS[l], { ...TRANSLATIONS['en'], ...TRANSLATIONS[l] }); });
const t = (key: string, lang: string) => (TRANSLATIONS[lang] || TRANSLATIONS['nl'])[key] || key;

const defaultSchedules: any = {};
for(let i=0; i<7; i++) defaultSchedules[i] = {startTime: '06:00', endTime: '10:00'};

export default function App() {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'searching' | 'connected' | 'offline'>('searching');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showWeekPlan, setShowWeekPlan] = useState(false);
  const [lastPing, setLastPing] = useState('--:--');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  
  const now = new Date();
  const todayStr = getLocalYYYYMMDD(now);
  const todayIdx = (now.getDay() + 6) % 7; 
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalYYYYMMDD(tomorrow);
  const tomorrowIdx = (tomorrow.getDay() + 6) % 7;

  const [activeTab, setActiveTab] = useState<'base' | 'today' | 'tomorrow'>('base');
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      name: parsed.name || '', 
      vacationMode: parsed.vacationMode || false, 
      country: parsed.country || 'NL',
      overrides: parsed.overrides || {},
      contacts: parsed.contacts || [], 
      schedules: (parsed.schedules && Object.keys(parsed.schedules).length > 0) ? parsed.schedules : defaultSchedules
    };
  });

  const countryObj = COUNTRIES[settings.country] || COUNTRIES['NL'];
  const lang = countryObj.lang;
  const daysVoluit = countryObj.days;

  // PWA Prompt
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstallBtn(false);
    setDeferredPrompt(null);
  };

  // Sync to Backend
  useEffect(() => {
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
    if (!activeUrl) return;

    const payload = { 
        ...settings, 
        app_key: APP_KEY, 
        useCustomSchedule: true,
        activeDays: [0,1,2,3,4,5,6] 
    };

    fetch(`${activeUrl}/save_settings`, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
    }).catch(() => {});
  }, [settings, activeUrl]);

  // Find Server
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
    const interval = setInterval(findConnection, 10000);
    return () => clearInterval(interval);
  }, [findConnection]);

  // Heartbeat
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

  const isBase = activeTab === 'base';
  const activeDateStr = activeTab === 'today' ? todayStr : tomorrowStr;
  const activeDayIdx = activeTab === 'today' ? todayIdx : tomorrowIdx;
  
  let displayStart = settings.schedules[activeDayIdx]?.startTime || '06:00';
  let displayEnd = settings.schedules[activeDayIdx]?.endTime || '10:00';
  
  if (!isBase && settings.overrides[activeDateStr]) {
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
            <h1 className="text-xl font-black tracking-tight italic text-slate-800 leading-none">BARKR</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${status === 'connected' ? (settings.vacationMode ? 'bg-blue-500' : 'bg-green-500 animate-pulse') : 'bg-red-500'}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {status === 'connected' ? (settings.vacationMode ? t('idle', lang) : t('vigilant', lang)) : t('offline', lang)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="p-2.5 rounded-xl bg-slate-50 text-slate-600"><Info size={20} /></button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-xl bg-slate-50 text-slate-600"><Settings size={20} /></button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8 relative">
        <button 
          onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
          className={`relative w-64 h-64 rounded-full border-8 transition-all duration-700 flex flex-col items-center justify-center shadow-2xl active:scale-95
            ${!settings.vacationMode ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
        >
          {settings.vacationMode ? (
            <div className="relative"><Dog size={80} className="opacity-20" /><span className="absolute -top-4 -right-2 text-2xl font-bold animate-zz text-white">Zzz</span></div>
          ) : (
            <div className="relative flex items-center justify-center"><Dog size={80} className="fill-current" /><Activity size={32} className="absolute -right-10 top-0 text-orange-300 animate-pulse" /></div>
          )}
          <span className="text-xs font-black uppercase tracking-widest mt-4">{t('tap_sleep', lang)}</span>
        </button>

        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400 mb-1"><Activity size={14} /><span className="text-[10px] font-black uppercase tracking-widest">{t('heartbeat', lang)}</span></div>
          <div className="text-6xl font-black text-slate-800 tracking-tighter">{lastPing}</div>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl gap-1">
            <button onClick={() => setActiveTab('today')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'today' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500'}`}>{t('today', lang)}</button>
            <button onClick={() => setActiveTab('tomorrow')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'tomorrow' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500'}`}>{t('tomorrow', lang)}</button>
            <button onClick={() => { setActiveTab('base'); setShowWeekPlan(true); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'base' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>{t('week_plan', lang)}</button>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t('start', lang)}</label>
                <input type="time" value={displayStart} onChange={(e) => {
                    if (isBase) return;
                    const newO = {...settings.overrides};
                    newO[activeDateStr] = { ...newO[activeDateStr], start: e.target.value };
                    setSettings({...settings, overrides: newO});
                }} className="w-full bg-slate-50 rounded-xl py-3 px-4 font-bold outline-none border-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-orange-500 uppercase tracking-wider">{t('deadline', lang)}</label>
                <input type="time" value={displayEnd} onChange={(e) => {
                    if (isBase) return;
                    const newO = {...settings.overrides};
                    newO[activeDateStr] = { ...newO[activeDateStr], end: e.target.value };
                    setSettings({...settings, overrides: newO});
                }} className="w-full bg-orange-50 rounded-xl py-3 px-4 font-bold text-orange-700 outline-none border-none" />
              </div>
            </div>
            <div className="text-center pt-2 border-t border-slate-50">
              <span className="text-[11px] font-bold text-slate-400">{isBase ? t('base_active', lang) : `${t('planning_for', lang)} ${daysVoluit[activeDayIdx]}`}</span>
            </div>
          </div>
        </div>
      </main>

      {/* MODALS (Simplified for brevity but functional) */}
      {showManual && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end p-4">
          <div className="bg-white w-full rounded-[2.5rem] p-8 space-y-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black italic">{t('manual', lang)}</h2><button onClick={() => setShowManual(false)}><X/></button></div>
            <div className="bg-orange-50 p-6 rounded-3xl"><h3 className="font-bold mb-2">{t('barkr_mean', lang)}</h3><p className="text-sm text-slate-600">{t('barkr_desc', lang)}</p></div>
            <button onClick={() => setShowManual(false)} className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest">{t('close', lang)}</button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end p-4">
          <div className="bg-white w-full rounded-[2.5rem] p-8 space-y-6 overflow-y-auto max-h-[85vh]">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black italic">{t('setup', lang)}</h2><button onClick={() => setShowSettings(false)}><X/></button></div>
            <div className="space-y-4">
              <input value={settings.name} onChange={(e) => setSettings({...settings, name: e.target.value})} placeholder={t('user_name', lang)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
              <select value={settings.country} onChange={(e) => setSettings({...settings, country: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none">
                {Object.keys(COUNTRIES).map(c => <option key={c} value={c}>{COUNTRIES[c].flag} {COUNTRIES[c].name}</option>)}
              </select>
              {showInstallBtn && <button onClick={handleInstallClick} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase flex items-center justify-center gap-2"><Smartphone size={20}/> {t('install_app', lang)}</button>}
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full bg-slate-800 text-white py-5 rounded-2xl font-black uppercase tracking-widest">{t('save', lang)}</button>
          </div>
        </div>
      )}

      {showWeekPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end p-4">
          <div className="bg-white w-full rounded-[2.5rem] p-8 space-y-6 overflow-y-auto max-h-[85vh]">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black italic">{t('week_plan', lang)}</h2><button onClick={() => setShowWeekPlan(false)}><X/></button></div>
            <div className="space-y-3">
              {daysVoluit.map((d:string, i:number) => (
                <div key={i} className="flex justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="font-bold text-slate-700">{d}</span>
                  <div className="flex gap-2">
                    <input type="time" value={settings.schedules[i].startTime} onChange={e => { const s = {...settings.schedules}; s[i].startTime = e.target.value; setSettings({...settings, schedules: s}) }} className="bg-white p-1 rounded font-bold text-xs" />
                    <input type="time" value={settings.schedules[i].endTime} onChange={e => { const s = {...settings.schedules}; s[i].endTime = e.target.value; setSettings({...settings, schedules: s}) }} className="bg-white p-1 rounded font-bold text-xs text-orange-600" />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowWeekPlan(false)} className="w-full bg-slate-800 text-white py-5 rounded-2xl font-black uppercase">{t('ok', lang)}</button>
          </div>
        </div>
      )}
    </div>
  );
}
