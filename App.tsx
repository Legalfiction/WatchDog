import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Activity, ShieldCheck, Dog, Clock, Info, ExternalLink, Mail, AlertTriangle, Wifi, Smartphone, BellRing, HeartPulse, Plane, Briefcase, Home, Mountain, Zap, CalendarDays, ChevronDown
} from 'lucide-react';

const ENDPOINTS = ['https://barkr.nl', 'http://192.168.1.38:5000'];

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
    vigilant: 'Barkr is waakzaam', idle: 'Systeem in rust', offline: 'Geen verbinding', tap_sleep: 'Tik om te slapen', heartbeat: 'Systeem Hartslag', manual: 'Handleiding', setup: 'Barkr Setup', user_name: 'Naam Gebruiker', smart_plan: 'Slimme Planning', win_day: 'Vensters per dag', start: 'Start', deadline: 'Deadline', contacts: 'Contacten', c_name: 'Naam', c_phone: 'Telefoonnummer', test: 'TEST VERBINDING', save: 'Opslaan', close: 'Sluiten', ok: 'Begrepen', barkr_mean: 'De betekenis van Barkr', barkr_desc: 'Barkr is afgeleid van het Engelse \'Barker\' (blaffer). Het staat voor een trouwe digitale waakhond die over je waakt.', why: 'Waarom deze applicatie?', how: 'Hoe gebruik je Barkr?', ins_title: 'Wanneer gebruik je Barkr?', info_support: 'Informatie & Support', launch_alert: 'Belangrijk: Opstarten', launch_desc: 'In deze fase dient de app handmatig opgestart te worden.', smart_help_t: 'Wat is Slimme Planning?', smart_help_d: 'Hiermee kun je per dag unieke tijden instellen. Handig als je in het weekend later opstaat dan doordeweeks.', active_schedule: 'Huidige Planning', today: 'Vandaag', tomorrow: 'Morgen'
  },
  EN: {
    vigilant: 'Barkr is vigilant', idle: 'System idle', offline: 'No connection', tap_sleep: 'Tap to sleep', heartbeat: 'System Heartbeat', manual: 'Manual', setup: 'Barkr Setup', user_name: 'User Name', smart_plan: 'Smart Planning', win_day: 'Windows per day', start: 'Start', deadline: 'Deadline', contacts: 'Contacts', c_name: 'Name', c_phone: 'Phone Number', test: 'TEST CONNECTION', save: 'Save', close: 'Close', ok: 'Understood', barkr_mean: 'The meaning of Barkr', barkr_desc: 'Barkr represents a loyal digital watchdog.', why: 'Why this application?', how: 'How to use Barkr?', ins_title: 'Inspiration', info_support: 'Support', launch_alert: 'Important: Startup', launch_desc: 'Currently, the app must be started manually.', smart_help_t: 'What is Smart Planning?', smart_help_d: 'This allows you to set unique times per day. Useful if you wake up later on weekends.', active_schedule: 'Current Schedule', today: 'Today', tomorrow: 'Tomorrow'
  },
  DE: {
    today: 'Heute', tomorrow: 'Morgen'
  },
  FR: {
    today: 'Auj.', tomorrow: 'Demain'
  },
  ES: {
    today: 'Hoy', tomorrow: 'Mañana'
  },
  IT: {
    today: 'Oggi', tomorrow: 'Domani'
  },
  PL: {
    today: 'Dziś', tomorrow: 'Jutro'
  },
  TR: {
    today: 'Bugün', tomorrow: 'Yarın'
  }
};

// Fallback logic voor alle talen naar EN voor ontbrekende keys
Object.keys(LANGUAGES).forEach(l => { if(!TRANSLATIONS[l]) TRANSLATIONS[l] = {}; Object.assign(TRANSLATIONS[l], { ...TRANSLATIONS.EN, ...TRANSLATIONS[l] }); });

const t = (key: string, lang: string) => (TRANSLATIONS[lang] || TRANSLATIONS['NL'])[key] || key;

