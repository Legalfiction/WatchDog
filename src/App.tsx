import React, { useState, useEffect } from 'react';
import { Settings, Info, HeartPulse, Clock, X, ChevronDown, Plus, Trash2, ShieldCheck, Activity } from 'lucide-react';
import { COUNTRIES } from './constants/countries';
import { TRANSLATIONS } from './constants/translations';

// DIT IS DE DEFINITIEVE FIX VOOR DE AFBEELDING
import logoImg from './logo.png'; 

const t = (key: string, lang: string) => (TRANSLATIONS[lang] || TRANSLATIONS['nl'])[key] || key;

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow'>('today');
  const [settings, setSettings] = useState({ 
    name: 'Aldo', 
    vacationMode: false, 
    country: 'NL', 
    contacts: [{ name: 'Aldo user', phone: '+31615964009' }] 
  });
  
  const lang = COUNTRIES[settings.country]?.lang || 'nl';
  const days = COUNTRIES[settings.country]?.days || COUNTRIES['NL'].days;
  const todayIdx = (new Date().getDay() + 6) % 7;
  const activeDay = activeTab === 'today' ? days[todayIdx] : days[(todayIdx + 1) % 7];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white font-sans text-[#1a2b3c] flex flex-col overflow-hidden">
      {/* 1. Header: Icoon linksboven conform screenshot */}
      <header className="px-6 py-4 flex justify-between items-center sticky top-0 bg-white z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#f26522] p-2 rounded-xl shadow-md">
            <img src={logoImg} className="w-6 h-6 brightness-0 invert" alt="Logo" />
          </div>
          <div><h1 className="text-xl font-black italic leading-none uppercase tracking-tighter">Barkr</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${settings.vacationMode ? 'bg-blue-500' : 'bg-green-500 animate-pulse'}`} />
              <span className={`text-[10px] font-bold uppercase ${settings.vacationMode ? 'text-blue-500' : 'text-green-500'}`}>
                {settings.vacationMode ? t('idle', lang) : t('vigilant', lang)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2.5 rounded-xl bg-slate-50 text-slate-500"><Info size={20}/></button>
          {/* CONFIG KNOP FIX: Gekoppeld aan setShowSettings */}
          <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors">
            <Settings size={20}/>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start pt-8 p-6 gap-8 overflow-y-auto no-scrollbar">
        {/* 2. Grote cirkel: PNG BLAFFENDE HOND (geladen via import) */}
        <button 
          onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
          className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all ${!settings.vacationMode ? 'bg-[#f26522] border-8 border-orange-400' : 'bg-[#242f3e] border-8 border-slate-700'}`}
        >
          <div className="flex flex-col items-center gap-2">
            <img src={logoImg} className={`w-44 h-44 brightness-0 invert transition-opacity ${settings.vacationMode ? 'opacity-20' : 'opacity-100'}`} alt="Barkr" />
            <span className="text-[11px] font-black uppercase text-white mt-4 tracking-widest italic">TIK OM TE SLAPEN</span>
          </div>
        </button>

        {/* 3. Hartslag: Kleiner font conform verzoek */}
        <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-50 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400 mb-1 font-bold text-[10px] uppercase tracking-widest"><HeartPulse size={14} /> {t('heartbeat', lang)}</div>
          <div className="text-4xl font-black text-slate-800 tracking-tighter uppercase">09:16</div>
        </div>

        {/* 4. Planning: Met duidelijke tekst onderaan */}
        <div className="w-full max-w-sm space-y-4 rounded-[2.5rem] bg-slate-50/50 p-6 border border-slate-100">
          <div className="flex justify-between items-center px-1">
             <div className="flex items-center gap-2 text-[#f26522] font-black text-[10px] uppercase tracking-wider"><Clock size={16}/> ACTUELE PLANNING</div>
             <button className="py-2 px-5 rounded-full bg-[#1a2b3c] text-white font-black uppercase text-[8px] shadow-lg">OPEN WEEKPLANNING</button>
          </div>
          <div className="flex gap-3 px-1">
             <button onClick={() => setActiveTab('today')} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === 'today' ? 'bg-[#f26522] text-white shadow-md' : 'bg-white text-slate-400'}`}>VANDAAG</button>
             <button onClick={() => setActiveTab('tomorrow')} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === 'tomorrow' ? 'bg-[#f26522] text-white shadow-md' : 'bg-white text-slate-400'}`}>MORGEN</button>
          </div>
          <div className="bg-white rounded-3xl p-6 grid grid-cols-2 gap-4 text-center border border-slate-100 shadow-sm relative">
             <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">START</label><div className="font-black text-slate-700 text-lg">06:00</div></div>
             <div className="space-y-1"><label className="text-[9px] font-black text-[#f26522] uppercase">DEADLINE</label><div className="font-black text-[#f26522] text-lg">10:00</div></div>
             {/* LEESBAARHEID FIX: Tekst donkerder grijs en dikker */}
             <div className="col-span-2 pt-3 border-t border-slate-50">
               <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.15em] italic">
                 PLANNING VOOR {activeDay.toUpperCase()} ACTIEF
               </span>
             </div>
          </div>
        </div>
      </main>

      {/* 5. SETUP PAGINA: Contact kaart conform Screenshot 2026-02-20 22.48.22.png */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 space-y-6 max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1a2b3c]">BARKR SETUP</h2><button onClick={() => setShowSettings(false)}><X size={24} className="text-slate-300"/></button></div>
            <div className="space-y-5">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-300 uppercase ml-1">NAAM GEBRUIKER</label><input type="text" value={settings.name} className="w-full bg-slate-50 border-none rounded-2xl py-5 px-6 font-black text-slate-700" /></div>
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-[#f26522] uppercase ml-1 tracking-widest">CONTACTEN</label>
                 <button className="w-full py-4 bg-[#f26522] text-white rounded-2xl font-black shadow-md flex items-center justify-center transition-transform active:scale-95"><Plus size={24}/></button>
                 {settings.contacts.map((c, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 relative space-y-5 shadow-sm">
                       <button className="absolute top-6 right-8 text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={20}/></button>
                       <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">NAAM</label>
                         <input value={c.name} className="w-full bg-slate-50 rounded-2xl py-4 px-6 font-black text-slate-700 border-none" />
                       </div>
                       <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">TELEFOONNUMMER</label>
                         <input value={c.phone} className="w-full bg-slate-50 rounded-2xl py-4 px-6 font-black text-slate-700 border-none" />
                       </div>
                       {/* TEST VERBINDING KNOP CONFORM AFBEELDING */}
                       <button className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-100 hover:bg-emerald-100 transition-colors">
                         <ShieldCheck size={18}/> TEST VERBINDING
                       </button>
                    </div>
                 ))}
              </div>
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full bg-[#1a2b3c] text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl text-xs">CONFIGURATIE OPSLAAN</button>
          </div>
        </div>
      )}
    </div>
  );
}
