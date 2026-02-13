import React, { useState, useEffect, useCallback } from 'react';
import { Settings, X, Signal, Dog, Activity, Moon, Save, User, Phone, Plus, Trash2 } from 'lucide-react';

const API_URL = 'https://barkr.nl';

export default function App() {
  const [status, setStatus] = useState<'connected' | 'offline'>('offline');
  const [showSettings, setShowSettings] = useState(false);
  const [lastPing, setLastPing] = useState('--:--');
  const [settings, setSettings] = useState({
    myPhone: '',
    name: '',
    vacationMode: false,
    contacts: [] as { name: string, phone: string }[]
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/status`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        setStatus('connected');
        setLastPing(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        if (data.settings) setSettings(data.settings);
      } else {
        setStatus('offline');
      }
    } catch (e) {
      setStatus('offline');
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const saveSettings = async (newSettings: typeof settings) => {
    try {
      await fetch(`${API_URL}/save_settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      fetchData();
    } catch (e) {
      alert("Fout bij opslaan");
    }
  };

  const toggleVacation = () => {
    const updated = { ...settings, vacationMode: !settings.vacationMode };
    setSettings(updated);
    saveSettings(updated);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 bg-white border-b flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg">
            <Dog size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black italic text-slate-800 tracking-tighter">BARKR</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {status === 'connected' ? 'Systeem Actief' : 'Geen Verbinding'}
              </span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2.5 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <Settings size={20}/>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col items-center justify-center space-y-8">
        <button 
          onClick={toggleVacation}
          disabled={status === 'offline'}
          className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center border-[8px] transition-all duration-500 shadow-2xl ${
            status === 'offline' ? 'bg-slate-200 border-slate-300 scale-95 opacity-70' :
            settings.vacationMode ? 'bg-slate-800 border-slate-700' : 'bg-orange-600 border-orange-400 hover:scale-105 active:scale-95'
          }`}
        >
          {status === 'offline' ? (
            <div className="relative"><Dog size={100} className="text-slate-400" /><X size={40} className="text-red-500 absolute -top-2 -right-6"/></div>
          ) : settings.vacationMode ? (
            <div className="flex flex-col items-center">
              <Moon size={80} className="text-blue-200 mb-2" />
              <span className="text-blue-200 font-bold text-xs uppercase tracking-widest">Pauze</span>
            </div>
          ) : (
            <div className="relative">
              <Dog size={100} className="text-white" />
              <Signal size={32} className="text-white absolute -top-2 -right-6 animate-pulse" />
            </div>
          )}
        </button>

        <div className="bg-white p-6 rounded-3xl border w-full max-w-xs text-center shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Laatste Check</p>
          <p className="text-4xl font-black text-slate-800 tracking-tight">{lastPing}</p>
        </div>
      </main>

      {/* Settings Overlay */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black italic tracking-tight">INSTELLINGEN</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={24}/></button>
            </div>

            <div className="space-y-6">
              {/* Profile */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <User size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Profiel</span>
                </div>
                <input 
                  type="text" placeholder="Naam Hond" 
                  className="w-full bg-slate-50 border rounded-2xl p-4 font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                  value={settings.name} onChange={(e) => setSettings({...settings, name: e.target.value})}
                />
                <input 
                  type="text" placeholder="Mijn Telefoonnummer" 
                  className="w-full bg-slate-50 border rounded-2xl p-4 font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                  value={settings.myPhone} onChange={(e) => setSettings({...settings, myPhone: e.target.value})}
                />
              </div>

              {/* Contacts Placeholder */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <Phone size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Noodcontacten</span>
                </div>
                <button className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                  <Plus size={18} /> Contact Toevoegen
                </button>
              </div>

              <button 
                onClick={() => { saveSettings(settings); setShowSettings(false); }}
                className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 active:scale-95 transition-all"
              >
                <Save size={20} /> OPSLAAN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}