import React from 'react';
import { X } from 'lucide-react';

interface WeekPlanPageProps {
  onClose: () => void;
  settings: any;
  setSettings: (s: any) => void;
  lang: string;
  daysVoluit: string[];
  t: (key: string, lang: string) => string;
}

export default function WeekPlanPage({ onClose, settings, setSettings, lang, daysVoluit, t }: WeekPlanPageProps) {
  return (
    <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20 no-scrollbar">
      <header className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800">{t('week_plan', lang)}</h2>
        <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm"><X size={24}/></button>
      </header>
      <p className="text-sm font-medium text-slate-600 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm leading-relaxed">
        {t('week_plan_desc', lang)}
      </p>
      <div className="space-y-3">
        {daysVoluit.map((dayName: string, d: number) => (
          <div key={d} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="w-24 text-[11px] font-black text-slate-700 uppercase">{dayName}</span>
            <input type="time" value={settings.schedules[d]?.startTime || '06:00'} onChange={e => {const s={...settings.schedules}; s[d].startTime=e.target.value; setSettings({...settings, schedules:s})}} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2 text-xs font-black text-center outline-none"/>
            <input type="time" value={settings.schedules[d]?.endTime || '10:00'} onChange={e => {const s={...settings.schedules}; s[d].endTime=e.target.value; setSettings({...settings, schedules:s})}} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2 text-xs font-black text-red-600 text-center outline-none"/>
          </div>
        ))}
      </div>
      <button onClick={onClose} className="w-full py-5 bg-orange-600 text-white font-black uppercase rounded-[28px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all">{t('save', lang)}</button>
    </div>
  );
}
