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
  
  /* Strikte eis: Geen schaduwen */
  * { box-shadow: none !important; text-shadow: none !important; }
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
      
      {/* HEADER: Hondje linksboven, Titel en Status */}
      <div className="w-full max-w-md flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 rounded flex items-center justify-center text-white">
             <span className="text-xl">🐶</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black leading-none">{t('app_title')}</h1>
            <div className="flex items-center gap-1 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                {status === 'connected' ? 'BARKR IS WAAKZAAM' : 'SYSTEEM IN RUST'}
              </p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowManual(true)} 
          className="w-8 h-8 border border-slate-200 rounded flex items-center justify-center text-slate-400"
        >
          <span className="text-sm">ⓘ</span>
        </button>
      </div>

      {/* STATUS CIRKEL: Contrasterende rand + Blaffend hondje + Zzz animatie */}
      <div className="relative mb-4">
        <button 
          onClick={() => setStatus(status === 'connected' ? 'offline' : 'connected')}
          className={`w-60 h-60 rounded-full flex flex-col items-center justify-center relative border-[5px]
            ${status === 'connected' 
              ? 'bg-orange-600 border-orange-200' 
              : 'bg-slate-700 border-slate-500'}`}
        >
          {status === 'connected' ? (
            <div className="flex flex-col items-center">
              <div className="text-7xl mb-1 relative">
                🐕
                <span className="absolute -right-3 top-0 text-white text-xl animate-pulse">)))</span>
              </div>
              <p className="text-white font-black text-[9px] tracking-widest uppercase">{t('tik_sleep')}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <p className="text-blue-300 text-4xl font-black zzz-anim absolute top-6 right-6">Zzz</p>
              <span className="text-7xl mb-1 opacity-20 grayscale">🐕</span>
              <p className="text-slate-300 font-black text-[9px] tracking-widest uppercase">{t('tik_wake')}</p>
            </div>
          )}
        </button>
      </div>

      {/* LAATSTE CONTROLE: Systeemhartslag GROOT, Tijd KLEIN */}
      <div className="w-full max-w-md border border-slate-100 rounded-2xl p-3 mb-3 flex flex-col items-center">
        <p className="text-slate-500 font-black text-xl tracking-tighter uppercase leading-none">
          {status === 'connected' ? 'SYSTEEM HARTSLAG' : 'LAATSTE CONTROLE'}
        </p>
        <p className="text-sm font-bold text-slate-400 mt-1">{lastPing}</p>
      </div>

      {/* PLANNING SECTION: Compact, geen schaduwen */}
      <div className="w-full max-w-md border border-slate-100 rounded-3xl p-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-orange-600 font-black text-[10px] tracking-widest uppercase">
            {t('current_planning')}
          </p>
          <button className="bg-slate-900 text-white text-[8px] font-black px-3 py-1.5 rounded-full uppercase">
            {t('open_week')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button 
            onClick={() => setActiveTab('today')}
            className={`py-2.5 rounded-lg font-black text-[10px] uppercase
            ${activeTab === 'today' ? 'bg-orange-600 text-white' : 'bg-slate-50 text-slate-400'}`}
          >
            {t('today')}
          </button>
          <button 
            onClick={() => setActiveTab('tomorrow')}
            className={`py-2.5 rounded-lg font-black text-[10px] uppercase
            ${activeTab === 'tomorrow' ? 'bg-orange-600 text-white' : 'bg-slate-50 text-slate-400'}`}
          >
            {t('tomorrow')}
          </button>
        </div>

        <div className="flex justify-between items-center px-4">
          <div>
            <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">{t('start')}</p>
            <p className="text-2xl font-black text-slate-800 leading-none">06:00</p>
          </div>
          <div className="h-6 w-px bg-slate-100"></div>
          <div className="text-right">
            <p className="text-[8px] font-black text-orange-200 uppercase leading-none mb-1">{t('deadline')}</p>
            <p className="text-2xl font-black text-orange-600 leading-none">10:00</p>
          </div>
        </div>
        
        <p className="text-center text-[8px] font-bold text-slate-300 mt-3 italic uppercase">
          {t('standard_active')}
        </p>
      </div>

      {showManual && <InfoPage onClose={() => setShowManual(false)} lang={lang} />}
    </div>
  );
}
