import React, { useState, useEffect } from 'react';
import { Settings, Info, HeartPulse, Clock } from 'lucide-react';
import { COUNTRIES } from './constants/countries';
import { TRANSLATIONS } from './constants/translations';
import { InfoPage } from './components/InfoPage';

const t = (key: string, lang: string) => (TRANSLATIONS[lang] || TRANSLATIONS['nl'])[key] || key;

export default function App() {
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow'>('today');
  const [settings, setSettings] = useState({ name: 'Aldo', vacationMode: false, country: 'NL' });
  const lang = COUNTRIES[settings.country]?.lang || 'nl';

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white font-sans text-[#1a2b3c] flex flex-col overflow-hidden">
      {/* Header: Picto hondje terug linksboven */}
      <header className="px-6 py-4 flex justify-between items-center sticky top-0 bg-white z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#f26522] p-2 rounded-xl shadow-md">
            <img src="/logo.png" className="w-6 h-6 brightness-0 invert" alt="Barkr Logo" />
          </div>
          <div><h1 className="text-xl font-black italic tracking-tight leading-none">BARKR</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${settings.vacationMode ? 'bg-[#3b82f6]' : 'bg-[#10b981] animate-pulse'}`} />
              <span className={`text-[10px] font-bold tracking-wider ${settings.vacationMode ? 'text-[#3b82f6]' : 'text-[#10b981]'}`}>{settings.vacationMode ? t('idle', lang) : t('vigilant', lang)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2.5 rounded-xl bg-slate-50 text-slate-500"><Info size={20}/></button>
          <button className="p-2.5 rounded-xl bg-slate-50 text-slate-500"><Settings size={20}/></button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start pt-8 p-6 gap-8 overflow-y-auto no-scrollbar">
        {/* Grote cirkel met de PNG-afbeelding (logo.png) */}
        <button onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})} className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center transition-all duration-700 shadow-2xl active:scale-95 ${!settings.vacationMode ? 'bg-[#f26522] border-8 border-orange-400' : 'bg-[#242f3e] border-8 border-slate-700'}`}>
          <div className="flex flex-col items-center gap-2">
             <div className="relative">
                <img src="/logo.png" className={`w-36 h-36 brightness-0 invert ${settings.vacationMode ? 'opacity-20' : 'opacity-100'}`} alt="Blaffende hond" />
                {settings.vacationMode && <span className="absolute -top-4 -right-4 text-4xl font-black text-blue-400">Zzz</span>}
             </div>
             <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white mt-4">{settings.vacationMode ? t('wake_up', lang) : t('tap_sleep', lang)}</span>
          </div>
        </button>

        {/* Hartslag: Kleiner font (text-4xl) */}
        <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-6 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] border border-slate-50 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400 mb-2 font-bold text-[10px] uppercase tracking-widest"><HeartPulse size={14} /> {t('heartbeat', lang)}</div>
          <div className="text-4xl font-black text-slate-800 tracking-tighter">09:16</div>
        </div>

        {/* Actuele Planning: Open Weekplanning knop apart rechtsboven */}
        <div className="w-full max-w-sm space-y-4 rounded-[2.5rem] bg-slate-50/50 p-6 border border-slate-100">
          <div className="flex justify-between items-center px-1">
             <div className="flex items-center gap-2 text-[#f26522]"><Clock size={16}/><h3 className="font-black uppercase tracking-wider text-[10px]">{t('act_plan', lang)}</h3></div>
             <button className="py-2.5 px-5 rounded-full bg-[#1a2b3c] text-white font-black uppercase tracking-widest text-[8px] shadow-lg">{t('open_week_plan', lang)}</button>
          </div>
          <div className="flex gap-3 px-1">
             <button onClick={() => setActiveTab('today')} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'today' ? 'bg-[#f26522] text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>{t('today', lang)}</button>
             <button onClick={() => setActiveTab('tomorrow')} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'tomorrow' ? 'bg-[#f26522] text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>{t('tomorrow', lang)}</button>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 grid grid-cols-2 gap-4 text-center">
             <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">START</label><div className="font-black text-slate-700 text-lg">06:00</div></div>
             <div className="space-y-1"><label className="text-[9px] font-black text-[#f26522] uppercase tracking-wider">DEADLINE</label><div className="font-black text-[#f26522] text-lg">10:00</div></div>
          </div>
        </div>
      </main>
    </div>
  );
}
