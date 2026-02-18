import React, { useState, useEffect } from 'react';
import { Settings, Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';

// CONTROLEER DIT IP ADRES MET 'hostname -I' OP JE PI!
const DEFAULT_IP = '192.168.1.38'; 
const PORT = '5000';

export default function App() {
  const [ip, setIp] = useState(() => localStorage.getItem('barkr_ip') || DEFAULT_IP);
  const [status, setStatus] = useState('INIT');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastPing, setLastPing] = useState('-');
  const [settings, setSettings] = useState(() => {
    const s = localStorage.getItem('barkr_v7');
    return s ? JSON.parse(s) : { name: '', startTime: '', endTime: '' };
  });
  const [showSettings, setShowSettings] = useState(false);

  // DE PING LOOP
  useEffect(() => {
    if (!settings.name) return;

    const sendPing = async () => {
      // Als scherm uit is, stop (bespaart batterij en voorkomt false positives)
      if (document.visibilityState !== 'visible') return;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 sec timeout

        const res = await fetch(`http://${ip}:${PORT}/ping`, { 
          method: 'POST',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (res.ok) {
          setStatus('OK');
          setErrorMsg('');
          setLastPing(new Date().toLocaleTimeString());
        } else {
          setStatus('ERROR');
          setErrorMsg(`Server Fout: ${res.status}`);
        }
      } catch (e: any) {
        setStatus('ERROR');
        // Toon de echte netwerkfout op het scherm
        setErrorMsg(e.name === 'AbortError' ? 'Timeout (Pi reageert niet)' : 'Kan server niet vinden');
      }
    };

    // Ping elke 2 seconden
    const interval = setInterval(sendPing, 2000);
    sendPing(); // Directe start

    return () => clearInterval(interval);
  }, [ip, settings]);

  const saveSettings = () => {
    localStorage.setItem('barkr_v7', JSON.stringify(settings));
    localStorage.setItem('barkr_ip', ip);
    
    // Probeer instellingen op te slaan
    fetch(`http://${ip}:${PORT}/save_settings`, {
      method: 'POST', 
      headers: {'Content-Type':'application/json'}, 
      body: JSON.stringify(settings)
    }).catch(e => alert("Kon instellingen niet opslaan op Pi: " + e));
    
    setShowSettings(false);
  };

  // UI
  const isError = status === 'ERROR';
  const isOk = status === 'OK';

  return (
    <div className={`min-h-screen flex flex-col items-center p-6 font-sans transition-colors duration-500 ${isOk ? 'bg-emerald-50' : 'bg-red-50'}`}>
      
      <header className="w-full flex justify-between items-center mb-10">
        <h1 className="text-2xl font-black text-slate-800 tracking-tighter">BARKR DIAGNOSE</h1>
        <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-white rounded-lg shadow-sm border"><Settings size={20}/></button>
      </header>

      {!showSettings ? (
        <main className="flex-1 flex flex-col items-center justify-center w-full max-w-xs text-center space-y-6">
          
          {/* STATUS BOL */}
          <div className={`w-48 h-48 rounded-full flex items-center justify-center border-8 shadow-xl transition-all ${isOk ? 'border-emerald-500 bg-emerald-100' : 'border-red-500 bg-red-100'}`}>
            {isOk ? <CheckCircle size={64} className="text-emerald-600" /> : <WifiOff size={64} className="text-red-500" />}
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-800">{isOk ? 'VERBONDEN' : 'GEEN VERBINDING'}</h2>
            
            {/* HIER ZIE JE PRECIES WAT ER MIS IS */}
            {isError && (
              <div className="bg-red-200 text-red-900 p-3 rounded-lg text-sm font-mono border border-red-300">
                <p className="font-bold">FOUTMELDING:</p>
                <p>{errorMsg}</p>
                <p className="mt-2 text-xs">Doel: {ip}:{PORT}</p>
              </div>
            )}
            
            {isOk && <p className="text-emerald-700 font-medium">Laatste signaal: {lastPing}</p>}
          </div>

        </main>
      ) : (
        <div className="w-full bg-white p-6 rounded-2xl shadow-xl space-y-4">
          <h3 className="font-bold text-lg">Configuratie</h3>
          
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">IP Adres Raspberry Pi</label>
            <input value={ip} onChange={e=>setIp(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl font-mono text-lg" />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Naam Gebruiker</label>
            <input value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} className="w-full p-3 border-2 border-slate-200 rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-400 uppercase">Start</label><input type="time" value={settings.startTime} onChange={e=>setSettings({...settings, startTime:e.target.value})} className="w-full p-3 border rounded-xl"/></div>
            <div><label className="text-xs font-bold text-slate-400 uppercase">Eind</label><input type="time" value={settings.endTime} onChange={e=>setSettings({...settings, endTime:e.target.value})} className="w-full p-3 border rounded-xl"/></div>
          </div>

          <button onClick={saveSettings} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl text-lg">OPSLAAN & TESTEN</button>
        </div>
      )}
    </div>
  );
}
