import React, { useState, useEffect } from 'react';
import { Settings, Info, HeartPulse, Clock, X, ChevronDown, Plus, Trash2, ShieldCheck, Activity } from 'lucide-react';
import { COUNTRIES } from './constants/countries';
import { TRANSLATIONS } from './constants/translations';

const t = (key: string, lang: string) => (TRANSLATIONS[lang] || TRANSLATIONS['nl'])[key] || key;

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow'>('today');
  const [settings, setSettings] = useState({ name: 'Aldo', vacationMode: false, country: 'NL', contacts: [{ name: 'Aldo user', phone: '+31615964009' }] });
  
  const lang = COUNTRIES[settings.country]?.lang || 'nl';
  const days = COUNTRIES[settings.country]?.days || COUNTRIES['NL'].days;
  const todayIdx = (new Date().getDay() + 6) % 7;
  const activeDay = activeTab === 'today' ? days[todayIdx] : days[(todayIdx + 1) % 7];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white font-sans text-[#1a2b3c] flex flex-col overflow-hidden">
      <header className="px-6 py-4 flex justify-between items-center sticky top-0 bg-white z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#f26522] p-2 rounded-xl shadow-md">
            {/* AFBEELDING FIX: Verwijst nu naar de src map */}
            <img src="/src/logo.png" className="w-6 h-6 brightness-0 invert" alt="Logo" />
          </div>
          <div><h1 className="text-xl font-black italic leading-none uppercase">Barkr</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-green-500 uppercase">{t('vigilant', lang)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2.5 rounded-xl bg-slate-50 text-slate-500"><Info size={20}/></button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-xl bg-slate-50 text-slate-500"><Settings size={20}/></button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start pt-8 p-6 gap-8 overflow-y-auto">
        <button className="relative w-72 h-72 rounded-full bg-[#f26522] border-8 border-orange-400 flex flex-col items-center justify-center shadow-2xl">
          {/* AFBEELDING FIX: Verwijst nu naar de src map */}
          <img src="/src/logo.png" className="w-44 h-44 brightness-0 invert" alt="Barkr" />
          <span className="text-[11px] font-black uppercase text-white mt-4">TIK OM TE SLAPEN</span>
        </button>

        <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-50 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400 mb-1 font-bold text-[10px] uppercase tracking-widest"><HeartPulse size={14} /> {t('heartbeat', lang)}</div>
          <div className="text-4xl font-black text-slate-800 tracking-tighter uppercase">09:16</div>
        </div>

        <div className="w-full max-w-sm space-y-4 rounded-[2.5rem] bg-slate-50/50 p-6 border border-slate-100">
          <div className="flex justify-between items-center px-1">
             <div className="flex items-center gap-2 text-[#f26522] font-black text-[10px] uppercase tracking-wider"><Clock size={16}/> ACTUELE PLANNING</div>
             <button className="py-2 px-5 rounded-full bg-[#1a2b3c] text-white font-black uppercase text-[8px] shadow-lg">OPEN WEEKPLANNING</button>
          </div>
          <div className="flex gap-3 px-1">
             <button onClick={() => setActiveTab('today')} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase ${activeTab === 'today' ? 'bg-[#f26522] text-white' : 'bg-white text-slate-400'}`}>VANDAAG</button>
             <button onClick={() => setActiveTab('tomorrow')} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase ${activeTab === 'tomorrow' ? 'bg-[#f26522] text-white' : 'bg-white text-slate-400'}`}>MORGEN</button>
          </div>
          <div className="bg-white rounded-3xl p-6 grid grid-cols-2 gap-4 text-center border border-slate-100 shadow-sm relative">
             <div className="space-y-1"><label className="text-[9px] font-black text
