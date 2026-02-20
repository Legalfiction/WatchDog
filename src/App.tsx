import React, { useState, useEffect } from 'react';
import { TRANSLATIONS } from './constants/translations';
import { COUNTRIES } from './constants/countries';
import InfoPage from './components/InfoPage';

// Styles voor de animatie en de honden-picto
const appStyles = `
  @keyframes zzz-float {
    0% { transform: translate(0, 0) rotate(-10deg); opacity: 0.2; }
    50% { transform: translate(10px, -15px) rotate(10deg); opacity: 1; }
    100% { transform: translate(20px, -30px) rotate(-10deg); opacity: 0; }
  }
  .zzz-anim { animation: zzz-float 2s infinite ease-in-out; }
  .dog-icon { font-size: 2.5rem; }
`;

export default function App() {
  const [status, setStatus] = useState<'connected' | 'offline'>('connected');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [lastPing, setLastPing] = useState('09:16');
  const [activeTab, setActiveTab] = useState<'base' | 'today' | 'tomorrow'>('base');

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    const p = saved ? JSON.parse(saved) : {};
    return {
      name: p.name || 'Aldo',
      country: p.country || 'nl',
      vacationMode: p.vacationMode || false,
      contacts: p.contacts || [{ name: 'Aldo user', phone: '+31615964009' }],
      schedules: p.schedules || {
        0: { startTime: '06:00', endTime: '18:00' },
        1: { startTime: '06:00', endTime: '18:00' },
        2: { startTime: '06:00', endTime: '18:00' },
        3: { startTime: '06:00', endTime: '18:00' },
        4: { startTime: '06:00', endTime: '18:00' },
        5: { startTime: '06:00', endTime: '18:00' },
        6: { startTime: '06:00', endTime: '18:00' }
      }
    };
  });

  const lang = settings.country;
  const t = (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['nl'][key] || key;

  useEffect(() => {
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
    
    // Hartslag versturen naar de Cloudflare Tunnel
    const interval = setInterval(() => {
      if (status === 'connected') {
        fetch('https://barkr.nl/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app_key: 'BARKR_SECURE_V1',
            user_name: settings.name
          })
        }).catch(err => console.log("Offline mode"));
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [settings, status]);

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans p-4 flex flex-col items-center">
      <style>{appStyles}</style>
      
      {/* HEADER: Hondje picto linksboven */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
             <span className="dog-icon">🐶</span>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">{t('app_title')}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-2.5 h-2.5 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {status === 'connected' ? t('status_active') : t('status_sleep')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100 text-slate-400">
            <span className="text-xl">ⓘ</span>
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100 text-slate-400">
            <span className="text-xl">⚙️</span>
          </button>
        </div>
      </div>

      {/* STATUS CIRKEL: Professionele rand & Zzz animatie */}
      <div className="relative mb-8">
        <button 
          onClick={() => setStatus(status === 'connected' ? 'offline' : 'connected')}
          className={`w-64 h-64 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl relative
            ${status === 'connected' 
              ? 'bg-orange-600 border-[10px] border-orange-200' 
              : 'bg-slate-700 border-[10px] border-slate-500 opacity-90'}`}
        >
          {status === 'connected' ? (
            <div className="flex flex-col items-center">
              <img src="/logo.png" alt="dog" className="w-32 mb-2" />
              <p className="text-white font-bold text-sm tracking-widest">{t('tik_sleep')}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <p className="text-blue-200 text-4xl mb-4 font-bold zzz-anim absolute top-10 right-10">Zzz</p>
              <img src="/logo.png" alt="dog" className="w-32 mb-2 opacity-40 grayscale" />
              <p className="text-slate-300 font-bold text-sm tracking-widest uppercase">{t('tik_wake')}</p>
            </div>
          )}
        </button>
      </div>

      {/* LAATSTE CONTROLE: Systeemhartslag groter, Tijd kleiner */}
      <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col items-center">
          <p className="text-slate-400 font-bold text-sm tracking-widest mb-1">{status === 'connected' ? t('heartbeat') : t('last_check')}</p>
          <p className="text-5xl font-black text-slate-800 tracking-tight">{lastPing}</p>
        </div>
      </div>

      {/* PLANNING SECTION: Minder witruimte, Duidelijke knoppen */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <p className="text-orange-600 font-black text-sm tracking-widest flex items-center gap-2">
            <span className="text-lg">🕒</span> {t('current_planning')}
          </p>
          <button className="bg-slate-900 text-white text-[10px] font-bold px-4 py-2 rounded-full uppercase tracking-widest">
            {t('open_week')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button 
            onClick={() => setActiveTab('today')}
            className={`py-4 rounded-2xl font-black text-sm tracking-widest transition-all
            ${activeTab === 'today' ? 'bg-orange-600 text-white shadow-lg' : 'bg-gray-50 text-slate-400 border border-gray-100'}`}
          >
            {t('today').toUpperCase()}
          </button>
          <button 
            onClick={() => setActiveTab('tomorrow')}
            className={`py-4 rounded-2xl font-black text-sm tracking-widest transition-all
            ${activeTab === 'tomorrow' ? 'bg-orange-600 text-white shadow-lg' : 'bg-gray-50 text-slate-400 border border-gray-100'}`}
          >
            {t('tomorrow').toUpperCase()}
          </button>
        </div>

        <div className="flex justify-between items-center px-4">
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-300 tracking-widest mb-1">{t('start')}</p>
            <p className="text-3xl font-black text-slate-800">06:00</p>
          </div>
          <div className="h-10 w-[2px] bg-gray-100"></div>
          <div className="text-center">
            <p className="text-[10px] font-black text-orange-200 tracking-widest mb-1">{t('deadline')}</p>
            <p className="text-3xl font-black text-orange-600">10:00</p>
          </div>
        </div>
        
        <p className="text-center text-[10px] font-bold text-slate-400 mt-6 italic opacity-60">
          {t('standard_active')}
        </p>
      </div>

      {/* Info Page Modal */}
      {showManual && <InfoPage onClose={() => setShowManual(false)} lang={lang} />}
    </div>
  );
}
