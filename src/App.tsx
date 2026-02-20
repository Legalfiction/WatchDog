import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Info, HeartPulse, Plus, Trash2, X, ChevronDown, Clock, Activity } from 'lucide-react';
import { COUNTRIES } from './constants/countries';
import { TRANSLATIONS } from './constants/translations';
import { InfoPage } from './components/InfoPage';

const ENDPOINTS = ['https://barkr.nl', 'http://192.168.1.38:5000'];
const APP_KEY = 'BARKR_SECURE_V1';

const t = (key: string, lang: string) => (TRANSLATIONS[lang] || TRANSLATIONS['nl'])[key] || key;

export default function App() {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'connected' | 'offline'>('offline');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showWeekPlan, setShowWeekPlan] = useState(false);
  const [lastPing, setLastPing] = useState('09:16');
  
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow'>('today');
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    const p = saved ? JSON.parse(saved) : {};
    return {
      name: p.name || 'Aldo', vacationMode: p.vacationMode || false, country: p.country || 'NL',
      overrides: p.overrides || {}, contacts: p.contacts || [{name: 'Aldo', phone: '+31615964009'}],
      schedules: p.schedules || {0:{startTime:'06:00',endTime:'10:00'},1:{startTime:'06:00',endTime:'10:00'},2:{startTime:'06:00',endTime:'10:00'},3:{startTime:'06:00',endTime:'10:00'},4:{startTime:'06:00',endTime:'10:00'},5:{startTime:'06:00',endTime:'10:00'},6:{startTime:'06:00',endTime:'10:00'}}
    };
  });

  const lang = COUNTRIES[settings.country]?.lang || 'nl';

  // --- UI Layout conform WhatsApp Image 2026-02-20 at 09.16.50.jpeg ---
  return (
    <div className="max-w-md mx-auto min-h-screen bg-white font-sans text-[#1a2b3c] flex flex-col overflow-hidden">
      <style>{`@keyframes bounce-zz { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-15px); opacity: 1; } } .animate-zz { animation: bounce-zz 2.5s infinite ease-in-out; } .no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      
      {/* 1. Header: Picto hondje linksboven */}
      <header className="px-6 py-4 flex justify-between items-center sticky top-0 bg-white z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#f26522] p-2 rounded-xl shadow-md">
            <img src="/logo.png" className="w-6 h-6 brightness-0 invert" alt="Barkr Logo" />
          </div>
          <div>
            <h1 className="text-xl font-black italic tracking-tight leading-none">BARKR</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${settings.vacationMode ? 'bg-[#3b82f6]' : 'bg-[#10b981] animate-pulse'}`} />
              <span className={`text-[10px] font-bold tracking-wider ${settings.vacationMode ? 'text-[#3b82f6]' : 'text-[#10b981]'}`}>
                {settings.vacationMode ? t('idle', lang) : t('vigilant', lang)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"><Info size={20}/></button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"><Settings size={20}/></button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start pt-8 p-6 gap-8 overflow-y-auto no-scrollbar">
        {/* 2. Grote Cirkel: DE BLAFFENDE HOND PNG */}
        <button onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})} className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center transition-all duration-700 shadow-2xl active:scale-95 ${!settings.vacationMode ? 'bg-[#f26522] border-8 border-orange-400' : 'bg-[#242f3e] border-8 border-slate-700'}`}>
          <div className="flex flex-col items-center gap-2">
             <div className="relative">
                <img src="/logo.png" className={`w-36 h-36 brightness-0 invert ${settings.vacationMode ? 'opacity-20' : 'opacity-100'}`} alt="Barkr PNG" />
                {settings.vacationMode && <span className="absolute -top-4 -right-4 text-4xl font-black text-blue-400 animate-zz">Zzz</span>}
                {!settings.vacationMode && <Activity size={32} className="absolute -right-8 top-0 text-orange-200 animate-pulse" />}
             </div>
             <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white mt-4">{settings.vacationMode ? t('wake_up', lang) : t('tap_sleep', lang)}</span>
          </div>
        </button>

        {/* 3. Hartslag Kaart: Font veel kleiner (text-4xl) */}
        <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-6 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] border border-slate-50 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400 mb-2 font-bold text-[10px] uppercase tracking-widest">
            <HeartPulse size={14} /> {t('heartbeat', lang)}
          </div>
          <div className="text-4xl font-black text-slate-800 tracking-tighter uppercase">{lastPing}</div>
        </div>

        {/* 4. Actuele Planning: Hiërarchie exact zoals screenshot */}
        <div className="w-full max-w-sm space-y-4 rounded-[2.5rem] bg-slate-50/50 p-6 border border-slate-100">
          <div className="flex justify-between items-center px-1">
             <div className="flex items-center gap-2 text-[#f26522]"><Clock size={16}/><h3 className="font-black uppercase tracking-wider text-[10px]">{t('act_plan', lang)}</h3></div>
             <button onClick={() => {}} className="py-2.5 px-5 rounded-full bg-[#1a2b3c] text-white font-black uppercase tracking-widest text-[8px] shadow-lg">{t('open_week_plan', lang)}</button>
          </div>
          
          <div className="flex gap-3 px-1">
             <button onClick={() => setActiveTab('today')} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'today' ? 'bg-[#f26522] text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>{t('today', lang)}</button>
             <button onClick={() => setActiveTab('tomorrow')} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'tomorrow' ? 'bg-[#f26522] text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>{t('tomorrow', lang)}</button>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 grid grid-cols-2 gap-4 text-center">
             <div className="space-y-1">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">START</label>
               <div className="font-black text-slate-700 text-lg">06:00</div>
             </div>
             <div className="space-y-1">
               <label className="text-[9px] font-black text-[#f26522] uppercase tracking-wider">DEADLINE</label>
               <div className="font-black text-[#f26522] text-lg">10:00</div>
             </div>
             <div className="col-span-2 pt-2 border-t border-slate-50">
               <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">STANDAARD WEEKPLANNING ACTIEF</span>
             </div>
          </div>
        </div>
      </main>

      {showManual && <InfoPage lang={lang} t={t} onClose={() => setShowManual(false)} />}
    </div>
  );
}
