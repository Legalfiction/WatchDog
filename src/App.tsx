import React, { useState, useEffect } from 'react';
import { TRANSLATIONS } from './constants/translations';
import { COUNTRIES } from './constants/countries';
import InfoPage from './components/InfoPage';

const appStyles = `
  @keyframes zzz-float {
    0% { transform: translate(0, 0) rotate(-10deg); opacity: 0; }
    50% { transform: translate(15px, -20px) rotate(10deg); opacity: 1; }
    100% { transform: translate(30px, -40px) rotate(-10deg); opacity: 0; }
  }
  .zzz-anim { animation: zzz-float 3s infinite ease-in-out; }
`;

export default function App() {
  const [status, setStatus] = useState<'connected' | 'offline'>('connected');
  const [showManual, setShowManual] = useState(false);
  const [lastPing, setLastPing] = useState('09:16');
  const [activeTab, setActiveTab] = useState<'base' | 'today' | 'tomorrow'>('base');

  const [settings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    return saved ? JSON.parse(saved) : { country: 'nl', name: 'Aldo' };
  });

  const lang = settings.country || 'nl';
  const t = (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['nl'][key];

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-900 font-sans p-6 flex flex-col items-center">
      <style>{appStyles}</style>
      
      {/* HEADER: Hondje picto linksboven */}
      <div className="w-full max-w-md flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-orange-600 rounded-[22px] flex items-center justify-center text-white shadow-lg shadow-orange-100">
             <span className="text-3xl">🐶</span>
          </div>
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter leading-none">{t('app_title')}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {status === 'connected' ? t('status_active') : t('status_sleep')}
              </p>
            </div>
          </div>
        </div>
        <button onClick={() => setShowManual(true)} className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
          <span className="text-slate-400 font-bold">ⓘ</span>
        </button>
      </div>

      {/* STATUS CIRKEL: Professionele rand & Zzz animatie */}
      <div className="relative mb-10">
        <button 
          onClick={() => setStatus(status === 'connected' ? 'offline' : 'connected')}
          className={`w-72 h-72 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl relative
            ${status === 'connected' 
              ? 'bg-orange-600 border-[12px] border-orange-50 shadow-orange-100' 
              : 'bg-slate-800 border-[12px] border-slate-700 opacity-95'}`}
        >
          {status === 'connected' ? (
            <div className="flex flex-col items-center">
              <span className="text-8xl mb-2">🐕</span>
              <p className="text-white font-black text-xs tracking-widest uppercase opacity-80">{t('tik_sleep')}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <p className="text-blue-300 text-5xl font-black zzz-anim absolute top-12 right-12">Zzz</p>
              <span className="text-8xl mb-2 opacity-20 grayscale">🐕</span>
              <p className="text-slate-400 font-black text-xs tracking-widest uppercase">{t('tik_wake')}</p>
            </div>
          )}
        </button>
      </div>

      {/* LAATSTE CONTROLE: Systeemhartslag groter, Tijd kleiner */}
      <div className="w-full max-w-md bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 mb-8">
        <div className="flex flex-col items-center">
          <p className="text-slate-400 font-black text-xs tracking-widest mb-2 uppercase">{t('heartbeat')}</p>
          <p className="text-6xl font-black text-slate-900 tracking-tighter">{lastPing}</p>
        </div>
      </div>

      {/* PLANNING SECTION: Compact, Professioneel */}
      <div className="w-full max-w-md bg-white rounded-[40px] p-8 shadow-sm border border-gray-50">
        <div className="flex justify-between items-center mb-6">
          <p className="text-orange-600 font-black text-xs tracking-widest uppercase flex items-center gap-2">
            <span className="text-lg">📅</span> {t('current_planning')}
          </p>
          <button className="bg-slate-900 text-white text-[9px] font-black px-5 py-2.5 rounded-full uppercase tracking-widest">
            {t('open_week')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button className="py-5 rounded-3xl font-black text-xs tracking-widest bg-orange-600 text-white shadow-xl shadow-orange-100 uppercase">
            {t('today')}
          </button>
          <button className="py-5 rounded-3xl font-black text-xs tracking-widest bg-gray-50 text-slate-400 uppercase">
            {t('tomorrow')}
          </button>
        </div>

        <div className="flex justify-between items-center px-4">
          <div className="text-center">
            <p className="text-[9px] font-black text-slate-300 tracking-widest mb-2 uppercase">{t('start')}</p>
            <p className="text-4xl font-black text-slate-900">06:00</p>
          </div>
          <div className="h-12 w-[2px] bg-gray-100 rounded-full"></div>
          <div className="text-center">
            <p className="text-[9px] font-black text-orange-200 tracking-widest mb-2 uppercase">{t('deadline')}</p>
            <p className="text-4xl font-black text-orange-600">10:00</p>
          </div>
        </div>
        
        <p className="text-center text-[10px] font-black text-slate-300 mt-8 italic uppercase tracking-tighter">
          {t('standard_active')}
        </p>
      </div>

      {showManual && <InfoPage onClose={() => setShowManual(false)} lang={lang} />}
    </div>
  );
}
