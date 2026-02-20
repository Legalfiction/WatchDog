import React, { useState, useEffect } from 'react';
import { Settings, Info, HeartPulse, Clock, X, ChevronDown, Plus, Trash2, ShieldCheck, Activity } from 'lucide-react';
import { COUNTRIES } from './constants/countries';
import { TRANSLATIONS } from './constants/translations';

const t = (key: string, lang: string) => (TRANSLATIONS[lang] || TRANSLATIONS['nl'])[key] || key;

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | null>(null); // Deselecteerbaar
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    return saved ? JSON.parse(saved) : { 
      name: 'Aldo', vacationMode: false, country: 'NL', 
      contacts: [{ name: 'Aldo user', phone: '+31615964009' }] 
    };
  });
  
  const lang = COUNTRIES[settings.country]?.lang || 'nl';
  const days = COUNTRIES[settings.country]?.days || COUNTRIES['NL'].days;
  const todayIdx = (new Date().getDay() + 6) % 7;

  const getStatusLine = () => {
    if (!activeTab) return "STANDAARD WEEKPLANNING ACTIEF";
    const day = activeTab === 'today' ? days[todayIdx] : days[(todayIdx + 1) % 7];
    return `PLANNING VOOR ${day.toUpperCase()} ACTIEF`;
  };

  useEffect(() => {
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
  }, [settings]);

  return (
    <div className="max-w-md mx-auto h-screen bg-white font-sans text-slate-900 flex flex-col overflow-hidden border-x border-slate-100">
      {/* 1. Header: Compact en professioneel */}
      <header className="px-5 py-3 flex justify-between items-center border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-[#f26522] p-1.5 rounded-lg">
            <img src="/logo.png" className="w-5 h-5 brightness-0 invert" alt="Barkr" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black italic leading-none uppercase tracking-tighter">Barkr</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${settings.vacationMode ? 'bg-blue-500' : 'bg-green-500 animate-pulse'}`} />
              <span className="text-[9px] font-black uppercase text-slate-400">
                {settings.vacationMode ? t('idle', lang) : t('vigilant', lang)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button className="p-2 rounded-lg bg-slate-50 text-slate-400"><Info size={18}/></button>
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg bg-slate-50 text-slate-400"><Settings size={18}/></button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-around p-4 overflow-hidden">
        {/* 2. Status Cirkel: Logica exact uit uw oude script */}
        <button 
          onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
          className={`relative w-64 h-64 rounded-full flex flex-col items-center justify-center border-4 transition-all duration-500 overflow-hidden shrink-0 ${
            settings.vacationMode ? 'bg-slate-900 border-slate-700' : 'bg-[#f26522] border-orange-500'
          }`}
        >
          {settings.vacationMode ? (
            <div className="flex flex-col items-center justify-center w-full h-full relative">
              <img src="/logo.png" alt="Barkr Logo" className="w-full h-full object-cover scale-[1.02] opacity-40 grayscale" />
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
                <span className="text-xs font-black uppercase text-blue-100 tracking-widest mt-24">WAKKER WORDEN</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full relative">
              <img src="/logo.png" alt="Barkr Logo" className="w-full h-full object-cover scale-[1.02]" />
              <div className="absolute bottom-6 inset-x-0 text-center">
                <span className="text-[10px] font-black uppercase text-white tracking-widest italic drop-shadow-md">Tik om te slapen</span>
              </div>
            </div>
          )}
        </button>

        {/* 3. Hartslag: Minimalistisch en kleiner font */}
        <div className="w-full bg-white rounded-3xl py-4 border border-slate-100 text-center shrink-0">
          <div className="flex items-center justify-center gap-2 text-slate-300 mb-0.5 font-bold text-[9px] uppercase tracking-widest"><HeartPulse size={12} /> {t('heartbeat', lang)}</div>
          <div className="text-3xl font-black text-slate-800 tracking-tighter leading-none">09:16</div>
        </div>

        {/* 4. Planning: Strakke blokken, geen schaduwen */}
        <div className="w-full space-y-3 rounded-3xl bg-slate-50/30 p-4 border border-slate-100 shrink-0">
          <div className="flex justify-between items-center px-1">
             <div className="flex items-center gap-1.5 text-[#f26522] font-black text-[9px] uppercase tracking-wider"><Clock size={14}/> ACTUELE PLANNING</div>
             <button className="py-1.5 px-4 rounded-full bg-slate-800 text-white font-black uppercase text-[7px]">OPEN WEEKPLANNING</button>
          </div>
          
          <div className="flex gap-2">
             <button 
               onClick={() => setActiveTab(activeTab === 'today' ? null : 'today')} 
               className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase border transition-all ${activeTab === 'today' ? 'bg-[#f26522] text-white border-[#f26522]' : 'bg-white text-slate-400 border-slate-100'}`}
             >VANDAAG</button>
             <button 
               onClick={() => setActiveTab(activeTab === 'tomorrow' ? null : 'tomorrow')} 
               className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase border transition-all ${activeTab === 'tomorrow' ? 'bg-[#f26522] text-white border-[#f26522]' : 'bg-white text-slate-400 border-slate-100'}`}
             >MORGEN</button>
          </div>

          <div className="bg-white rounded-2xl p-4 grid grid-cols-2 gap-3 text-center border border-slate-50">
             <div className="flex flex-col"><span className="text-[8px] font-black text-slate-300 uppercase">START</span><span className="font-black text-slate-700 text-base">06:00</span></div>
             <div className="flex flex-col"><span className="text-[8px] font-black text-[#f26522] uppercase">DEADLINE</span><span className="font-black text-[#f26522] text-base">10:00</span></div>
             <div className="col-span-2 pt-2 border-t border-slate-50">
               <span className="text-[10px] font-extrabold text-slate-500 uppercase italic tracking-tight">
                 {getStatusLine()}
               </span>
             </div>
          </div>
        </div>
      </main>

      {/* 5. Setup: Compact en zonder witruimte */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/10 backdrop-blur-[1px] flex items-end p-2">
          <div className="bg-white w-full rounded-[2rem] p-6 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar border-t border-slate-100">
            <div className="flex justify-between items-center"><h2 className="text-lg font-black italic uppercase text-slate-800 tracking-tighter">BARKR SETUP</h2><button onClick={() => setShowSettings(false)} className="p-1.5 bg-slate-50 rounded-full text-slate-300"><X size={18}/></button></div>
            <div className="space-y-4">
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-300 uppercase ml-1">NAAM GEBRUIKER</label><input type="text" value={settings.name} className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 font-black text-slate-700" /></div>
              <div className="space-y-2">
                 <div className="flex justify-between items-center px-1"><label className="text-[9px] font-black text-[#f26522] uppercase tracking-widest">CONTACTEN</label><button className="p-1 bg-[#f26522] text-white rounded-lg"><Plus size={16}/></button></div>
                 {settings.contacts.map((c: any, i: number) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 relative space-y-3">
                       <button className="absolute top-4 right-5 text-slate-200"><Trash2 size={16}/></button>
                       <div className="space-y-0.5"><label className="text-[8px] font-black text-slate-300 uppercase">NAAM</label><input value={c.name} className="w-full bg-slate-50 rounded-lg py-2 px-4 font-black text-slate-700 border-none text-sm" /></div>
                       <div className="space-y-0.5"><label className="text-[8px] font-black text-slate-300 uppercase">NUMMER</label><input value={c.phone} className="w-full bg-slate-50 rounded-lg py-2 px-4 font-black text-slate-700 border-none text-sm" /></div>
                       <button className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[9px] uppercase tracking-widest border border-emerald-100 flex items-center justify-center gap-2">
                         <ShieldCheck size={14}/> TEST VERBINDING
                       </button>
                    </div>
                 ))}
              </div>
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px]">OPSLAAN</button>
          </div>
        </div>
      )}
    </div>
  );
}
