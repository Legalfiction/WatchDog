import React, { useState } from 'react';
import {
  X, AlertTriangle, CalendarDays, Plane, Briefcase, Home, Mountain,
  Zap, Dog, HeartPulse, Clock, ExternalLink, Wifi, Mail,
  Smartphone, Hash, Bell, CheckCircle2, MessageCircle, Shield,
  ChevronRight,
} from 'lucide-react';
import { TRANSLATIONS } from '../constants/translations';

interface Props {
  onClose: () => void;
  lang: string;
}

export const InfoPage: React.FC<Props> = ({ onClose, lang }) => {
  const [activeTab, setActiveTab] = useState<'about' | 'startup'>('about');

  const t = (key: string) =>
    TRANSLATIONS[lang]?.[key] || TRANSLATIONS['nl']?.[key] || key;

  const phones = [
    { key: 'generic', icon: '📱', color: 'bg-slate-100 border-slate-200', textColor: 'text-slate-700' },
    { key: 'samsung', icon: '🔵', color: 'bg-blue-50 border-blue-100', textColor: 'text-blue-900' },
    { key: 'xiaomi', icon: '🟠', color: 'bg-orange-50 border-orange-100', textColor: 'text-orange-900' },
    { key: 'huawei', icon: '🔴', color: 'bg-red-50 border-red-100', textColor: 'text-red-900' },
    { key: 'oppo', icon: '🟢', color: 'bg-green-50 border-green-100', textColor: 'text-green-900' },
    { key: 'pixel',    icon: '⚪', color: 'bg-slate-50 border-slate-200',   textColor: 'text-slate-700' },
    { key: 'motorola', icon: '🔷', color: 'bg-blue-50 border-blue-100',     textColor: 'text-blue-900' },
  ];

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">

      {/* VASTE HEADER */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="flex justify-between items-center px-5 py-4">
          <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-800">
            {t('manual')}
          </h2>
          <button onClick={onClose}
            className="p-2 bg-slate-100 rounded-full border border-slate-200">
            <X size={22} />
          </button>
        </div>

        {/* TABS */}
        <div className="flex px-5 pb-3 gap-2">
          <button
            onClick={() => setActiveTab('about')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
              activeTab === 'about'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}>
            {t('tab_about')}
          </button>
          <button
            onClick={() => setActiveTab('startup')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
              activeTab === 'startup'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}>
            {t('tab_startup')}
          </button>
        </div>
      </div>

      {/* SCROLLBARE INHOUD */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-10 no-scrollbar">

        {/* ================================================ */}
        {/* TAB 1: OVER BARKR                               */}
        {/* ================================================ */}
        {activeTab === 'about' && (
          <>
            {/* WAAROM BARKR — bovenaan, prominent */}
            <section className="bg-orange-600 p-6 rounded-[28px] text-white space-y-3">
              <h3 className="font-black text-lg uppercase italic tracking-tight flex items-center gap-2">
                <Shield size={22} className="text-orange-200" />
                {t('why_barkr_title')}
              </h3>
              <p className="text-sm font-medium leading-relaxed text-orange-50">
                {t('why_barkr_intro')}
              </p>
              <p className="text-sm font-medium leading-relaxed text-orange-100">
                {t('why_barkr_for')}
              </p>
            </section>

            {/* NATIVE APP INFO */}
            <section className="bg-blue-600 p-5 rounded-[24px] text-white space-y-2">
              <h4 className="font-black flex items-center gap-2 uppercase text-xs tracking-[0.15em]">
                <Smartphone size={16} className="text-blue-200" />
                {t('launch_alert')}
              </h4>
              <p className="text-sm font-medium leading-relaxed">{t('launch_desc')}</p>
            </section>

            {/* WEEKPLANNING */}
            <section className="bg-orange-50 p-5 rounded-[24px] border border-orange-200 space-y-2">
              <h4 className="font-black text-orange-800 flex items-center gap-2 uppercase text-xs tracking-widest">
                <CalendarDays size={16} /> {t('smart_help_t')}
              </h4>
              <p className="text-sm text-orange-900 font-medium leading-relaxed">{t('smart_help_d')}</p>
            </section>

            {/* 00:00 UITLEG */}
            <section className="bg-white p-5 rounded-[24px] border border-slate-200 space-y-2">
              <h4 className="font-black text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest">
                <Hash size={16} className="text-orange-600" /> {t('zero_time_t')}
              </h4>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">{t('zero_time_d')}</p>
            </section>

            {/* WHATSAPP INSTELLEN */}
            <section className="bg-white p-5 rounded-[24px] border border-slate-200 space-y-3">
              <h4 className="font-black text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest">
                <MessageCircle size={16} className="text-green-600" /> {t('whatsapp_setup_t')}
              </h4>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">{t('whatsapp_setup_d')}</p>
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wide">{t('whatsapp_active')}</p>
              </div>
            </section>

            {/* MELDING BIJ INACTIVITEIT */}
            <section className="bg-white p-5 rounded-[24px] border border-slate-200 space-y-2">
              <h4 className="font-black text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest">
                <Bell size={16} className="text-orange-600" /> {t('notify_self_info_t')}
              </h4>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">{t('notify_self_info_d')}</p>
            </section>

            {/* SCENARIO'S */}
            <section className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-2">
                <Zap size={14} /> {t('ins_title')}
              </h3>
              {[
                { id: 1, icon: <Plane size={20} /> },
                { id: 2, icon: <Briefcase size={20} /> },
                { id: 3, icon: <Home size={20} /> },
                { id: 4, icon: <Mountain size={20} /> },
              ].map(item => (
                <div key={item.id}
                  className="bg-white p-4 rounded-[22px] border border-slate-200 flex gap-3 items-start">
                  <div className="bg-orange-100 p-2.5 rounded-xl text-orange-600 shrink-0">{item.icon}</div>
                  <div>
                    <h5 className="font-black text-slate-800 text-sm uppercase italic tracking-tight">
                      {t(`ins_${item.id}_t`)}
                    </h5>
                    <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{t(`ins_${item.id}_d`)}</p>
                  </div>
                </div>
              ))}
            </section>

            {/* HOE GEBRUIK JE BARKR */}
            <section className="bg-orange-50 p-6 rounded-[32px] border border-orange-200 space-y-4">
              <h4 className="font-black text-orange-800 flex items-center gap-2 uppercase text-xs tracking-widest">
                <Clock size={18} /> {t('how')}
              </h4>
              {[
                { num: 1, title: t('setup'),     desc: t('how_step1') },
                { num: 2, title: t('week_plan'), desc: t('how_step2') },
                { num: 3, title: t('deadline'),  desc: t('how_step3') },
              ].map(step => (
                <div key={step.num} className="flex gap-3">
                  <div className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs">
                    {step.num}
                  </div>
                  <div>
                    <p className="text-sm font-black text-orange-900">{step.title}</p>
                    <p className="text-xs text-orange-800/70 leading-relaxed mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </section>

            {/* BETEKENIS */}
            <section className="bg-white p-5 rounded-[24px] border border-slate-200 space-y-2">
              <h4 className="font-black text-orange-600 flex items-center gap-2 uppercase text-xs tracking-[0.15em]">
                <Dog size={18} /> {t('barkr_mean')}
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">{t('barkr_desc')}</p>
            </section>

            {/* SUPPORT */}
            <section className="bg-slate-900 p-6 rounded-[32px] text-white space-y-4">
              <h4 className="font-black flex items-center gap-2 uppercase text-xs tracking-widest text-orange-400">
                <ExternalLink size={16} /> {t('info_support')}
              </h4>
              <div className="space-y-3">
                <a href="https://www.barkr.nl" target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 bg-slate-800 p-3.5 rounded-2xl border border-slate-700 active:scale-95 transition-all">
                  <div className="bg-orange-600 p-2 rounded-xl"><Wifi size={16} className="text-white" /></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{t('website')}</span>
                    <span className="font-bold text-sm">www.barkr.nl</span>
                  </div>
                </a>
                <a href="mailto:info@barkr.nl"
                  className="flex items-center gap-3 bg-slate-800 p-3.5 rounded-2xl border border-slate-700 active:scale-95 transition-all">
                  <div className="bg-blue-600 p-2 rounded-xl"><Mail size={16} className="text-white" /></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{t('email')}</span>
                    <span className="font-bold text-sm">info@barkr.nl</span>
                  </div>
                </a>
              </div>
            </section>
          </>
        )}

        {/* ================================================ */}
        {/* TAB 2: OPSTARTGIDS                              */}
        {/* ================================================ */}
        {activeTab === 'startup' && (
          <>
            <section className="bg-blue-600 p-5 rounded-[24px] text-white space-y-2">
              <h3 className="font-black text-base uppercase italic tracking-tight flex items-center gap-2">
                <Smartphone size={20} className="text-blue-200" />
                {t('startup_guide_title')}
              </h3>
              <p className="text-sm font-medium leading-relaxed text-blue-100">
                {t('startup_guide_intro')}
              </p>
            </section>

            {phones.map(phone => (
              <section key={phone.key}
                className={`p-5 rounded-[24px] border space-y-2 ${phone.color}`}>
                <h4 className={`font-black text-sm flex items-center gap-2 ${phone.textColor}`}>
                  <span className="text-lg">{phone.icon}</span>
                  {t(`startup_${phone.key}_title`)}
                </h4>
                <p className={`text-sm font-medium leading-relaxed ${phone.textColor} opacity-80`}>
                  {t(`startup_${phone.key}_desc`)}
                </p>
              </section>
            ))}

            {/* SLOTOPMERKING */}
            <section className="bg-amber-50 p-5 rounded-[24px] border border-amber-200 space-y-2">
              <h4 className="font-black text-amber-800 flex items-center gap-2 uppercase text-xs tracking-widest">
                <AlertTriangle size={16} className="text-amber-600" />
                Let op
              </h4>
              <p className="text-sm text-amber-900 font-medium leading-relaxed">
                {t('startup_note')}
              </p>
            </section>
          </>
        )}

        {/* SLUITKNOP SCROLLT MEE */}
        <button onClick={onClose}
          className="w-full py-5 bg-orange-600 text-white font-black uppercase rounded-[28px] tracking-widest active:scale-95 transition-all">
          {t('close')}
        </button>

      </div>
    </div>
  );
};
