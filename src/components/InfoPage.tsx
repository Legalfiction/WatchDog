import React from 'react';
import { X, AlertTriangle, CalendarDays, Plane, Briefcase, Home, Mountain, Zap, Dog, HeartPulse, Clock, ExternalLink, Wifi, Mail } from 'lucide-react';
import { TRANSLATIONS } from '../constants/translations';

interface Props {
  onClose: () => void;
  lang: string;
}

export const InfoPage: React.FC<Props> = ({ onClose, lang }) => {
  const t = (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['nl']?.[key] || key;

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-8 pb-10">

      <header className="flex justify-between items-center py-2">
        <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-800">
          {t('manual')}
        </h2>
        <button onClick={onClose} className="p-2 bg-white rounded-full border border-slate-200">
          <X size={24} />
        </button>
      </header>

      {/* OPSTARTMELDING */}
      <section className="bg-blue-600 p-6 rounded-[32px] text-white space-y-3">
        <h4 className="font-black flex items-center gap-2 uppercase text-xs tracking-[0.15em]">
          <AlertTriangle size={18} className="text-orange-400" />
          {t('launch_alert')}
        </h4>
        <p className="text-sm font-bold">{t('launch_desc')}</p>
      </section>

      {/* WEEKPLANNING UITLEG */}
      <section className="bg-orange-50 p-6 rounded-3xl border border-orange-200 space-y-3">
        <h4 className="font-black text-orange-800 flex items-center gap-2 uppercase text-xs tracking-widest">
          <CalendarDays size={18} />
          {t('smart_help_t')}
        </h4>
        <p className="text-sm text-orange-900 leading-relaxed font-medium">{t('smart_help_d')}</p>
      </section>

      {/* SCENARIO'S */}
      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-2">
          <Zap size={14} />
          {t('ins_title')}
        </h3>
        <div className="space-y-3">
          {[
            { id: 1, icon: <Plane size={24} /> },
            { id: 2, icon: <Briefcase size={24} /> },
            { id: 3, icon: <Home size={24} /> },
            { id: 4, icon: <Mountain size={24} /> },
          ].map(item => (
            <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-200 flex gap-4 items-start">
              <div className="bg-orange-100 p-3 rounded-2xl text-orange-600">
                {item.icon}
              </div>
              <div>
                <h5 className="font-black text-slate-800 text-sm uppercase italic tracking-tight">
                  {t(`ins_${item.id}_t`)}
                </h5>
                <p className="text-xs text-slate-500 leading-relaxed">{t(`ins_${item.id}_d`)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BETEKENIS */}
      <section className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
        <h4 className="font-black text-orange-600 flex items-center gap-2 uppercase text-xs tracking-[0.15em]">
          <Dog size={20} /> {t('barkr_mean')}
        </h4>
        <p className="text-sm text-slate-600 leading-relaxed font-medium">{t('barkr_desc')}</p>
      </section>

      {/* WAAROM */}
      <section className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
        <h4 className="font-black text-orange-600 flex items-center gap-2 uppercase text-xs tracking-[0.15em]">
          <HeartPulse size={20} /> {t('why')}
        </h4>
        <div className="space-y-2">
          <p className="text-sm text-slate-600 leading-relaxed font-medium">{t('why_desc1')}</p>
          <p className="text-sm text-slate-600 leading-relaxed font-medium">{t('why_desc2')}</p>
        </div>
      </section>

      {/* HOE */}
      <section className="bg-orange-50 p-7 rounded-[40px] border border-orange-200 space-y-5">
        <h4 className="font-black text-orange-800 flex items-center gap-2 uppercase text-xs tracking-widest">
          <Clock size={20} /> {t('how')}
        </h4>
        <div className="space-y-4 font-medium">
          <div className="flex gap-4">
            <div className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs">1</div>
            <div>
              <p className="text-sm font-bold text-orange-900">{t('setup')}</p>
              <p className="text-xs text-orange-800/70 leading-relaxed">{t('how_step1')}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs">2</div>
            <div>
              <p className="text-sm font-bold text-orange-900">{t('vigilant')}</p>
              <p className="text-xs text-orange-800/70 leading-relaxed">{t('how_step2')}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs">3</div>
            <div>
              <p className="text-sm font-bold text-orange-900">{t('deadline')}</p>
              <p className="text-xs text-orange-800/70 leading-relaxed">{t('how_step3')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* SUPPORT */}
      <section className="bg-slate-900 p-8 rounded-[40px] text-white space-y-6">
        <h4 className="font-black flex items-center gap-2 uppercase text-xs tracking-widest text-orange-400">
          <ExternalLink size={18} /> {t('info_support')}
        </h4>
        <div className="space-y-4">
          <a href="https://www.barkr.nl" target="_blank" rel="noreferrer"
            className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 active:scale-95 transition-all">
            <div className="bg-orange-600 p-2 rounded-xl"><Wifi size={18} className="text-white" /></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t('website')}</span>
              <span className="font-bold text-sm tracking-tight">www.barkr.nl</span>
            </div>
          </a>
          <a href="mailto:info@barkr.nl"
            className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 active:scale-95 transition-all">
            <div className="bg-blue-600 p-2 rounded-xl"><Mail size={18} className="text-white" /></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t('email')}</span>
              <span className="font-bold text-sm tracking-tight">info@barkr.nl</span>
            </div>
          </a>
        </div>
      </section>

      {/* SLUITKNOP SCROLLT MEE — niet fixed/sticky */}
      <button onClick={onClose}
        className="w-full py-5 bg-orange-600 text-white font-black uppercase rounded-3xl tracking-widest active:scale-95 transition-all mt-4">
        {t('close')}
      </button>

    </div>
  );
};
