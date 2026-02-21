import React from 'react';
import { X, AlertTriangle, CalendarDays, Zap, Plane, Briefcase, Home, Mountain, Dog, HeartPulse, Clock, ExternalLink, Wifi, Mail } from 'lucide-react';

interface InfoPageProps {
  onClose: () => void;
  lang: string;
  t: (key: string, lang: string) => string;
}

export default function InfoPage({ onClose, lang, t }: InfoPageProps) {
  return (
    <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-8 pb-20 no-scrollbar">
      <header className="flex justify-between items-center py-2">
        <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-800">{t('manual', lang)}</h2>
        <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm"><X size={24}/></button>
      </header>
      
      <section className="bg-blue-600 p-6 rounded-[32px] text-white shadow-lg space-y-3 relative overflow-hidden">
        <h4 className="font-black flex items-center gap-2 uppercase text-xs tracking-[0.15em]"><AlertTriangle size={18} className="text-orange-400"/> {t('launch_alert', lang)}</h4>
        <p className="text-sm font-bold leading-relaxed">{t('launch_desc', lang)}</p>
      </section>
      
      <section className="bg-orange-50 p-6 rounded-3xl border border-orange-200 space-y-3">
        <h4 className="font-black text-orange-800 flex items-center gap-2 uppercase text-xs tracking-widest"><CalendarDays size={18}/> {t('smart_help_t', lang)}</h4>
        <p className="text-sm text-orange-900 leading-relaxed font-medium">{t('smart_help_d', lang)}</p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-2"><Zap size={14}/> {t('ins_title', lang)}</h3>
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex gap-4 items-start">
              <div className="bg-orange-100 p-3 rounded-2xl text-orange-600">
                {i===1 && <Plane size={24}/>} {i===2 && <Briefcase size={24}/>} {i===3 && <Home size={24}/>} {i===4 && <Mountain size={24}/>}
              </div>
              <div><h5 className="font-black text-slate-800 text-sm uppercase italic tracking-tight">{t(`ins_${i}_t`, lang)}</h5><p className="text-xs text-slate-500 leading-relaxed">{t(`ins_${i}_d`, lang)}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h4 className="font-black text-orange-600 flex items-center gap-2 uppercase text-xs tracking-[0.15em]"><Dog size={20}/> {t('barkr_mean', lang)}</h4>
        <p className="text-sm text-slate-600 leading-relaxed font-medium">{t('barkr_desc', lang)}</p>
      </section>

      {/* VERNIEUWDE SECTIE: WAAROM DEZE APPLICATIE */}
      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h4 className="font-black text-orange-600 flex items-center gap-2 uppercase text-xs tracking-[0.15em]"><HeartPulse size={20}/> {t('why', lang)}</h4>
        <div className="space-y-3">
          <p className="text-sm text-slate-600 leading-relaxed font-medium">{t('why_desc1', lang)}</p>
          <p className="text-sm text-slate-600 leading-relaxed font-medium">{t('why_desc2', lang)}</p>
          <p className="text-sm text-slate-600 leading-relaxed font-medium">{t('why_desc3', lang)}</p>
        </div>
      </section>

      <section className="bg-orange-50 p-7 rounded-[40px] border border-orange-200 space-y-5">
        <h4 className="font-black text-orange-800 flex items-center gap-2 uppercase text-xs tracking-widest"><Clock size={20}/> {t('how', lang)}</h4>
        <div className="space-y-4 font-medium">
          <div className="flex gap-4"><div className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs shadow-md">1</div><div><p className="text-sm font-bold text-orange-900">{t('setup', lang)}</p><p className="text-xs text-orange-800/70 leading-relaxed">{t('how_step1', lang)}</p></div></div>
          <div className="flex gap-4"><div className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs shadow-md">2</div><div><p className="text-sm font-bold text-orange-900">{t('vigilant', lang)}</p><p className="text-xs text-orange-800/70 leading-relaxed">{t('how_step2', lang)}</p></div></div>
          <div className="flex gap-4"><div className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs shadow-md">3</div><div><p className="text-sm font-bold text-orange-900">{t('deadline', lang)}</p><p className="text-xs text-orange-800/70 leading-relaxed">{t('how_step3', lang)}</p></div></div>
        </div>
      </section>

      <section className="bg-slate-900 p-8 rounded-[40px] text-white space-y-6 shadow-2xl">
        <h4 className="font-black flex items-center gap-2 uppercase text-xs tracking-widest text-orange-400"><ExternalLink size={18}/> {t('info_support', lang)}</h4>
        <div className="space-y-4">
          <a href="https://www.barkr.nl" target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 active:scale-95 transition-all"><div className="bg-orange-600 p-2 rounded-xl"><Wifi size={18} className="text-white"/></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t('website', lang)}</span><span className="font-bold text-sm tracking-tight">www.barkr.nl</span></div></a>
          <a href="mailto:info@barkr.nl" className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 active:scale-95 transition-all"><div className="bg-blue-600 p-2 rounded-xl"><Mail size={18} className="text-white"/></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t('email', lang)}</span><span className="font-bold text-sm tracking-tight">info@barkr.nl</span></div></a>
        </div>
      </section>

      <button onClick={onClose} className="w-full py-5 bg-orange-600 text-white font-black uppercase rounded-3xl tracking-widest shadow-lg active:scale-95 transition-all">{t('close', lang)}</button>
    </div>
  );
}
