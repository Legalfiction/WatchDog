import React, { useState, useEffect } from 'react';
import { TRANSLATIONS } from './constants/translations';
import { COUNTRIES } from './constants/countries';
import { InfoPage } from './components/InfoPage'; // <-- FIX: Accolades toegevoegd voor named import

const appStyles = `
  @keyframes zzz-float {
    0% { transform: translate(0, 0) rotate(-10deg); opacity: 0; }
    50% { transform: translate(10px, -15px) rotate(10deg); opacity: 1; }
    100% { transform: translate(20px, -30px) rotate(-10deg); opacity: 0; }
  }
  .zzz-anim { animation: zzz-float 3s infinite ease-in-out; }
  * { box-shadow: none !important; }
`;

export default function App() {
  const [status, setStatus] = useState<'connected' | 'offline'>('connected');
  const [showManual, setShowManual] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lastPing] = useState('09:16');
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow'>('today');

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    return saved ? JSON.parse(saved) : { country: 'nl', name: 'Aldo', smartPlanning: false };
  });

  const lang = settings.country || 'nl';
  const t = (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['nl'][key] || key;

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

  const toggleStatus = () => setStatus(status === 'connected' ? 'offline' : 'connected');

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans p-4 flex flex-col items-center">
      <style>{appStyles}</style>
      
      {/* HEADER: logo.png linksboven */}
      <div className="w-full max-w-md flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center overflow-hidden">
             <img src="/logo.png" alt="logo" className="w-10 h-10 object-contain" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black leading-none">{t('app_title')}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {status === 'connected' ? t('status_watchful') : t('status_idle')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="w-10 h-10 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400">ⓘ</button>
          <button onClick={() => setShowSettings(true)} className="w-10 h-10 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400">⚙️</button>
        </div>
      </div>

      {/* STATUS CIRKEL: logo.png in de cirkel */}
      <div className="relative mb-6">
        <button 
          onClick={toggleStatus}
          className={`w-64 h-64 rounded-full flex flex-col items-center justify-center relative border-[6px] transition-colors
            ${status === 'connected' ? 'bg-orange-600 border-orange-100' : 'bg-slate-700 border-slate-500'}`}
        >
          <div className="relative">
            {status === 'connected' ? (
              <div className="flex flex-col items-center">
                <img src="/logo.png" alt="dog" className="w-24 h-24 object-contain mb-2" />
                <p className="text-white font-black text-[10px] tracking-widest uppercase">{t('tik_sleep')}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <p className="text-blue-300 text-4xl font-black zzz-anim absolute top-0 right-0">Zzz</p>
                <img src="/logo.png" alt="dog" className="w-24 h-24 object-contain mb-2 opacity-20 grayscale" />
                <p className="text-slate-300 font-black text-[10px] tracking-widest uppercase">{t('tik_wake')}</p>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* LAATSTE CONTROLE: Systeemhartslag GROOT, Tijd KLEIN */}
      <div className="w-full max-w-md border border-slate-100 rounded-3xl p-4 mb-4 flex flex-col items-center">
        <p className="text-slate-500 font-black text-xl tracking-tighter uppercase leading-none">
          {t('system_heartbeat')}
        </p>
        <p className="text-sm font-bold text-slate-400 mt-1">{lastPing}</p>
      </div>

      {/* PLANNING SECTION */}
      <div className="w-full max-w-md border border-slate-100 rounded-[32px] p-5">
        <div className="flex justify-between items-center mb-4">
          <p className="text-orange-600 font-black text-[10px] tracking-widest uppercase">{t('current_planning')}</p>
          <button className="bg-slate-900 text-white text-[9px] font-black px-4 py-2 rounded-full uppercase">{t('open_week')}</button>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setActiveTab('today')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase ${activeTab === 'today' ? 'bg-orange-600 text-white' : 'bg-slate-50 text-slate-400'}`}>{t('today')}</button>
          <button onClick={() => setActiveTab('tomorrow')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase ${activeTab === 'tomorrow' ? 'bg-orange-600 text-white' : 'bg-slate-50 text-slate-400'}`}>{t('tomorrow')}</button>
        </div>

        <div className="flex justify-between items-center px-4">
          <div>
            <p className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1">{t('start')}</p>
            <p className="text-3xl font-black text-slate-800 leading-none">06:00</p>
          </div>
          <div className="h-8 w-px bg-slate-100"></div>
          <div className="text-right">
            <p className="text-[9px] font-black text-orange-200 uppercase leading-none mb-1">{t('deadline')}</p>
            <p className="text-4xl font-black text-orange-600 leading-none">10:00</p>
          </div>
        </div>
        
        <p className="text-center text-[9px] font-bold text-slate-300 mt-4 italic uppercase">{t('standard_active')}</p>
      </div>

      {/* SETUP PAGINA MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-white z-[60] p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black italic">{t('setup_title')}</h2>
            <button onClick={() => setShowSettings(false)} className="bg-slate-100 p-2 rounded-lg">✕</button>
          </div>
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 mb-2 block">{t('user_name')}</label>
              <input 
                type="text" 
                value={settings.name} 
                onChange={(e) => setSettings({...settings, name: e.target.value})}
                className="w-full bg-slate-50 p-4 rounded-xl font-bold border border-slate-200 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="font-black text-sm">{t('smart_planning')}</span>
              <input 
                type="checkbox" 
                checked={settings.smartPlanning} 
                onChange={(e) => setSettings({...settings, smartPlanning: e.target.checked})}
                className="w-5 h-5 accent-orange-600"
              />
            </div>
            <button 
              onClick={() => { localStorage.setItem('barkr_v16_data', JSON.stringify(settings)); setShowSettings(false); }}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-xl uppercase tracking-widest"
            >
              {t('save_config')}
            </button>
          </div>
        </div>
      )}

      {showManual && <InfoPage onClose={() => setShowManual(false)} lang={lang} />}
    </div>
  );
}