export default function App() {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'searching' | 'connected' | 'offline'>('searching');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [lastPing, setLastPing] = useState('--:--');
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    return saved ? JSON.parse(saved) : {
      name: '', vacationMode: false, useCustomSchedule: false, language: 'NL',
      activeDays: [0, 1, 2, 3, 4, 5, 6], startTime: '07:00', endTime: '08:30',
      contacts: [], schedules: {}
    };
  });

  const lang = settings.language || 'NL';
  const daysVoluit = LANGUAGES[lang].days;

  // Bepaal de huidige dag en de dag van morgen (0 = Maandag, 6 = Zondag in onze array)
  const currentDayIndex = (new Date().getDay() + 6) % 7; 
  const tomorrowDayIndex = (currentDayIndex + 1) % 7;

  useEffect(() => {
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
    if (!activeUrl) return;
    const timer = setTimeout(() => {
      fetch(`${activeUrl}/save_settings`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(settings)
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
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

  const toggleDay = (idx: number) => {
    const newDays = settings.activeDays.includes(idx) 
      ? settings.activeDays.filter((d: number) => d !== idx)
      : [...settings.activeDays, idx];
    setSettings({...settings, activeDays: newDays});
  };

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

          {/* SLIMME PLANNING OP HOOFDSCHERM MET VANDAAG/MORGEN LOGICA */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all">
            <header className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-orange-600" />
                <h3 className="font-black text-xs uppercase tracking-tight text-slate-800">{t('active_schedule', lang)}</h3>
              </div>
              <button onClick={() => setSettings({...settings, useCustomSchedule: !settings.useCustomSchedule})} className={`text-[9px] font-black px-3 py-1.5 rounded-full transition-all border ${settings.useCustomSchedule ? 'bg-orange-600 border-orange-700 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                {t('smart_plan', lang).toUpperCase()}
              </button>
            </header>

            <div className="p-5 space-y-6">
              {/* DAGEN SELECTOR - NETJES OP 1 REGEL */}
              <div className="flex justify-between items-end relative h-10">
                {daysVoluit.map((day, idx) => {
                  const isToday = idx === currentDayIndex;
                  const isTomorrow = idx === tomorrowDayIndex;
                  
                  return (
                    <div key={idx} className="flex flex-col items-center">
                      {isToday && <span className="text-[8px] font-black text-orange-600 uppercase absolute -top-1">{t('today', lang)}</span>}
                      {isTomorrow && <span className="text-[8px] font-black text-slate-400 uppercase absolute -top-1">{t('tomorrow', lang)}</span>}
                      
                      <button 
                        onClick={() => toggleDay(idx)} 
                        className={`w-9 h-9 rounded-[10px] text-[11px] font-black flex items-center justify-center transition-all border ${settings.activeDays.includes(idx) ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                      >
                        {day.substring(0, 2)}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* TIJDEN */}
              {!settings.useCustomSchedule ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">{t('start', lang)}</label><input type="time" value={settings.startTime} onChange={e=>setSettings({...settings, startTime:e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 font-black text-slate-700 text-center"/></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-red-400 uppercase ml-1">{t('deadline', lang)}</label><input type="time" value={settings.endTime} onChange={e=>setSettings({...settings, endTime:e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 font-black text-red-600 text-center"/></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {settings.activeDays.sort().map((d: number) => {
                    const isToday = d === currentDayIndex;
                    return (
                      <div key={d} className={`flex items-center gap-3 p-3 rounded-2xl border ${isToday ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                        <span className={`w-20 text-[10px] font-black uppercase ${isToday ? 'text-orange-600' : 'text-slate-500'}`}>{daysVoluit[d].substring(0,2)} {isToday ? `(${t('today', lang)})` : ''}</span>
                        <input type="time" value={settings.schedules[d]?.startTime || settings.startTime} onChange={e=>setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], startTime:e.target.value}}})} className="flex-1 bg-white border border-slate-200 rounded-lg py-1 text-xs font-black text-center"/>
                        <input type="time" value={settings.schedules[d]?.endTime || settings.endTime} onChange={e=>setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], endTime:e.target.value}}})} className="flex-1 bg-white border border-slate-200 rounded-lg py-1 text-xs font-black text-red-600 text-center"/>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      {showManual && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-8 pb-20 no-scrollbar">
          <header className="flex justify-between items-center py-2"><h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-800">{t('manual', lang)}</h2><button onClick={() => setShowManual(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={24}/></button></header>
          <section className="bg-blue-600 p-6 rounded-[32px] text-white shadow-lg space-y-3 relative overflow-hidden"><h4 className="font-black flex items-center gap-2 uppercase text-xs tracking-[0.15em]"><AlertTriangle size={18} className="text-orange-400"/> {t('launch_alert', lang)}</h4><p className="text-sm font-bold">{t('launch_desc', lang)}</p></section>
          
          <section className="bg-orange-50 p-6 rounded-3xl border border-orange-200 space-y-3">
            <h4 className="font-black text-orange-800 flex items-center gap-2 uppercase text-xs tracking-widest"><Zap size={18}/> {t('smart_help_t', lang)}</h4>
            <p className="text-xs text-orange-900 leading-relaxed">{t('smart_help_d', lang)}</p>
          </section>

          <section className="bg-slate-900 p-8 rounded-[40px] text-white space-y-6 shadow-2xl">
            <h4 className="font-black flex items-center gap-2 uppercase text-xs tracking-widest text-orange-400"><ExternalLink size={18}/> {t('info_support', lang)}</h4>
            <div className="space-y-4">
              <a href="https://www.barkr.nl" target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 active:scale-95 transition-all"><div className="bg-orange-600 p-2 rounded-xl"><Wifi size={18} className="text-white"/></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Website</span><span className="font-bold text-sm tracking-tight">www.barkr.nl</span></div></a>
              <a href="mailto:info@barkr.nl" className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 active:scale-95 transition-all"><div className="bg-blue-600 p-2 rounded-xl"><Mail size={18} className="text-white"/></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Email</span><span className="font-bold text-sm tracking-tight">info@barkr.nl</span></div></a>
            </div>
          </section>
          <button onClick={() => setShowManual(false)} className="w-full py-5 bg-orange-600 text-white font-black uppercase rounded-3xl tracking-widest shadow-lg">{t('close', lang)}</button>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20 no-scrollbar">
          <header className="flex justify-between items-center mb-4"><h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">{t('setup', lang)}</h2><button onClick={() => setShowSettings(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button></header>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            {/* TAAL DROPDOWN */}
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
