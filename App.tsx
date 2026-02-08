
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Smartphone,
  X,
  Trash2,
  Plus,
  User,
  Battery,
  Plane,
  History,
  Zap,
  Clock,
  Globe,
  HelpCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Share2,
  MessageCircle,
  Dog,
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import { UserSettings, EmergencyContact, ActivityLog } from './types';

const VERSION = '8.5.3';
const DEFAULT_URL = 'https://inspector-basket-cause-favor.trycloudflare.com';
const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [lastSuccessTime, setLastSuccessTime] = useState<string | null>(localStorage.getItem('safeguard_last_success'));
  const [piStatus, setPiStatus] = useState<'online' | 'offline' | 'checking' | 'error'>('checking');
  const [isProcessing, setIsProcessing] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [history, setHistory] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('safeguard_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('safeguard_server_url') || DEFAULT_URL);
  const lastTriggerRef = useRef<number>(0);
  
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('safeguard_settings');
    // Standaard alle 7 dagen actief om verwarring over rustdagen te voorkomen
    return saved ? JSON.parse(saved) : { 
      email: '', 
      startTime: '07:00', 
      endTime: '08:30', 
      contacts: [],
      vacationMode: false,
      activeDays: [0, 1, 2, 3, 4, 5, 6] 
    };
  });

  const getDaySummary = () => {
    if (settings.activeDays.length === 7) return "Elke dag";
    if (settings.activeDays.length === 5 && !settings.activeDays.includes(5) && !settings.activeDays.includes(6)) return "Maandag t/m Vrijdag";
    if (settings.activeDays.length === 0) return "Geen actieve dagen";
    return settings.activeDays.sort((a,b) => a-b).map(d => DAYS[d]).join(', ');
  };

  const isTodayActive = () => {
    const jsDay = new Date().getDay(); 
    const pyDay = (jsDay + 6) % 7; 
    return settings.activeDays.includes(pyDay);
  };

  const updateHistory = (timeStr: string, batt: number | null) => {
    const newLog = { timestamp: Date.now(), timeStr, battery: batt || undefined };
    const updated = [newLog, ...history].slice(0, 7);
    setHistory(updated);
    setLastSuccessTime(timeStr);
    localStorage.setItem('safeguard_history', JSON.stringify(updated));
    localStorage.setItem('safeguard_last_success', timeStr);
  };

  const getBattery = async () => {
    try {
      if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        const batt: any = await (navigator as any).getBattery();
        const level = Math.round(batt.level * 100);
        setBatteryLevel(level);
        return level;
      }
    } catch (e) {}
    return null;
  };

  const getCleanUrl = useCallback((urlInput?: string) => {
    let url = (urlInput || serverUrl).trim().replace(/\s/g, '');
    if (!url) return '';
    if (!url.startsWith('http')) url = `https://${url}`;
    return url.replace(/\/$/, '');
  }, [serverUrl]);

  const triggerCheckin = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastTriggerRef.current < 60000) return; 

    const url = getCleanUrl();
    if (!url || !settings.email || settings.vacationMode) return;

    setIsProcessing(true);
    const batt = await getBattery();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${url}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: settings.email,
          startTime: settings.startTime,
          endTime: settings.endTime,
          vacationMode: settings.vacationMode,
          activeDays: settings.activeDays,
          battery: batt,
          contacts: settings.contacts
        }),
        mode: 'cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        setPiStatus('online');
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        updateHistory(timeStr, batt);
        lastTriggerRef.current = Date.now();
      } else {
        setPiStatus('error');
      }
    } catch (err: any) { 
      setPiStatus('offline'); 
    } finally { 
      setIsProcessing(false); 
    }
  }, [settings, getCleanUrl]);

  const checkPiStatus = useCallback(async (silent = false) => {
    const url = getCleanUrl();
    if (!url) { setPiStatus('offline'); return; }
    if (!silent) setPiStatus('checking');
    try {
      const res = await fetch(`${url}/status?user=${encodeURIComponent(settings.email)}`, { 
        method: 'GET',
        mode: 'cors'
      });
      if (res.ok) {
        setPiStatus('online');
      } else { 
        setPiStatus('error'); 
      }
    } catch (err) { 
      setPiStatus('offline'); 
    }
  }, [getCleanUrl, settings.email]);

  const shareActivation = (contact: EmergencyContact) => {
    const botNumber = "34623789580";
    const botCommand = "I allow callmebot to send me messages";
    const botLink = `https://wa.me/${botNumber}?text=${encodeURIComponent(botCommand)}`;
    
    const message = `Hoi ${contact.name}, ik gebruik de Watchdog app voor mijn veiligheid. Wil je mij helpen de monitor te activeren? 

1. Klik op deze link: ${botLink}
2. Druk in WhatsApp op 'verzend'. 

Daarna krijg je een berichtje van de bot met een pincode. Stuur die even naar mij door!`;
    
    const whatsappUrl = `https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  useEffect(() => {
    getBattery();
    checkPiStatus();
    triggerCheckin(); 

    const interval = setInterval(() => {
      checkPiStatus(true);
      triggerCheckin();
    }, 120000); 
    
    return () => clearInterval(interval);
  }, [checkPiStatus, triggerCheckin]);

  useEffect(() => {
    localStorage.setItem('safeguard_settings', JSON.stringify(settings));
    localStorage.setItem('safeguard_server_url', serverUrl);
  }, [settings, serverUrl]);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans select-none overflow-x-hidden">
      <header className="flex items-center justify-between p-6 bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500 text-white rounded-xl">
            <Dog size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xs font-black uppercase tracking-widest text-slate-900">Watchdog</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${
                piStatus === 'online' ? 'bg-emerald-500' : 
                piStatus === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`} 
              />
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                {piStatus === 'online' ? 'Systeem Actief' : 'Verbinding Zoeken'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowManual(true)} className="p-3 bg-orange-50 rounded-2xl active:scale-90 transition-all">
            <Info className="w-5 h-5 text-orange-600" />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-100 rounded-2xl active:scale-90 transition-all">
            <SettingsIcon className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 flex flex-col space-y-5 py-6 pb-12">
        
        {/* Status Dashboard Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 flex flex-col gap-6 shadow-none">
           <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 border border-orange-100">
                  <User size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-tight">Welzijnsmonitor</p>
                  <p className="text-base font-bold text-slate-900">{settings.email || 'Instellen via menu'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-100">
                <Battery size={16} />
                <span className="text-xs font-black">{batteryLevel !== null ? `${batteryLevel}%` : '--'}</span>
              </div>
           </div>
           
           <div className="bg-slate-50 rounded-2xl p-5 flex items-center justify-between border border-slate-100">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400 italic">Laatste Check-in</p>
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-black ${lastSuccessTime ? 'text-slate-900' : 'text-slate-200'}`}>
                    {lastSuccessTime || '--:--'}
                  </p>
                  {lastSuccessTime && <CheckCircle2 size={18} className="text-emerald-500" />}
                </div>
              </div>
              <button 
                onClick={() => triggerCheckin(true)} 
                disabled={isProcessing}
                className="flex flex-col items-center gap-1 group active:scale-95 transition-transform"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isProcessing ? 'bg-slate-100 text-slate-400' : 'bg-orange-500 text-white shadow-lg shadow-orange-100'}`}>
                  <Zap size={20} className={isProcessing ? 'animate-pulse' : ''} />
                </div>
                <span className="text-[9px] font-black uppercase text-slate-400">Meld Nu</span>
              </button>
           </div>

           <div className="flex items-center gap-3 px-1">
              <Clock size={16} className="text-rose-500" />
              <p className="text-[11px] font-bold text-slate-600">
                Volgende deadline: <span className="text-rose-600 font-black">{settings.endTime} uur</span>
              </p>
           </div>
        </div>

        {/* Schema Status */}
        <div className="bg-orange-500 rounded-3xl p-6 text-white shadow-none">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-100 italic">Actief Venster</p>
            <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${isTodayActive() ? 'bg-white text-orange-600' : 'bg-orange-600 border border-orange-400'}`}>
              {isTodayActive() ? 'Vandaag Actief' : 'Rustdag'}
            </div>
          </div>
          <h2 className="text-xl font-bold mb-1">{getDaySummary()}</h2>
          <p className="text-xs text-orange-50 italic opacity-90">De monitor checkt of je tussen {settings.startTime} en {settings.endTime} de app opent.</p>
        </div>

        {/* Vakantie Modus */}
        <button 
          onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
          className={`w-full p-5 rounded-3xl border transition-all flex items-center justify-between ${settings.vacationMode ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 shadow-none'}`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings.vacationMode ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
              <Plane size={20} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-900">Vakantie Modus</p>
              <p className="text-[10px] text-slate-500 font-medium italic">Tijdelijk geen alarmen</p>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.vacationMode ? 'bg-amber-500' : 'bg-slate-200'}`}>
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.vacationMode ? 'translate-x-6' : 'translate-x-0'}`} />
          </div>
        </button>

        {/* Belangrijke Disclaimer (MAG NIET VERWIJDERD WORDEN) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 flex gap-4 shadow-none">
          <div className="text-amber-500 mt-1">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[10px] font-black uppercase text-slate-900 tracking-tight mb-1 italic">Let op voor contactpersonen</p>
            <p className="text-[11px] text-slate-500 leading-relaxed italic">
              Het kan zijn dat de monitor niet werkt bij een defect of lege telefoon van de hoofdpersoon. 
              Breng je contacten hiervan goed op de hoogte.
            </p>
          </div>
        </div>

        {/* Historie Log */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-none">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <History size={14} className="text-slate-400" />
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recente Meldingen</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {history.length === 0 ? (
              <p className="p-8 text-center text-slate-300 text-[10px] font-bold uppercase italic">Geen activiteit</p>
            ) : (
              history.map((log, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-xs font-black text-slate-900">{log.timeStr}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(log.timestamp).toLocaleDateString('nl-NL', {weekday: 'short', day: 'numeric'})}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Battery size={10} />
                    <span className="text-[10px] font-bold">{log.battery}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col p-8 overflow-y-auto animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-8">
             <div>
               <h3 className="text-xl font-black uppercase text-slate-900 italic">Instellingen</h3>
               <p className="text-[10px] font-bold text-orange-600 uppercase mt-1">Systeem Configuratie</p>
             </div>
             <button onClick={() => setShowSettings(false)} className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center active:scale-90"><X size={24}/></button>
          </div>
          
          <div className="space-y-6 pb-20">
            <section className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1 italic">Bewakingsdagen</label>
              <div className="flex justify-between gap-1">
                {DAYS.map((day, idx) => {
                  const isActive = settings.activeDays.includes(idx);
                  return (
                    <button
                      key={day}
                      onClick={() => {
                        const newDays = isActive 
                          ? settings.activeDays.filter(d => d !== idx)
                          : [...settings.activeDays, idx];
                        setSettings({...settings, activeDays: newDays.sort((a,b) => a-b)});
                      }}
                      className={`flex-1 h-12 rounded-xl flex items-center justify-center text-[10px] font-black transition-all active:scale-90 ${isActive ? 'bg-orange-500 text-white shadow-md shadow-orange-100' : 'bg-slate-100 text-slate-400'}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-3 shadow-none">
              <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 italic">
                <Globe size={14}/> Raspberry Pi URL
              </label>
              <input type="text" placeholder="https://..." value={serverUrl} onChange={e => setServerUrl(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-xl font-mono text-xs outline-none focus:border-orange-500" />
            </section>

            <section className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1 italic">Jouw Naam</label>
              <input type="text" placeholder="Bijv. Aldo" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-bold outline-none focus:border-orange-500 transition-colors shadow-none" />
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1 italic">Window Start</label>
                <input type="time" value={settings.startTime} onChange={e => setSettings({...settings, startTime: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-bold shadow-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-rose-500 px-1 italic">Window Deadline</label>
                <input type="time" value={settings.endTime} onChange={e => setSettings({...settings, endTime: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-bold text-rose-600 shadow-none" />
              </div>
            </section>

            <section className="space-y-4 pt-4 border-t border-slate-100">
               <div className="flex items-center justify-between px-1">
                  <h4 className="text-[10px] font-black uppercase text-orange-600 tracking-widest italic">Noodcontacten</h4>
                  <button onClick={() => setSettings(prev => ({ ...prev, contacts: [...prev.contacts, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '', apiKey: '' }] }))} className="w-10 h-10 bg-orange-500 rounded-xl text-white flex items-center justify-center active:scale-95 shadow-md shadow-orange-100"><Plus size={20} /></button>
               </div>
               {settings.contacts.map((c) => (
                  <div key={c.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-200 space-y-3 shadow-none">
                    <div className="flex justify-between items-center">
                      <input type="text" placeholder="Naam contact" value={c.name} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, name: e.target.value} : x)})} className="bg-transparent font-bold text-slate-900 outline-none w-full shadow-none" />
                      <button onClick={() => setSettings(prev => ({ ...prev, contacts: prev.contacts.filter(x => x.id !== c.id) }))} className="text-rose-400 p-2"><Trash2 size={18} /></button>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Mobiel (bijv 316...)" value={c.phone} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, phone: e.target.value} : x)})} className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none shadow-none" />
                      {/* WhatsApp Snelknop Hersteld (MessageCircle) */}
                      <button 
                        onClick={() => shareActivation(c)}
                        disabled={!c.phone}
                        title="Verstuur WhatsApp link"
                        className="p-3 bg-emerald-500 text-white border border-emerald-600 rounded-xl active:scale-90 disabled:opacity-30 shadow-sm shadow-emerald-100"
                      >
                        <MessageCircle size={20} />
                      </button>
                    </div>
                    <input type="password" placeholder="Bot API Key (Pincode)" value={c.apiKey} onChange={e => setSettings({...settings, contacts: settings.contacts.map(x => x.id === c.id ? {...x, apiKey: e.target.value} : x)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none shadow-none" />
                    {c.phone && (
                      <button 
                        onClick={() => shareActivation(c)}
                        className="w-full py-4 bg-emerald-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-emerald-100"
                      >
                        <Share2 size={14} /> Deel activatie link via WhatsApp
                      </button>
                    )}
                  </div>
                ))}
            </section>
          </div>
        </div>
      )}

      {/* Manual Modal */}
      {showManual && (
        <div className="fixed inset-0 z-[120] bg-white p-8 overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
           <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3 text-orange-600">
                <BookOpen size={24} />
                <h3 className="text-xl font-black uppercase italic text-slate-900">Handleiding</h3>
              </div>
              <button onClick={() => setShowManual(false)} className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center active:scale-90"><X size={24}/></button>
           </div>
           <div className="space-y-6">
              <section className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
                 <p className="text-[10px] font-black uppercase text-orange-600 mb-2 italic underline underline-offset-4 decoration-2 tracking-tighter">Het Doel van de Watchdog</p>
                 <p className="text-sm text-orange-950 leading-relaxed italic">
                   "De Watchdog is een digitale waakvriend die je familie waarschuwt bij nood. Je hoeft alleen maar de app 1x per dag te openen voor de deadline. Doe je dit niet? Dan krijgt je familie direct een WhatsApp-bericht."
                 </p>
              </section>
              <section className="space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400 px-1 italic">Hoe werkt het?</p>
                {[
                  { n: 1, t: "Altijd Aan", d: "De monitor draait 24/7 op je Raspberry Pi. Je hoeft in deze app niets te starten." },
                  { n: 2, t: "De Check-in", d: "Zodra je deze app opent of op 'Meld Nu' drukt, wordt er automatisch een seintje gestuurd naar de server." },
                  { n: 3, t: "De Deadline", d: "Geef je geen seintje voor je gekozen deadline? Dan start het alarm op de server." },
                  { n: 4, t: "Contacten", d: "Gebruik 'Deel activatie link' om familieleden toe te voegen aan het WhatsApp-systeem." }
                ].map(s => (
                  <div key={s.n} className="flex gap-4 items-start p-4 bg-white border border-slate-100 rounded-2xl shadow-none">
                     <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold">{s.n}</span>
                     <div className="text-left">
                       <p className="text-xs font-bold text-slate-900">{s.t}</p>
                       <p className="text-[10px] text-slate-500 leading-tight mt-0.5 italic">{s.d}</p>
                     </div>
                  </div>
                ))}
              </section>
              <button onClick={() => setShowManual(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-100 active:scale-95 transition-transform">Ik heb het gelezen</button>
           </div>
        </div>
      )}
    </div>
  );
}
