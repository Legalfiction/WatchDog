import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, Plus, Trash2, X, Activity, ShieldCheck, Dog,
  Clock, Info, ChevronDown, Wifi, MessageCircle, CheckCircle2,
  Bell, AlertCircle,
} from 'lucide-react';

import { TRANSLATIONS } from './constants/translations';
import { COUNTRIES } from './constants/countries';
import { InfoPage } from './components/InfoPage';

const ENDPOINTS  = ['https://barkr.nl', 'http://192.168.1.38:5000'];
const APP_KEY    = 'BARKR_SECURE_V1';
const EMPTY_TIME = '00:00';

// Declareer de Android bridge interface
declare global {
  interface Window {
    BarkrAndroid?: {
      updateSettings: (json: string) => void;
      getSettings: () => string;
    };
  }
}

const getLocalYYYYMMDD = (d: Date) => {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const t = (key: string, lang: string) =>
  TRANSLATIONS[lang]?.[key] || TRANSLATIONS['nl']?.[key] || key;

const defaultSchedules: any = {};
for (let i = 0; i < 7; i++) {
  defaultSchedules[i] = { startTime: EMPTY_TIME, endTime: EMPTY_TIME };
}

// Stuur instellingen naar Android SharedPreferences via de bridge
// De BarkrService leest deze voor elke ping
const syncToAndroid = (name: string, windowStart: string, windowEnd: string, vacationMode: boolean) => {
  if (window.BarkrAndroid) {
    const payload = JSON.stringify({
      name,
      window_start:  windowStart,
      window_end:    windowEnd,
      vacation_mode: vacationMode,
    });
    window.BarkrAndroid.updateSettings(payload);
    console.log('✅ Bridge sync:', name, windowStart, windowEnd);
  }
};

export default function App() {
  const [activeUrl,    setActiveUrl]    = useState<string | null>(null);
  const [status,       setStatus]       = useState<'searching' | 'connected' | 'offline'>('searching');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual,   setShowManual]   = useState(false);
  const [showWeekPlan, setShowWeekPlan] = useState(false);
  const [lastPing,     setLastPing]     = useState('--:--');
  const [optInStatus,  setOptInStatus]  = useState<Record<string, 'unknown' | 'pending' | 'opted_in'>>({});
  const [phoneError,   setPhoneError]   = useState(false);

  const now         = new Date();
  const todayStr    = getLocalYYYYMMDD(now);
  const todayIdx    = (now.getDay() + 6) % 7;
  const tomorrow    = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalYYYYMMDD(tomorrow);
  const tomorrowIdx = (tomorrow.getDay() + 6) % 7;

  const [activeTab, setActiveTab] = useState<'base' | 'today' | 'tomorrow'>(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.overrides && parsed.overrides[todayStr])    return 'today';
      if (parsed.overrides && parsed.overrides[tomorrowStr]) return 'tomorrow';
    }
    return 'base';
  });

  const [settings, setSettings] = useState(() => {
    const saved  = localStorage.getItem('barkr_v16_data');
    const parsed = saved ? JSON.parse(saved) : {};
    let defaultCountry = 'NL';
    if (parsed.country && COUNTRIES[parsed.country])        defaultCountry = parsed.country;
    else if (parsed.language && COUNTRIES[parsed.language]) defaultCountry = parsed.language;
    return {
      name:         parsed.name         || '',
      vacationMode: parsed.vacationMode || false,
      country:      defaultCountry,
      overrides:    parsed.overrides    || {},
      contacts:     parsed.contacts     || [],
      schedules:    (parsed.schedules && Object.keys(parsed.schedules).length > 0)
                      ? parsed.schedules : defaultSchedules,
      ownPhone:     parsed.ownPhone     || '',
      notifySelf:   parsed.notifySelf   !== undefined ? parsed.notifySelf : true,
    };
  });

  const countryObj = COUNTRIES[settings.country] || COUNTRIES['NL'];
  const lang       = countryObj?.lang || 'nl';
  const daysVoluit = countryObj?.days || ['Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag','Zondag'];

  const isBase        = activeTab === 'base';
  const activeDateStr = activeTab === 'today' ? todayStr   : tomorrowStr;
  const activeDayIdx  = activeTab === 'today' ? todayIdx   : tomorrowIdx;

  let displayStart = settings.schedules[todayIdx]?.startTime || EMPTY_TIME;
  let displayEnd   = settings.schedules[todayIdx]?.endTime   || EMPTY_TIME;
  if (!isBase && settings.overrides[activeDateStr]) {
    displayStart = settings.overrides[activeDateStr].start;
    displayEnd   = settings.overrides[activeDateStr].end;
  }

  const todaySchedule    = settings.schedules[todayIdx];
  const todayOverride    = settings.overrides[todayStr];
  const todayWindowStart = todayOverride ? todayOverride.start : todaySchedule?.startTime;
  const todayWindowEnd   = todayOverride ? todayOverride.end   : todaySchedule?.endTime;
  const todayHasWindow   = todayWindowStart !== EMPTY_TIME && todayWindowEnd !== EMPTY_TIME;
  const todayIsActive    = todaySchedule &&
    todaySchedule.startTime !== EMPTY_TIME && todaySchedule.endTime !== EMPTY_TIME;

  // Sync naar Android bridge bij elke relevante wijziging
  useEffect(() => {
    syncToAndroid(
      settings.name,
      todayWindowStart || EMPTY_TIME,
      todayWindowEnd   || EMPTY_TIME,
      settings.vacationMode
    );
  }, [settings.name, todayWindowStart, todayWindowEnd, settings.vacationMode]);

  // Opt-in check
  const checkOptIn = useCallback(async (phone: string) => {
    if (!activeUrl || !phone || phone.length < 6) return;
    try {
      const res = await fetch(`${activeUrl}/check_optin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_key: APP_KEY, phone }),
      });
      const data = await res.json();
      setOptInStatus(prev => ({ ...prev, [phone]: data.opted_in ? 'opted_in' : 'pending' }));
    } catch (e) {}
  }, [activeUrl]);

  useEffect(() => {
    if (!activeUrl) return;
    settings.contacts.forEach((c: any) => { if (c.phone) checkOptIn(c.phone); });
  }, [activeUrl]);

  const sendOptIn = async (phone: string, contactName: string) => {
    if (!activeUrl) return;
    setOptInStatus(prev => ({ ...prev, [phone]: 'unknown' }));
    try {
      const res = await fetch(`${activeUrl}/send_optin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_key: APP_KEY, phone,
          contact_name: contactName,
          user_name:    settings.name,
          user_phone:   settings.ownPhone,
        }),
      });
      const data = await res.json();
      if (data.status === 'sent') setOptInStatus(prev => ({ ...prev, [phone]: 'opted_in' }));
    } catch (e) {
      setOptInStatus(prev => ({ ...prev, [phone]: 'pending' }));
    }
  };

  // Overrides vervallen
  useEffect(() => {
    const interval = setInterval(() => {
      const d    = new Date();
      const dStr = getLocalYYYYMMDD(d);
      const tStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      setSettings((prev: any) => {
        if (prev.overrides && prev.overrides[dStr] && tStr > prev.overrides[dStr].end) {
          const newOverrides = { ...prev.overrides };
          delete newOverrides[dStr];
          if (activeTab === 'today') setActiveTab('base');
          return { ...prev, overrides: newOverrides };
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Instellingen opslaan naar server
  useEffect(() => {
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
    if (!activeUrl) return;

    const payload: any = { ...settings };
    payload.app_key           = APP_KEY;
    payload.useCustomSchedule = true;
    payload.activeDays        = [0,1,2,3,4,5,6];
    payload.schedules         = JSON.parse(JSON.stringify(settings.schedules));
    payload.notifySelf        = settings.notifySelf;
    payload.ownPhone          = settings.ownPhone;

    if (settings.overrides[todayStr]) {
      payload.schedules[todayIdx] = {
        startTime: settings.overrides[todayStr].start,
        endTime:   settings.overrides[todayStr].end,
      };
    }
    if (settings.overrides[tomorrowStr]) {
      payload.schedules[tomorrowIdx] = {
        startTime: settings.overrides[tomorrowStr].start,
        endTime:   settings.overrides[tomorrowStr].end,
      };
    }

    const timer = setTimeout(() => {
      fetch(`${activeUrl}/save_settings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [settings, activeUrl, todayStr, todayIdx, tomorrowStr, tomorrowIdx]);

  // Endpoint detectie
  const findConnection = useCallback(async () => {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) { setActiveUrl(url); setStatus('connected'); return; }
      } catch (e) {}
    }
    setStatus('offline');
  }, []);

  useEffect(() => {
    findConnection();
    const interval = setInterval(findConnection, 5000);
    return () => clearInterval(interval);
  }, [findConnection]);

  // Ping vanuit WebView (als app op voorgrond is)
  useEffect(() => {
    if (status !== 'connected' || !activeUrl || settings.vacationMode) return;

    const sendPing = () => {
      if (document.visibilityState !== 'visible') return;
      if (!todayHasWindow) return;

      // Sync ook naar bridge bij elke ping
      syncToAndroid(settings.name, todayWindowStart || EMPTY_TIME, todayWindowEnd || EMPTY_TIME, false);

      fetch(`${activeUrl}/ping`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settings.name, app_key: APP_KEY,
          active_window: { start: todayWindowStart, end: todayWindowEnd },
        }),
      }).then(res => {
        if (res.ok) setLastPing(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }).catch(() => {});
    };

    if (document.visibilityState === 'visible') sendPing();
    const pingInterval = setInterval(sendPing, 5000);
    const handleVis = () => { if (document.visibilityState === 'visible') sendPing(); };
    document.addEventListener('visibilitychange', handleVis);
    return () => { clearInterval(pingInterval); document.removeEventListener('visibilitychange', handleVis); };
  }, [status, activeUrl, settings.vacationMode, settings.name, todayHasWindow, todayWindowStart, todayWindowEnd]);

  // Override beheer
  const toggleOverride = (type: 'today' | 'tomorrow') => {
    if (activeTab === type) {
      setActiveTab('base');
      const newOverrides = { ...settings.overrides };
      delete newOverrides[type === 'today' ? todayStr : tomorrowStr];
      setSettings({ ...settings, overrides: newOverrides });
    } else {
      setActiveTab(type);
      const targetStr = type === 'today' ? todayStr : tomorrowStr;
      if (!settings.overrides[targetStr]) {
        setSettings({ ...settings, overrides: { ...settings.overrides, [targetStr]: { start: EMPTY_TIME, end: EMPTY_TIME } } });
      }
    }
  };

  const updateOverrideTime = (field: 'start' | 'end', value: string) => {
    let currentTab = activeTab;
    if (currentTab === 'base') { currentTab = 'today'; setActiveTab('today'); }
    const dateStr = currentTab === 'today' ? todayStr : tomorrowStr;
    const newOverrides = { ...settings.overrides };
    if (!newOverrides[dateStr]) newOverrides[dateStr] = { start: EMPTY_TIME, end: EMPTY_TIME };
    newOverrides[dateStr][field] = value;
    setSettings({ ...settings, overrides: newOverrides });
  };

  const handleSaveSettings = () => {
    if (!settings.ownPhone || settings.ownPhone.length < 8) {
      setPhoneError(true);
      return;
    }
    setPhoneError(false);
    setShowSettings(false);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col overflow-hidden">
      <style>{`
        @keyframes bounce-zz { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-15px); opacity: 1; } }
        .animate-zz { animation: bounce-zz 2.5s infinite ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        * { box-shadow: none !important; text-shadow: none !important; }
      `}</style>

      {/* HEADER */}
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg"><Dog size={20} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-black italic tracking-tighter text-slate-800 uppercase">Barkr</h1>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
              <div className={`w-2 h-2 rounded-full ${
                status === 'connected' ? settings.vacationMode ? 'bg-blue-500' : todayHasWindow ? 'bg-emerald-500' : 'bg-amber-400' : 'bg-red-500'
              }`} />
              <span className={status === 'connected' ? settings.vacationMode ? 'text-blue-600' : todayHasWindow ? 'text-emerald-600' : 'text-amber-600' : 'text-red-500'}>
                {status === 'offline' ? t('offline', lang) : status === 'searching' ? '...' :
                 settings.vacationMode ? t('idle', lang) : todayHasWindow ? t('vigilant', lang) : t('no_window', lang)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="p-2.5 bg-slate-100 rounded-xl"><Info size={20} className="text-slate-600" /></button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl"><Settings size={20} className="text-slate-600" /></button>
        </div>
      </header>

      {/* HOOFDSCHERM */}
      {!showSettings && !showManual && !showWeekPlan && (
        <main className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">

          {!settings.ownPhone && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0" />
              <p className="text-xs font-bold text-amber-800">
                {t('own_phone_required', lang)} —{' '}
                <button onClick={() => setShowSettings(true)} className="underline">{t('setup', lang)}</button>
              </p>
            </div>
          )}

          <div className="flex flex-col items-center pt-2">
            <button
              onClick={() => setSettings({ ...settings, vacationMode: !settings.vacationMode })}
              disabled={status !== 'connected'}
              className={`relative w-64 h-64 rounded-full flex flex-col items-center justify-center transition-all duration-500 overflow-hidden border-[8px] ${
                status !== 'connected' ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                : settings.vacationMode ? 'bg-slate-900 border-slate-700' : 'bg-orange-600 border-orange-700'
              }`}>
              {status !== 'connected' ? <Wifi size={60} className="text-slate-400 animate-pulse" />
              : settings.vacationMode ? (
                <div className="flex flex-col items-center justify-center relative w-full h-full">
                  <div className="absolute top-12 right-16 flex font-black text-blue-300 pointer-events-none z-10">
                    <span className="text-3xl animate-zz">Z</span><span className="text-2xl animate-zz ml-1">z</span><span className="text-xl animate-zz ml-1">z</span>
                  </div>
                  <img src="/logo.png" alt="Barkr" className="w-full h-full object-cover scale-[1.02] opacity-40 grayscale" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full relative">
                  <img src="/logo.png" alt="Barkr" className="w-full h-full object-cover scale-[1.02]" />
                  <div className="absolute bottom-5 inset-x-0 text-center">
                    <span className="text-[10px] font-black uppercase text-white tracking-widest px-4 italic">{t('tap_sleep', lang)}</span>
                  </div>
                </div>
              )}
            </button>

            <div className="mt-4 w-full bg-white px-6 py-3 rounded-[20px] border border-slate-100 text-center flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={14} className="text-slate-400" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {todayHasWindow ? t('heartbeat', lang) : t('last_check', lang)}
                </p>
              </div>
              <p className="text-sm font-black text-slate-800 tabular-nums">{todayHasWindow ? lastPing : '—'}</p>
            </div>
          </div>

          <section className="bg-white rounded-[24px] border border-slate-100 overflow-hidden">
            <header className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-orange-600" />
                <h3 className="font-black text-[10px] uppercase tracking-tight text-slate-800">{t('week_plan', lang)}</h3>
              </div>
              <button onClick={() => setShowWeekPlan(true)} className="text-[9px] font-black px-3 py-1.5 rounded-full bg-slate-800 text-white">
                {t('week_plan', lang).toUpperCase()}
              </button>
            </header>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <button onClick={() => toggleOverride('today')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border ${activeTab === 'today' ? 'bg-orange-600 border-orange-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  {t('today', lang)}
                </button>
                <button onClick={() => toggleOverride('tomorrow')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border ${activeTab === 'tomorrow' ? 'bg-orange-600 border-orange-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  {t('tomorrow', lang)}
                </button>
              </div>
              <div className={`border rounded-xl p-3 ${!isBase ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">{t('start', lang)}</label>
                    <input type="time" value={displayStart} onChange={e => updateOverrideTime('start', e.target.value)}
                      className={`w-full border rounded-lg p-3 text-xl font-black text-center outline-none ${!isBase ? 'bg-white border-orange-200 text-orange-900' : 'bg-white border-slate-200 text-slate-700'}`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-red-400 uppercase ml-1">{t('deadline', lang)}</label>
                    <input type="time" value={displayEnd} onChange={e => updateOverrideTime('end', e.target.value)}
                      className={`w-full border rounded-lg p-3 text-xl font-black text-center outline-none ${!isBase ? 'bg-white border-orange-200 text-red-600' : 'bg-white border-slate-200 text-red-600'}`} />
                  </div>
                </div>
                <p className={`text-[8px] font-black uppercase tracking-widest text-center mt-3 ${!isBase ? 'text-orange-600' : 'text-slate-400'}`}>
                  {isBase ? (todayIsActive ? t('base_active', lang) : t('no_schedule_hint', lang))
                    : `${t('planning_for', lang)} ${activeTab === 'today' ? t('today', lang) : t('tomorrow', lang)} (${daysVoluit[activeDayIdx]})`}
                </p>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* WEEKPLANNING */}
      {showWeekPlan && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20 no-scrollbar">
          <header className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800">{t('week_plan', lang)}</h2>
            <button onClick={() => setShowWeekPlan(false)} className="p-2 bg-white rounded-full border border-slate-200"><X size={24} /></button>
          </header>
          <p className="text-xs font-medium text-slate-500 bg-orange-50 border border-orange-100 rounded-2xl p-4 leading-relaxed">{t('week_plan_desc', lang)}</p>
          <div className="space-y-3">
            {daysVoluit.map((dayName: string, d: number) => {
              const sched = settings.schedules[d] || { startTime: EMPTY_TIME, endTime: EMPTY_TIME };
              const isInactive = sched.startTime === EMPTY_TIME && sched.endTime === EMPTY_TIME;
              return (
                <div key={d} className={`flex items-center gap-3 p-4 rounded-2xl border ${isInactive ? 'bg-slate-50 border-slate-200' : 'bg-white border-orange-100'}`}>
                  <span className={`w-24 text-[11px] font-black uppercase ${isInactive ? 'text-slate-400' : 'text-slate-700'}`}>{dayName}</span>
                  <input type="time" value={sched.startTime}
                    onChange={e => setSettings({ ...settings, schedules: { ...settings.schedules, [d]: { ...sched, startTime: e.target.value } } })}
                    className={`flex-1 border rounded-lg py-2 text-sm font-black text-center outline-none ${isInactive ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-white border-orange-200 text-orange-900'}`} />
                  <input type="time" value={sched.endTime}
                    onChange={e => setSettings({ ...settings, schedules: { ...settings.schedules, [d]: { ...sched, endTime: e.target.value } } })}
                    className={`flex-1 border rounded-lg py-2 text-sm font-black text-center outline-none ${isInactive ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-white border-orange-200 text-red-600'}`} />
                </div>
              );
            })}
          </div>
          <button onClick={() => setShowWeekPlan(false)} className="w-full py-5 bg-orange-600 text-white font-black uppercase rounded-[28px] tracking-[0.2em]">{t('save', lang)}</button>
        </div>
      )}

      {/* INFO */}
      {showManual && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto no-scrollbar">
          <InfoPage onClose={() => setShowManual(false)} lang={lang} />
        </div>
      )}

      {/* INSTELLINGEN */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20 no-scrollbar">
          <header className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">{t('setup', lang)}</h2>
            <button onClick={() => setShowSettings(false)} className="p-2 bg-white rounded-full border border-slate-200"><X size={20} /></button>
          </header>

          {/* EIGEN NUMMER — verplicht */}
          <div className={`p-5 rounded-2xl border space-y-3 ${phoneError ? 'bg-red-50 border-red-300' : 'bg-orange-50 border-orange-200'}`}>
            <div className="flex items-center gap-2">
              <Bell size={18} className={phoneError ? 'text-red-600' : 'text-orange-600'} />
              <div>
                <p className={`text-sm font-black ${phoneError ? 'text-red-800' : 'text-orange-900'}`}>{t('own_phone_label', lang)}</p>
                <p className={`text-[10px] font-medium mt-0.5 ${phoneError ? 'text-red-700' : 'text-orange-700'}`}>
                  {phoneError ? t('own_phone_required', lang) : t('own_phone_hint', lang)}
                </p>
              </div>
            </div>
            <input
              value={settings.ownPhone}
              onChange={e => { setSettings({ ...settings, ownPhone: e.target.value }); setPhoneError(false); }}
              placeholder={t('own_phone_placeholder', lang)}
              className={`w-full border rounded-xl p-3 text-sm font-mono outline-none ${phoneError ? 'bg-white border-red-300 text-red-700' : 'bg-white border-orange-200 text-slate-700'}`} />
            <div className="flex items-center justify-between pt-1 border-t border-orange-200">
              <div>
                <p className="text-xs font-black text-orange-900">{t('notify_self_label', lang)}</p>
                <p className="text-[10px] text-orange-700 font-medium mt-0.5">{t('notify_self_desc', lang)}</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, notifySelf: !settings.notifySelf })}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 shrink-0 ml-3 ${settings.notifySelf ? 'bg-orange-600' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ${settings.notifySelf ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          {/* NAAM & LAND */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">{t('country', lang)}</label>
              <select value={settings.country} onChange={e => setSettings({ ...settings, country: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-slate-700 appearance-none outline-none">
                {Object.keys(COUNTRIES).map(key => (
                  <option key={key} value={key}>{COUNTRIES[key].flag} {COUNTRIES[key].name} ({COUNTRIES[key].prefix})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-8 text-slate-400 pointer-events-none" size={18} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">{t('user_name', lang)}</label>
              <input value={settings.name} onChange={e => setSettings({ ...settings, name: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700" />
            </div>
          </div>

          {/* CONTACTEN */}
          <div>
            <label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block mb-2 px-1">{t('contacts', lang)}</label>
            <button onClick={() => setSettings({ ...settings, contacts: [...settings.contacts, { name: '', phone: COUNTRIES[settings.country]?.prefix || '' }] })}
              className="w-full bg-orange-600 text-white p-3 rounded-xl flex justify-center mb-4"><Plus size={20} /></button>
            <div className="space-y-4">
              {settings.contacts.map((c: any, i: number) => {
                const phone = c.phone || '';
                const optin = phone ? (optInStatus[phone] || 'unknown') : 'unknown';
                return (
                  <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 relative space-y-4">
                    <button onClick={() => { const n = [...settings.contacts]; n.splice(i, 1); setSettings({ ...settings, contacts: n }); }}
                      className="absolute top-4 right-4 text-slate-300"><Trash2 size={18} /></button>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">{t('c_name', lang)}</label>
                      <input placeholder={t('c_name', lang)} value={c.name}
                        onChange={e => { const n = [...settings.contacts]; n[i].name = e.target.value; setSettings({ ...settings, contacts: n }); }}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">{t('c_phone', lang)}</label>
                      <input value={c.phone}
                        onChange={e => { const n = [...settings.contacts]; n[i].phone = e.target.value; setSettings({ ...settings, contacts: n }); if (e.target.value.length >= 8) checkOptIn(e.target.value); }}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-mono text-slate-600 outline-none" />
                    </div>
                    {phone && phone.length >= 8 && (
                      optin === 'opted_in' ? (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <p className="text-[10px] font-black text-emerald-700 uppercase">{t('whatsapp_active', lang)}</p>
                        </div>
                      ) : optin === 'pending' ? (
                        <button onClick={() => sendOptIn(phone, c.name || 'Contact')}
                          className="w-full bg-green-500 text-white text-[11px] font-black py-3 rounded-xl flex items-center justify-center gap-2">
                          <MessageCircle size={16} /> {t('whatsapp_activate', lang)}
                        </button>
                      ) : null
                    )}
                    <button onClick={() => activeUrl && fetch(`${activeUrl}/test_contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })}
                      className="w-full bg-emerald-50 text-emerald-600 text-[10px] font-black py-2 rounded-lg border border-emerald-100 flex items-center justify-center gap-2">
                      <ShieldCheck size={14} /> {t('test', lang)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={handleSaveSettings} className="w-full py-5 bg-slate-900 text-white font-black uppercase rounded-[28px] tracking-[0.2em]">
            {t('save', lang)}
          </button>
        </div>
      )}
    </div>
  );
}
