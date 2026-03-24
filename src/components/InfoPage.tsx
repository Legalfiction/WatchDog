import React from 'react';
import {
  X, AlertTriangle, CalendarDays, Plane, Briefcase, Home, Mountain,
  Zap, Dog, HeartPulse, Clock, ExternalLink, Wifi, Mail,
  Smartphone, Hash, Bell, CheckCircle2, MessageCircle,
} from 'lucide-react';
import { TRANSLATIONS } from '../constants/translations';

interface Props {
  onClose: () => void;
  lang: string;
}

export const InfoPage: React.FC<Props> = ({ onClose, lang }) => {
  const t = (key: string) =>
    TRANSLATIONS[lang]?.[key] || TRANSLATIONS['nl']?.[key] || key;

  return (
    <div className="bg-slate-50 min-h-screen p-5 space-y-6 pb-10">

      {/* HEADER */}
      <header className="flex justify-between items-center py-2">
        <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-800">
          {t('manual')}
        </h2>
        <button onClick={onClose}
          className="p-2 bg-white rounded-full border border-slate-200">
          <X size={24} />
        </button>
      </header>

      {/* 1. NATIVE APP — OPSTARTEN */}
      <section className="bg-blue-600 p-6 rounded-[28px] text-white space-y-3">
        <h4 className="font-black flex items-center gap-2 uppercase text-xs tracking-[0.15em]">
          <Smartphone size={18} className="text-orange-300" />
          {t('launch_alert')}
        </h4>
        <p className="text-sm font-bold leading-relaxed">{t('launch_desc')}</p>
        <div className="bg-blue-700 rounded-2xl p-3 mt-1">
          <p className="text-xs font-bold text-blue-200 leading-relaxed">
            {t('startup_desc')}
          </p>
        </div>
      </section>

      {/* 2. WEEKPLANNING */}
      <section className="bg-orange-50 p-6 rounded-[28px] border border-orange-200 space-y-3">
        <h4 className="font-black text-orange-800 flex items-center gap-2 uppercase text-xs tracking-widest">
          <CalendarDays size={18} />
          {t('smart_help_t')}
        </h4>
        <p className="text-sm text-orange-900 font-medium leading-relaxed">
          {t('smart_help_d')}
        </p>
      </section>

      {/* 3. WAT BETEKENT 00:00 */}
      <section className="bg-white p-6 rounded-[28px] border border-slate-200 space-y-3">
        <h4 className="font-black text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest">
          <Hash size={18} className="text-orange-600" />
          {t('zero_time_t')}
        </h4>
        <p className="text-sm text-slate-600 font-medium leading-relaxed">
          {t('zero_time_d')}
        </p>
      </section>

      {/* 4. WHATSAPP INSTELLEN */}
      <section className="bg-white p-6 rounded-[28px] border border-slate-200 space-y-4">
        <h4 className="font-black text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest">
          <MessageCircle size={18} className="text-green-600" />
          {t('whatsapp_setup_t')}
        </h4>
        <p className="text-sm text-slate-600 font-medium leading-relaxed">
          {t('whatsapp_setup_d')}
        </p>
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-3">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <p className="text-xs font-black text-emerald-700 uppercase tracking-wide">
            {t('whatsapp_active')}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-green-500 rounded-2xl p-3">
          <MessageCircle size={20} className="text-white shrink-0" />
          <p className="text-xs font-black text-white uppercase tracking-wide">
            {t('whatsapp_activate')}
          </p>
        </div>
      </section>

      {/* 5. MELDING BIJ INACTIVITEIT */}
      <section className="bg-white p-6 rounded-[28px] border border-slate-200 space-y-3">
        <h4 className="font-black text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest">
          <Bell size={18} className="text-orange-600" />
          {t('notify_self_info_t')}
        </h4>
        <p className="text-sm text-slate-600 font-medium leading-relaxed">
          {t('notify_self_info_d')}
        </p>
      </section>

      {/* 6. SCENARIO'S */}
      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-2">
          <Zap size={14} />
          {t('ins_title')}
        </h3>
        {[
          { id: 1, icon: <Plane size={22} /> },
          { id: 2, icon: <Briefcase size={22} /> },
          { id: 3, icon: <Home size={22} /> },
          { id: 4, icon: <Mountain size={22} /> },
        ].map(item => (
          <div key={item.id}
            className="bg-white p-5 rounded-[24px] border border-slate-200 flex gap-4 items-start">
            <div className="bg-orange-100 p-3 rounded-2xl text-orange-600 shrink-0">
              {item.icon}
            </div>
            <div>
              <h5 className="font-black text-slate-800 text-sm uppercase italic tracking-tight">
                {t(`ins_${item.id}_t`)}
              </h5>
              <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                {t(`ins_${item.id}_d`)}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* 7. BETEKENIS */}
      <section className="bg-white p-6 rounded-[28px] border border-slate-200 space-y-3">
        <h4 className="font-black text-orange-600 flex items-center gap-2 uppercase text-xs tracking-[0.15em]">
          <Dog size={20} /> {t('barkr_mean')}
        </h4>
        <p className="text-sm text-slate-600 leading-relaxed font-medium">
          {t('barkr_desc')}
        </p>
      </section>

      {/* 8. WAAROM */}
      <section className="bg-white p-6 rounded-[28px] border border-slate-200 space-y-3">
        <h4 className="font-black text-orange-600 flex items-center gap-2 uppercase text-xs tracking-[0.15em]">
          <HeartPulse size={20} /> {t('why')}
        </h4>
        <p className="text-sm text-slate-600 leading-relaxed font-medium">
          {t('why_desc1')}
        </p>
        <p className="text-sm text-slate-600 leading-relaxed font-medium">
          {t('why_desc2')}
        </p>
      </section>

      {/* 9. HOE GEBRUIK JE BARKR */}
      <section className="bg-orange-50 p-6 rounded-[40px] border border-orange-200 space-y-5">
        <h4 className="font-black text-orange-800 flex items-center gap-2 uppercase text-xs tracking-widest">
          <Clock size={20} /> {t('how')}
        </h4>
        <div className="space-y-5">
          <div className="flex gap-4">
            <div className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs">
              1
            </div>
            <div>
              <p className="text-sm font-black text-orange-900">{t('setup')}</p>
              <p className="text-xs text-orange-800/70 leading-relaxed mt-0.5">
                {t('how_step1')}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs">
              2
            </div>
            <div>
              <p className="text-sm font-black text-orange-900">{t('week_plan')}</p>
              <p className="text-xs text-orange-800/70 leading-relaxed mt-0.5">
                {t('how_step2')}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs">
              3
            </div>
            <div>
              <p className="text-sm font-black text-orange-900">{t('deadline')}</p>
              <p className="text-xs text-orange-800/70 leading-relaxed mt-0.5">
                {t('how_step3')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. SUPPORT */}
      <section className="bg-slate-900 p-7 rounded-[40px] text-white space-y-5">
        <h4 className="font-black flex items-center gap-2 uppercase text-xs tracking-widest text-orange-400">
          <ExternalLink size={18} /> {t('info_support')}
        </h4>
        <div className="space-y-3">
          <a href="https://www.barkr.nl" target="_blank" rel="noreferrer"
            className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 active:scale-95 transition-all">
            <div className="bg-orange-600 p-2 rounded-xl">
              <Wifi size={18} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                {t('website')}
              </span>
              <span className="font-bold text-sm tracking-tight">www.barkr.nl</span>
            </div>
          </a>
          <a href="mailto:info@barkr.nl"
            className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 active:scale-95 transition-all">
            <div className="bg-blue-600 p-2 rounded-xl">
              <Mail size={18} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                {t('email')}
              </span>
              <span className="font-bold text-sm tracking-tight">info@barkr.nl</span>
            </div>
          </a>
        </div>
      </section>

      {/* SLUITKNOP SCROLLT MEE */}
      <button onClick={onClose}
        className="w-full py-5 bg-orange-600 text-white font-black uppercase rounded-[28px] tracking-widest active:scale-95 transition-all">
        {t('close')}
      </button>

    </div>
  );
};
