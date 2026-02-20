import React, { useState, useEffect } from 'react';
import { TRANSLATIONS } from './constants/translations';
import { COUNTRIES } from './constants/countries';
import { InfoPage } from './components/InfoPage'; 

const appStyles = `
  @keyframes zzz-float {
    0% { transform: translate(0, 0) rotate(-10deg); opacity: 0; }
    50% { transform: translate(10px, -15px) rotate(10deg); opacity: 1; }
    100% { transform: translate(20px, -30px) rotate(-10deg); opacity: 0; }
  }
  .zzz-anim { animation: zzz-float 3s infinite ease-in-out; }
  /* Geen schaduwen toegestaan */
  * { box-shadow: none !important; }
`;

export default function App() {
  const [status, setStatus] = useState<'connected' | 'offline'>('connected');
  const [showManual, setShowManual] = useState(false);
  const [lastPing] = useState('09:16');
  const [activeTab, setActiveTab] = useState<'base' | 'today' | 'tomorrow'>('today');

  const [settings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    return saved ? JSON.parse(saved) : { country: 'nl', name: 'Aldo' };
  });

  const lang = settings.country || 'nl';
  const t = (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['nl']?.[key] || key;

  useEffect(() => {
    const interval = setInterval(() => {
      if (status === 'connected') {
        fetch('https://barkr.nl/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app_key: 'BARKR_SECURE_V1',
            user_name: settings.name
          })
        }).catch(() => {});
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [status, settings.name]);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans p-4 flex flex-col items-center">
      <style>{appStyles}</style>
      
      {/* HEADER: Hondje picto linksboven + Titel + Status (Strikte opmaak) */}
      <div className="w-full max-w-md flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center text-white">
             <span className="text-2xl">🐶</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black leading-none">{t('app_title')}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {status === 'connected' ? 'BARKR IS WAAKZAAM' : 'SYSTEEM IN RUST'}
              </p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowManual(true)} 
          className="w-10 h-10 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400"
        >
          <span className="text-lg">ⓘ</span>
        </button>
      </div>

      {/* STATUS CIRKEL: Ronde contrasterende rand + Blaffend hondje + Zzz animatie */}
      <div className="relative mb-6">
        <button 
          onClick={() => setStatus(status === 'connected' ? 'offline' : 'connected')}
          className={`w-64 h-64 rounded-full flex flex-col items-center justify-center relative border-[6px] transition-colors duration-300
            ${status === 'connected' 
              ? 'bg-orange-600 border-orange-200' 
              : 'bg-slate-700 border-slate-500'}`}
        >
          {status === 'connected' ? (
            <div className="flex flex-col items-center">
              {/* Blaffend hondje picto */}
              <div className="text-7xl mb-2 relative">
                🐕
                <span className="absolute -right-4 top-0 text-white text-2xl animate-pulse">🔊</span>
              </div>
              <p className="text-white font-black text-[10px] tracking-widest uppercase">{t('tik_sleep')}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <p className="text-blue-300 text-4xl font-black zzz-anim absolute top-8 right-8">Zzz</p>
              <span className="text-7xl mb-2 opacity-30 grayscale">🐕</span>
              <p className="text-slate-300 font-black text-[10px] tracking-widest uppercase">{t('tik_wake')}</p>
            </div>
          )}
        </button>
      </div>

      {/* LAATSTE CONTROLE: Systeemhartslag groter, Tijd veeeeel kleiner */}
      <div className="w-full max-w-md border border-slate-100 rounded-3xl p-4 mb-4 flex flex-col items-center">
        <p className="text-slate-400 font-black text-lg tracking-widest uppercase">
          {status === 'connected' ? 'SYSTEEM HARTSLAG' : 'LAATSTE CONTROLE'}
        </p>
        <p className="text-xl font-bold text-slate-800">{lastPing}</p>
      </div>

      {/* PLANNING SECTION: Minder witruimte, geen schaduwen */}
      <div className="w-full max-w-md border border-slate-100 rounded-[32px] p-5">
        <div className="flex justify-between items-center mb-4">
          <p className="text-orange-600 font-black text-[10px] tracking-widest uppercase">
            {t('current_planning')}
          </p>
          <button className="bg-slate-900 text-white text-[9px] font-black px-4 py-2 rounded-full uppercase">
            {t('open_week')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button 
            onClick={() => setActiveTab('today')}
            className={`py-3 rounded-xl font-black text-xs uppercase
            ${activeTab === 'today' ? 'bg-orange-600 text-white' : 'bg-slate-50 text-slate-400'}`}
          >
            {t('today')}
          </button>
          <button 
            onClick={() => setActiveTab('tomorrow')}
            className={`py-3 rounded-xl font-black text-xs uppercase
            ${activeTab === 'tomorrow' ? 'bg-orange-600 text-white' : 'bg-slate-50 text-slate-400'}`}
          >
            {t('tomorrow')}
          </button>
        </div>

        <div className="flex justify-between items-center px-4">
          <div>
            <p className="text-[9px] font-black text-slate-300 uppercase">{t('start')}</p>
            <p className="text-2xl font-black text-slate-800">06:00</p>
          </div>
          <div className="h-8 w-px bg-slate-100"></div>
          <div className="text-right">
            <p className="text-[9px] font-black text-orange-200 uppercase">{t('deadline')}</p>
            <p className="text-2xl font-black text-orange-600">10:00</p>
          </div>
        </div>
        
        <p className="text-center text-[9px] font-bold text-slate-300 mt-4 italic">
          {t('standard_active')}
        </p>
      </div>

      {showManual && <InfoPage onClose={() => setShowManual(false)} lang={lang} />}
    </div>
  );
}
