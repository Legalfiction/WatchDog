import React from 'react';
import { X, Clock } from 'lucide-react';

export const WeekPlanPage = ({ lang, t, days, schedules, onUpdate, onClose, onSave }: any) => (
  <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end p-4">
    <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 space-y-6 overflow-y-auto no-scrollbar shadow-2xl">
      <div className="flex justify-between items-start">
        <h2 className="text-2xl font-black italic tracking-tighter uppercase">{t('week_plan', lang)}</h2>
        <button onClick={onClose} className="bg-slate-100 p-2 rounded-full text-slate-300"><X size={20}/></button>
      </div>
      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100"><p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{t('week_plan_desc', lang)}</p></div>
      <div className="space-y-3">
        {days.map((d: string, i: number) => (
          <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="font-black text-slate-600 text-[10px] uppercase w-20">{d}</span>
            <div className="flex gap-2 items-center">
              <input type="time" value={schedules[i].startTime} onChange={e => onUpdate(i, 'startTime', e.target.value)} className="bg-white p-2 rounded-lg font-black text-xs shadow-sm border-none" />
              <span className="text-slate-300 font-black">-</span>
              <input type="time" value={schedules[i].endTime} onChange={e => onUpdate(i, 'endTime', e.target.value)} className="bg-white p-2 rounded-lg font-black text-xs text-[#f26522] shadow-sm border-none" />
            </div>
          </div>
        ))}
      </div>
      <button onClick={onSave} className="w-full bg-[#f26522] text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl text-xs">{t('save', lang)}</button>
    </div>
  </div>
);
