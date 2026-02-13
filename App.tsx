import React, { useState, useEffect } from 'react';
import { Dog, Wifi, AlertTriangle, ShieldAlert } from 'lucide-react';

const API_URL = 'https://barkr.nl';

export default function App() {
  const [errorInfo, setErrorInfo] = useState<string>("Nog geen test gedaan");
  const [status, setStatus] = useState<'testing' | 'fail' | 'ok'>('testing');

  const runDiagnostic = async () => {
    setStatus('testing');
    try {
      const res = await fetch(`${API_URL}/status`, { 
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });
      
      if (res.ok) {
        setStatus('ok');
        setErrorInfo("Verbinding met barkr.nl is perfect!");
      } else {
        setStatus('fail');
        setErrorInfo(`Server reageert met foutcode: ${res.status}`);
      }
    } catch (err: any) {
      setStatus('fail');
      setErrorInfo(`Browser blokkeert verbinding: ${err.message}. Dit komt vaak door een HTTPS/SSL conflict.`);
    }
  };

  useEffect(() => { runDiagnostic(); }, []);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center justify-center font-sans">
      <div className={`p-6 rounded-full mb-8 ${status === 'ok' ? 'bg-emerald-500' : status === 'fail' ? 'bg-red-500' : 'bg-slate-700 animate-pulse'}`}>
        <Dog size={80} />
      </div>

      <h1 className="text-2xl font-black mb-2 italic">DIAGNOSE V3</h1>
      
      <div className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          {status === 'ok' ? <Wifi className="text-emerald-400" /> : <ShieldAlert className="text-red-400" />}
          <span className="font-bold uppercase tracking-widest text-xs">Status Rapport</span>
        </div>
        
        <p className="text-slate-300 text-sm leading-relaxed mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-700 font-mono">
          {errorInfo}
        </p>

        <button 
          onClick={runDiagnostic}
          className="w-full py-4 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold transition-all active:scale-95"
        >
          TEST OPNIEUW
        </button>
      </div>

      <p className="mt-8 text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em]">
        Gepusht om: {new Date().toLocaleTimeString()}
      </p>
    </div>
  );
}