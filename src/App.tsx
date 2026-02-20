import React, { useState, useEffect } from 'react';
import { Settings, Info, HeartPulse, Clock, X, ChevronDown, Plus, Trash2, ShieldCheck, Activity } from 'lucide-react';
import { COUNTRIES } from './constants/countries';
import { TRANSLATIONS } from './constants/translations';

// Cruciale import voor de PNG uit de src map
import logo from './logo.png'; 

const t = (key: string, lang: string) => (TRANSLATIONS[lang] || TRANSLATIONS['nl'])[key] || key;

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | null>(null);
  const [settings, setSettings] = useState({ 
    name: 'Aldo', vacationMode: false, country: 'NL', 
    contacts: [{ name: 'Aldo user', phone: '+31615964009' }] 
  });
  
  const lang = COUNTRIES[settings.country]?.lang || 'nl';
  const days = COUNTRIES[settings.country]?.days || COUNTRIES['NL'].days;
  const todayIdx = (new Date().getDay() + 6) % 7;

  const getStatusLine = () => {
    if (!activeTab) return "STANDAARD WEEKPLANNING ACTIEF";
    const day = activeTab === 'today' ? days[todayIdx] : days[(todayIdx + 1) % 7];
    return `PLANNING VOOR ${day.toUpperCase()} ACTIEF`;
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-white font-sans text-slate-800 flex flex-col overflow-hidden select-none">
      {/* 1. Compacte Header */}
      <header className="px-5 py-3 flex justify-between items-center shrink-0 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="bg-[#f26522] p-1.5 rounded-lg shadow-sm">
            <img src={logo} className="w-5 h-5 brightness-0 invert" alt="Logo" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black italic leading-none uppercase tracking-tighter">Barkr</h1>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${settings.vacationMode ? 'bg-blue-500' : 'bg-green-500 animate-pulse'}`} />
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                {settings.vacationMode ? t('idle', lang) : t('vigilant', lang)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button className="p-2 rounded-lg bg-slate-50 text-slate-400"><Info size={18}/></button>
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors">
            <Settings size={18}/>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-around p-5 overflow-hidden">
        {/* 2. Gereduceerde Status Cirkel voor no-scroll */}
        <button 
          onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
          className={`relative w-52 h-52 rounded-full flex flex-col items-center justify-center shadow-xl transition-all active:scale-95 ${!settings.vacationMode ? 'bg-[#f26522] border-4 border-orange-400' : 'bg-[#242f3e] border-4 border-slate-700'}`}
        >
          <img src={logo} className={`w-32 h-32 brightness-0 invert transition-opacity duration-500 ${settings.vacationMode ? 'opacity-20' : 'opacity-100'}`} alt="Barkr" />
          <span className="text-[10px] font-black uppercase text-white mt-2 tracking-widest italic opacity-60">TIK OM TE SLAPEN</span>
        </button>

        {/* 3. Strakke Hartslag Kaart */}
        <div className="w-full bg-white rounded-[2rem] p-4 shadow-lg border border-slate-50 text-center shrink-0">
          <div className="flex items-center justify-center gap-2 text-slate-400 mb-0.5 font-bold text-[9px] uppercase tracking-widest"><HeartPulse size={12} /> {t('heartbeat', lang)}</div>
          <div className="text-3xl font-black text-slate-800 tracking-tighter">09:16</div>
        </div>

        {/* 4. Planning Sectie - Minimalistisch */}
        <div className="w-full space-y-3 rounded-[2rem] bg-slate-50/50 p-4 border border-slate-100 shrink-0">
          <div className="flex justify-between items-center px-1">
             <div className="flex items-center gap-1.5 text-[#f26522] font-black text-[9px] uppercase tracking-wider"><Clock size={14}/> ACTUELE PLANNING</div>
             <button className="py-2 px-4 rounded-full bg-[#1a2b3c] text-white font-black uppercase text-[7px] shadow-md transition-transform active:scale-95">OPEN WEEKPLANNING</button>
          </div>
          
          <div className="flex gap-2">
             <button 
               onClick={() => setActiveTab(activeTab === 'today' ? null : 'today')} 
               className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === 'today' ? 'bg-[#f26522] text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}
             >VANDAAG</button>
             <button 
               onClick={() => setActiveTab(activeTab === 'tomorrow' ? null : 'tomorrow')} 
               className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === 'tomorrow' ? 'bg-[#f26522] text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}
             >MORGEN</button>
          </div>

          <div className="bg-white rounded-2xl p-4 grid grid-cols-2 gap-3 text-center border border-slate-100 shadow-sm relative">
             <div className="space-y-0.5"><label className="text-[8px] font-black text-slate-300 uppercase">START</label><div className="font-black text-slate-700 text-base leading-none">06:00</div></div>
             <div className="space-y-0.5"><label className="text-[8px] font-black text-[#f26522] uppercase">DEADLINE</label><div className="font-black text-[#f26522] text-base leading-none">10:00</div></div>
             {/* Tekst onderaan - Geoptimaliseerd voor leesbaarheid */}
             <div className="col-span-2 pt-2.5 border-t border-slate-50">
               <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-tight italic">
                 {getStatusLine()}
               </span>
             </div>
          </div>
        </div>
      </main>

      {/* 5. SETUP MODAL - Compact & Scrollvrij */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end p-3">
          <div className="bg-white w-full rounded-[2rem] p-6 space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar shadow-2xl border-t border-slate-100">
            <div className="flex justify-between items-center"><h2 className="text-xl font-black italic uppercase text-slate-800 tracking-tighter">BARKR SETUP</h2><button onClick={() => setShowSettings(false)} className="p-1 bg-slate-50 rounded-full text-slate-300 hover:text-slate-600 transition-colors"><X size={20}/></button></div>
            <div className="space-y-4">
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-300 uppercase ml-1">NAAM GEBRUIKER</label><input type="text" value={settings.name} className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 font-black text-slate-700 focus:ring-1 focus:ring-[#f26522]" /></div>
              <div className="space-y-2">
                 <div className="flex justify-between items-center px-1"><label className="text-[9px] font-black text-[#f26522] uppercase tracking-widest">CONTACTEN</label><button className="p-1.5 bg-[#f26522] text-white rounded-lg shadow-sm active:scale-90 transition-transform"><Plus size={16}/></button></div>
                 {settings.contacts.map((c, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 relative space-y-3 shadow-sm">
                       <button className="absolute top-4 right-5 text-slate-200 hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
                       <div className="space-y-0.5"><label className="text-[8px] font-black text-slate-300 uppercase">NAAM</label><input value={c.name} className="w-full bg-slate-50 rounded-lg py-2.5 px-4 font-black text-slate-700 border-none text-sm" /></div>
                       <div className="space-y-0.5"><label className="text-[8px] font-black text-slate-300 uppercase">NUMMER</label><input value={c.phone} className="w-full bg-slate-50 rounded-lg py-2.5 px-4 font-black text-slate-700 border-none text-sm" /></div>
                       <button className="w-full py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm">
                         <ShieldCheck size={14}/> TEST VERBINDING
                       </button>
                    </div>
                 ))}
              </div>
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full bg-[#1a2b3c] text-white py-4.5 rounded-xl font-black uppercase tracking-[0.2em] shadow-lg text-[10px] active:scale-95 transition-all">CONFIGURATIE OPSLAAN</button>
          </div>
        </div>
      )}
    </div>
  );
}
