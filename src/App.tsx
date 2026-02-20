import React, { useState, useEffect } from 'react';
import { Settings, Info, HeartPulse, Clock, X, ChevronDown, Plus, Trash2, ShieldCheck, Activity } from 'lucide-react';
import { COUNTRIES } from './constants/countries';
import { TRANSLATIONS } from './constants/translations';

// DE DEFINITIEVE FIX VOOR DE AFBEELDING UIT DE SRC MAP
import dogLogo from './logo.png'; 

const t = (key: string, lang: string) => (TRANSLATIONS[lang] || TRANSLATIONS['nl'])[key] || key;

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | null>(null); // Deselecteerbaar
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
    <div className="max-w-md mx-auto h-[100dvh] bg-white font-sans text-slate-900 flex flex-col overflow-hidden border-x border-slate-100">
      {/* 1. Strakke Header zonder schaduw */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-[#f26522] p-2 rounded-xl">
            <img src={dogLogo} className="w-6 h-6 brightness-0 invert" alt="Barkr" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black italic leading-none uppercase tracking-tighter">Barkr</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${settings.vacationMode ? 'bg-blue-500' : 'bg-green-500 animate-pulse'}`} />
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                {settings.vacationMode ? t('idle', lang) : t('vigilant', lang)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2.5 rounded-xl bg-slate-50 text-slate-400"><Info size={20}/></button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-xl bg-slate-50 text-slate-400"><Settings size={20}/></button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-around p-6 overflow-hidden">
        {/* 2. Grote Status Cirkel conform origineel */}
        <button 
          onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
          className={`relative w-64 h-64 rounded-full flex flex-col items-center justify-center transition-all border-4 ${!settings.vacationMode ? 'bg-[#f26522] border-orange-300' : 'bg-[#1a2b3c] border-slate-700'}`}
        >
          <img src={dogLogo} className={`w-40 h-40 brightness-0 invert transition-opacity duration-500 ${settings.vacationMode ? 'opacity-20' : 'opacity-100'}`} alt="Barking Dog" />
          <span className="text-[11px] font-black uppercase text-white mt-3 tracking-widest italic opacity-80">TIK OM TE SLAPEN</span>
        </button>

        {/* 3. Hartslag Kaart - Kleiner font */}
        <div className="w-full bg-slate-50/30 rounded-[2rem] py-5 border border-slate-100 text-center shrink-0">
          <div className="flex items-center justify-center gap-2 text-slate-400 mb-1 font-bold text-[10px] uppercase tracking-widest"><HeartPulse size={14} /> {t('heartbeat', lang)}</div>
          <div className="text-4xl font-black text-slate-800 tracking-tighter">09:16</div>
        </div>

        {/* 4. Planning Sectie - Geen schaduwen, strak */}
        <div className="w-full space-y-4 rounded-[2rem] bg-white p-5 border border-slate-100 shrink-0">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-2 text-[#f26522] font-black text-[10px] uppercase tracking-wider"><Clock size={16}/> ACTUELE PLANNING</div>
             <button className="py-2.5 px-5 rounded-full bg-[#1a2b3c] text-white font-black uppercase text-[8px]">OPEN WEEKPLANNING</button>
          </div>
          
          <div className="flex gap-3">
             <button 
               onClick={() => setActiveTab(activeTab === 'today' ? null : 'today')} 
               className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase border transition-all ${activeTab === 'today' ? 'bg-[#f26522] text-white border-[#f26522]' : 'bg-white text-slate-400 border-slate-100'}`}
             >VANDAAG</button>
             <button 
               onClick={() => setActiveTab(activeTab === 'tomorrow' ? null : 'tomorrow')} 
               className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase border transition-all ${activeTab === 'tomorrow' ? 'bg-[#f26522] text-white border-[#f26522]' : 'bg-white text-slate-400 border-slate-100'}`}
             >MORGEN</button>
          </div>

          <div className="bg-slate-50/50 rounded-2xl p-5 grid grid-cols-2 gap-4 text-center border border-slate-100">
             <div className="flex flex-col"><span className="text-[9px] font-black text-slate-300 uppercase mb-1">START</span><span className="font-black text-slate-700 text-xl leading-none">06:00</span></div>
             <div className="flex flex-col"><span className="text-[9px] font-black text-[#f26522] uppercase mb-1">DEADLINE</span><span className="font-black text-[#f26522] text-xl leading-none">10:00</span></div>
             <div className="col-span-2 pt-3 border-t border-slate-200/50">
               <span className="text-[11px] font-black text-slate-600 uppercase italic tracking-tighter">
                 {getStatusLine()}
               </span>
             </div>
          </div>
        </div>
      </main>

      {/* 5. Compact Setup Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-end p-4">
          <div className="bg-white w-full rounded-[2.5rem] p-8 space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar border-t border-slate-100">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black italic uppercase tracking-tighter">BARKR SETUP</h2><button onClick={() => setShowSettings(false)} className="p-1.5 bg-slate-50 rounded-full text-slate-300"><X size={20}/></button></div>
            <div className="space-y-5">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-300 uppercase ml-1">NAAM GEBRUIKER</label><input type="text" value={settings.name} className="w-full bg-slate-50 border-none rounded-xl py-4 px-6 font-black text-slate-700" /></div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center ml-1"><label className="text-[10px] font-black text-[#f26522] uppercase tracking-widest">CONTACTEN</label><button className="p-2 bg-[#f26522] text-white rounded-xl"><Plus size={18}/></button></div>
                 {settings.contacts.map((c, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 relative space-y-4">
                       <button className="absolute top-5 right-6 text-slate-200 hover:text-red-400"><Trash2 size={20}/></button>
                       <div className="space-y-1"><label className="text-[9px] font-black text-slate-300 uppercase">NAAM</label><input value={c.name} className="w-full bg-slate-50 rounded-xl py-3.5 px-5 font-black text-slate-700 border-none text-sm" /></div>
                       <div className="space-y-1"><label className="text-[9px] font-black text-slate-300 uppercase">TELEFOONNUMMER</label><input value={c.phone} className="w-full bg-slate-50 rounded-xl py-3.5 px-5 font-black text-slate-700 border-none text-sm" /></div>
                       <button className="w-full py-3 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-100"><ShieldCheck size={16}/> TEST VERBINDING</button>
                    </div>
                 ))}
              </div>
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs">OPSLAAN</button>
          </div>
        </div>
      )}
    </div>
  );
}
