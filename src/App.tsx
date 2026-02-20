import React, { useState, useEffect } from 'react';
import { TRANSLATIONS } from './constants/translations';
import { COUNTRIES } from './constants/countries';
import { InfoPage } from './components/InfoPage'; // Fix: Named import om build error te voorkomen

// CSS-in-JS voor de Zzz animatie en verfijnde styling
const appStyles = `
  @keyframes zzz-float {
    0% { transform: translate(0, 0) rotate(-10deg); opacity: 0; }
    50% { transform: translate(15px, -25px) rotate(10deg); opacity: 1; }
    100% { transform: translate(30px, -50px) rotate(-10deg); opacity: 0; }
  }
  .zzz-anim { animation: zzz-float 3s infinite ease-in-out; }
  .dog-icon-container { box-shadow: 0 4px 12px rgba(234, 88, 12, 0.2); }
  .status-ring { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
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

  // Beveiligde hartslag naar de Cloudflare Tunnel
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
        }).catch(() => console.debug("Silent failure - offline mode"));
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [status, settings.name]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-5 flex flex-col items-center">
      <style>{appStyles}</style>
      
      {/* HEADER: Hondje picto linksboven (Eis: linksboven picto) */}
      <div className="w-full max-w-md flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="dog-icon-container w-16 h-16 bg-orange-600 rounded-[20px] flex items-center justify-center text-white">
             <span className="text-3xl">🐶</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-black tracking-tighter leading-none text-slate-900">{t('app_title')}</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {status === 'connected' ? t('status_active') : t('status_sleep')}
              </p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowManual(true)} 
          className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-orange-600 transition-colors"
        >
          <span className="text-lg">ⓘ</span>
        </button>
      </div>

      {/* STATUS CIRKEL: Contrasterende rand & Zzz animatie (Eis: Zzz animatie terug) */}
      <div className="relative mb-8">
        <button 
          onClick={() => setStatus(status === 'connected' ? 'offline' : 'connected')}
          className={`status-ring w-64 h-64 rounded-full flex flex-col items-center justify-center relative shadow-2xl
            ${status === 'connected' 
              ? 'bg-orange-600 border-[8px] border-orange-100 shadow-orange-200' 
              : 'bg-slate-800 border-[8px] border-slate-600 shadow-slate-200'}`}
        >
          {status === 'connected' ? (
            <div className="flex flex-col items-center">
              <span className="text-7xl mb-1">🐕</span>
              <p className="text-white font-black text-[10px] tracking-[0.2em] uppercase opacity-90">{t('tik_sleep')}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <p className="text-blue-300 text-5xl font-black zzz-anim absolute top-10 right-10">Zzz</p>
              <span className="text-7xl mb-1 opacity-20 grayscale">🐕</span>
              <p className="text-slate-400 font-black text-[10px] tracking-[0.2em] uppercase">{t('tik_wake')}</p>
            </div>
          )}
        </button>
      </div>

      {/* LAATSTE CONTROLE: Systeemhartslag groter, Tijd kleiner (Eis: Tijd veeeeel kleiner) */}
      <div className="w-full max-w-md bg-white rounded-[28px] p-5 shadow-sm border border-slate-50 mb-6 flex flex-col items-center">
        <p className="text-slate-400 font-black text-xs tracking-[0.15em] mb-1 uppercase">
          {status === 'connected' ? t('heartbeat') : t('last_check')}
        </p>
        <p className="text-5xl font-black text-slate-900 tracking-tight">{lastPing}</p>
      </div>

      {/* PLANNING SECTION: Minder witruimte (Eis: Onnodige witruimte weg) */}
      <div className="w-full max-w-md bg-white rounded-[32px] p-6 shadow-sm border border-slate-50">
        <div className="flex justify-between items-center mb-5">
          <p className="text-orange-600 font-black text-[11px] tracking-widest uppercase flex items-center gap-2">
            <span className="text-base">🕒</span> {t('current_planning')}
          </p>
          <button className="bg-slate-900 text-white text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-[0.1em]">
            {t('open_week')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button 
            onClick={() => setActiveTab('today')}
            className={`py-4 rounded-2xl font-black text-xs tracking-widest transition-all uppercase
            ${activeTab === 'today' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'bg-slate-50 text-slate-400'}`}
          >
            {t('today')}
          </button>
          <button 
            onClick={() => setActiveTab('tomorrow')}
            className={`py-4 rounded-2xl font-black text-xs tracking-widest transition-all uppercase
            ${activeTab === 'tomorrow' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'bg-slate-50 text-slate-400'}`}
          >
            {t('tomorrow')}
          </button>
        </div>

        <div className="flex justify-between items-center px-2">
          <div className="flex flex-col">
            <p className="text-[9px] font-black text-slate-300 tracking-widest mb-1 uppercase">{t('start')}</p>
            <p className="text-3xl font-black text-slate-800">06:00</p>
          </div>
          <div className="h-10 w-[1.5px] bg-slate-100"></div>
          <div className="flex flex-col text-right">
            <p className="text-[9px] font-black text-orange-200 tracking-widest mb-1 uppercase">{t('deadline')}</p>
            <p className="text-3xl font-black text-orange-600">10:00</p>
          </div>
        </div>
        
        <p className="text-center text-[9px] font-black text-slate-300 mt-6 italic uppercase tracking-tighter opacity-70">
          {t('standard_active')}
        </p>
      </div>

      {showManual && <InfoPage onClose={() => setShowManual(false)} lang={lang} />}
    </div>
  );
}
