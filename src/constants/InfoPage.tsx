import React from 'react';
import { X, Dog, ShieldCheck, Clock, Plane, Briefcase, Home, Mountain, Smartphone, ExternalLink, Wifi, Mail } from 'lucide-react';

interface InfoPageProps {
  lang: string;
  t: (key: string, lang: string) => string;
  onClose: () => void;
}

export const InfoPage: React.FC<InfoPageProps> = ({ lang, t, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-8 overflow-y-auto no-scrollbar space-y-8">
          <div className="flex justify-between items-start">
            <h2 className="text-3xl font-black italic tracking-tighter text-slate-800 uppercase">{t('manual', lang)}</h2>
            <button onClick={onClose} className="bg-slate-100 p-2 rounded-full text-slate-400"><X size={20}/></button>
          </div>

          <section className="bg-orange-50 rounded-3xl p-6 space-y-3 border border-orange-100">
            <div className="flex items-center gap-3 text-[#f26522]"><Dog size={24} /><h3 className="font-black uppercase tracking-wider text-xs">{t('barkr_mean', lang)}</h3></div>
            <p className="text-slate-600 text-xs font-medium leading-relaxed">{t('barkr_desc', lang)}</p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-slate-400"><ShieldCheck size={20} /><h3 className="font-black uppercase tracking-wider text-xs">{t('why', lang)}</h3></div>
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
               <p className="text-xs text-slate-600 font-bold leading-relaxed">{t('why_desc1', lang)}</p>
               <p className="text-xs text-slate-600 font-bold leading-relaxed">{t('why_desc2', lang)}</p>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-slate-400"><Clock size={20} /><h3 className="font-black uppercase tracking-wider text-xs">{t('how', lang)}</h3></div>
            <div className="space-y-3">
              <div className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl"><div className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-xs shrink-0">1</div><p className="text-[11px] text-slate-500 font-bold leading-relaxed">{t('how_step1', lang)}</p></div>
              <div className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl"><div className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-xs shrink-0">2</div><p className="text-[11px] text-slate-500 font-bold leading-relaxed">{t('how_step2', lang)}</p></div>
              <div className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl"><div className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-xs shrink-0">3</div><p className="text-[11px] text-slate-500 font-bold leading-relaxed">{t('how_step3', lang)}</p></div>
            </div>
          </section>

          <section className="space-y-4 bg-slate-50 p-6 rounded-3xl">
            <h3 className="font-black text-slate-800 italic uppercase text-xs">{t('ins_title', lang)}</h3>
            <div className="space-y-4">
              <div className="flex gap-4"><div className="bg-white p-3 rounded-2xl text-orange-600 h-fit shadow-sm"><Plane size={20}/></div><div><h4 className="font-black text-xs mb-1">{t('ins_1_t', lang)}</h4><p className="text-[10px] text-slate-400 font-bold leading-relaxed">{t('ins_1_d', lang)}</p></div></div>
              <div className="flex gap-4"><div className="bg-white p-3 rounded-2xl text-blue-600 h-fit shadow-sm"><Briefcase size={20}/></div><div><h4 className="font-black text-xs mb-1">{t('ins_2_t', lang)}</h4><p className="text-[10px] text-slate-400 font-bold leading-relaxed">{t('ins_2_d', lang)}</p></div></div>
              <div className="flex gap-4"><div className="bg-white p-3 rounded-2xl text-green-600 h-fit shadow-sm"><Home size={20}/></div><div><h4 className="font-black text-xs mb-1">{t('ins_3_t', lang)}</h4><p className="text-[10px] text-slate-400 font-bold leading-relaxed">{t('ins_3_d', lang)}</p></div></div>
              <div className="flex gap-4"><div className="bg-white p-3 rounded-2xl text-purple-600 h-fit shadow-sm"><Mountain size={20}/></div><div><h4 className="font-black text-xs mb-1">{t('ins_4_t', lang)}</h4><p className="text-[10px] text-slate-400 font-bold leading-relaxed">{t('ins_4_d', lang)}</p></div></div>
            </div>
          </section>

          <section className="bg-blue-50 rounded-3xl p-6 space-y-3 border border-blue-100">
            <div className="flex items-center gap-3 text-blue-600"><Smartphone size={24} /><h3 className="font-black uppercase tracking-wider text-xs">{t('launch_alert', lang)}</h3></div>
            <p className="text-blue-800/70 text-[11px] font-bold leading-relaxed">{t('launch_desc', lang)}</p>
          </section>

          <section className="p-8 bg-slate-900 rounded-[2.5rem] text-white space-y-6">
            <h3 className="font-black italic text-sm flex items-center gap-3"><ExternalLink size={20}/> {t('info_support', lang)}</h3>
            <div className="space-y-3">
              <a href="https://www.barkr.nl" target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"><div className="bg-[#f26522] p-2 rounded-xl"><Wifi size={16}/></div><div><p className="text-[9px] uppercase font-black opacity-40">{t('website', lang)}</p><p className="font-black text-sm uppercase italic">www.barkr.nl</p></div></a>
              <a href="mailto:info@barkr.nl" className="flex items-center gap-4 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"><div className="bg-blue-600 p-2 rounded-xl"><Mail size={16}/></div><div><p className="text-[9px] uppercase font-black opacity-40">{t('email', lang)}</p><p className="font-black text-sm uppercase italic">info@barkr.nl</p></div></a>
            </div>
          </section>
          
          <button onClick={onClose} className="w-full bg-[#f26522] text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl text-xs">{t('close', lang)}</button>
        </div>
      </div>
    </div>
  );
};
