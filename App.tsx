import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Calendar, Wifi, Signal, 
  Activity, ShieldCheck 
} from 'lucide-react';

// --- AFBEELDINGEN (Modern & Scherp) ---
const IMG_BARKING = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAAw1BMVEX///8zMzM6Ojo0NDQ5OTk3Nzc1NTU+Pj47Ozs8PDw4ODg2NjZ/f3+EhIR7e3t5eXl3d3dYWFhRUVFSUlJPT09lZWVpaWlcXFxUVFRhYWFKSkpCQkJkZGRubm5gYGBiYmJ0dHRfX19LS0tMTExzc3NcXFxdXV1bW1tGRkZ9fX1aWlqCgoKAgICFhYWAgIB6enqDg4OBgYF+fn6EhISBgYGJiYmFhYWDg4OCgoKBgYF+fn6BgYGCgoKAgIBY/aWdAAAK4klEQVR4nO2ba3fiOg6GhZJAmhZIQ5t2oB0KpdDO9P//vS8kX7hXz5l9Zs7JdE71g9o2siVbtqS4XF5e/odv3779p29t/71c+N/Jbdu2r1+/fv2Xb+0L9X/Zbr/3rW1W3rZtW9n3V69fv3z58uXL6+vr75b/bdu2fXl9ff1y/er7t23bvmy2W73Wtl27qB78+vXz58+f397e3v7+/v6vtv0f8j+2239+e/v78+ePb6+vP1u92rZ12c5fX9/e3n58//5t2/73+5Vv27b94/u3798/v636+9W2277q2N/ev3//60P8V+k/v/2z1r//tt12q+H+evr78ePHf/rW5vJ/fvz9evq31YftYq11+v317e3X17+vX9pL/cfXtz//tT51l7a8u3q18dffL1+2l/jL9etP65e3a21Zl7Z8vHn7/v36t83pX3+3vr2tq8uqtOW/bL26/mXj9d8r2m39dG2zsrVvH1++bL24vn34/Gk60J+2Pr2u90352t7+1Wv7+q/95Vp/rX1Z6y63XF5v29qnt/W36/u2ffr67c7+n59+u1u9tZfS0u/X62279t3nL/Xp49tPf9p9t8U3n/+01/f08vH66VqfP33a+nT96W37+m/707c/f+rTx/r48fOnT729v9X3d2vr08frv67/2h6n75ev1/rr42e//dOn+nz6/F+L682/r/Xl9K3j16cvr9vL69eXb29v/7V13y+v9fe373/8/Pbt89ubr9+1u66f6tP3N63fPn75/fPLp89/fP/+y36/vL6/t7+2/f3zS3v79qnefrj+888vH79s//n7j5/a1r7769vHL9/q48eP77V9f/vX/v72j9evb3+3168f375/+2n7/mXrr2/bT9/r08f3n7Y+/fT9p53qj1cvr221b9vL783249c/n5xI6L36bds/vn//7d9frn34U1/+1Pr79av938e33+0W4/uvtX3/cO0P//rx+W19fv18/evbt2/frr9b9sP291f/36/XPv5+/W71+n19/PT989u3H+ufP/7Y/vm3L3/+qW3/37d/+3j942e/vfn8f22fPv7155/a+vv1199a3+r7X9tPf259//Htz7X+23Z7/d7q4+v3t2/f6uPfP/83/Ld1+7dvP//3P2v98/vHt//69mOtf/3z8+fPv/X9+6vN+L/q9dvHjz9/fv8n/v79p/39c9tW/t9f39Zf2m+f/735/G37+uX79o+Pv/8U/s/t21qffv759y+tLz/f/9N3l/+tH7W9//j739/b6l/e/vF59Xf513+/Xvv487eP9eO3P58/ff/2y17K57/+ffl8/UvfP/30o8237R8/9vff5e3H2r7X15+vX3/80PqvP2x7fXn58kPr1/btj7X98frx/V999V3/V7L/939//Pz445dvr2+vH9v6+vKxPv29/eX9T1s+fWzbX/+xPv7r29v28r09ftq3tU//ev/9n7/9pW//aF3f/fjjP//56+1D2+3XN19e399evn17//L+9s+P9aH+1L5c+34v/G/78uOn73/++/tPb/WxtR9/fP+j/n5sXz+8fr7W54///vHX639efn8vfn/9489P2+vv3//69eP7/17rv364fN3evr/X67cvX/73r//5818/13/bPrX1w9uv1/8f+k/59K//+e2/a3v/49uP73//8frHn9/v5ev3+vD+x7U/9u1fPz+/v/32y8+X13/aX77XJ1v718d/fX17q//8+dtn+/u13R7//G/92PZfP18/v/2n9f2HH/9Z69tf2r8+/fnlQ3279m+t168/tD681L/V+nrt09s/f+nbt8//eT2JbNtfN+r3+tT2+319/Pz7//1+q+3v2v771x/r7//z+kPr20+f2/br24/P/3o/qWrfPtQvrS+v31v7bcvP48u1vn+pX9X3tZ+3tv2p9duH//2s7833f16/1Vb/+vjPZ/tX7efv9e3aX1//8fn3y+fr/3ZqP7d6rb/+fF/bX97++a39/eXz59r/sX1u397+WuvP//n95W39f6t/rv+8Xf9c65/a36/32l9/bqv91aY29Xf93drfrX//19++//G1f/9+v/n+b8uPj6/fPrTefm1fvr+9//Pnz/9ev7/8Wuvjtj61frv24W3r9y/vX9pf7X+XbT9c36/9Xm1/bttPPr3/8fP7+6X+sf17fXtZ7ff3P/XzL/Xj29bfrtffP9R/1l2u9e/bv35//+3tL+0/f/6x3X6s9Z/b9u31+79//Xv797//2b633t6+vf/1V/X1n/b9X62/3/9qfXtbP//7789rP3/+eG9/Xl5eX7bXanv513u9//v1z1bfttX/an299uvb51ZfbN022/WvT//91/bH9f37j9ff38tv27/Wl5+tn1rbf/7b+vN1/ffX2n8/rL2U7ZfXHz++//i7ffv727/X2p8/3/9Uv9RfrT6/3evD31rf/vG/P9t+uX573bb//vJp/WNr6+8frT/X+s//tH7Y3n+1bX2ob1//+9+f398//zG+sP18ra/Xv334d93lX29vP7b1+uWv6t+23Xb91/5Tf37//v5aX17a+v7P69cfv3/8vQ328vLtQ1t/Xvv+6/t7v7/X6tb779r/ +1P6/vrT62t9/qj9b6Y3tr+1/fX9sPb29fXl7/vG3br20/vv/r+t+/14etfrl+3P58+99/Xvv/uO0H+1d7//P9X9v3j5/f/7F2u7386/vb2v54++ePH9va/v3v9mN9e2vrb9uvWlv79v88/q//t8vW12s9/1X/av/6+e/Pnz9r226vrR/t0/v3ev12/XWtP7X//Ntfv+rP129vP7a1/W+t/1P7+tL+/HdtX37XJ3v90Pp4vfbH+vfXf31/qD/+bN3f//LqXn99ff3P//34++3tX9uvbX9vX65/+9A+/PZ9f/tL+7/X/9x6eXn541of3r9eP7Q/fv9T2+37t3/+Y23/sL59r//8c/12ufz4/lJ/vL2v1z7U9x9+t5fX99f6vT7Y+nNtH3/X/vW33q2+/12+1P9Wff1+v/61fv67vv3407aPtv5l7cvr29/frd5e32vbf7Vv6rL19efn67cf6ufP12t/ffv4Uv18/cfWv/7jR9Xf67X1+s/9+rXv60/1y9uf7a19tO3rD61/78vv6v+vtn+2v23vP/7913rfv/+x9df17Uf94+13/bFv20c/8V/+fH/bPr2992+vb9s/L2v/tn5q60P98eNfN5ffq3/ffqj/rV9q//7905//819//mO1rX76Y/1H+89l3758/L29Xl5bfdv69/Z2v7f+ufb1r8vX7fX9S3v76f669t0/v/+37Xb5/G+tL9dP3358/1O/vH/94fr1j//c1v58W3/++uW6fvvXh/rx2p/btt6v/9pf269v1/rrX9u2fv+3be3r5ev252vt9eO7tZ++1y+vb99/XN+2/w917J0q6hE9yAAAAABJRU5ErkJggg==";

const IMG_SLEEPING = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAAolBMVEX///8xMTFEQ0N+f391dXUmJib4+Pjs7Oz8/Pzd3d01Njbi4uJycXEuLy8/Pz86OjpTU1NKSkqBgYF5enpXV1dxcXE3NzdeX199fX0lJiYgICBJSklra2soKCgRERELCwuWlpZcXFxUVFQcHR0UFRWfn5+CgoJmZmaSkpIbGxskJCQREREvLy8zMzMAAAAAAAAAAAAAAAD39/ff39/v7++jo6N/j72yAAAIaUlEQVR4nO2ba3uqOhSGRQG1ItWCtq1dK23t7P//l54X2gTjYp3K2b3mZ9Vn9aFckkMCqam11hQfPnx81p9q/b+30n23VlZ/1Prn/621/qH11vqv771d33v1s+1S97u97b3a/rB9Xf9V1//r1bW+7+vrtm77w9fWq1+/W7/avv3567+tr72783Xb3n7X2u+a+77vW3+4fvD1X+u9772679fW+r5v687Xbe3T2rfv7X27/N29+7qutdf79Z8X9fXru/u13fve3T2rfv7X27/N29+7qutdf79Z8X9fXru/u13fve3fvvq3vD13//e33e2ufn9eXz89Pj13/3Vtf1n9t//4N99+69eHr2v+6//3c6r/r/cPHf321a72t/6y1z0/rv35Y/frjP5fPj8/787q21veH9l/r9/+83p/X18/79d+H+s+/V1r6u4e//0zU8/586N9+d+tf/9u1X2t9+bq/v3+/r8/r68eH9e/vv/+89uf107+vr6//9eFfH/5Z//7r2vrw0/3+7fNfHx53rQ+fv/+8P37c335a/+v+9u3n89fHtf9rfXjctdfHj7X+/K+Hj5+fHx8///Ww1h/uWtfW3f/97v3+/X0v/d/7/cOn+/u1d69f1+v318///f3n5+f3+/v3X2t9vVv/9+u//nN/X1+v/fN+f/jw+Xn/2fX9+uP+9s+366fP9/v1y9fD2s/P+8N9f2u7/t/6evVfv+z//vG9Pnx+7O9fP6z1cK3//v79+2v9uNb+0N///s/qWerqD+2v9/f7Q9fH34e1r//6/P/b7z+v9bHrv7Y//v3567/u79b/uf9s77372u8//3n43fW/j6uH31+/3H/uX58e9/vD/v7rD+0/v+9v7//1y+P+cK39X//f1v3h/f7j8P7x7d9e+78ePr/9cO3fn98fP777X7/9dK31/uEfn/dPnx7rP/+z/l5X+8e33/760/0f97fP9/u1v37cf+5W//p7d7++e1v/0/W/fv2w9v7u/q8f1u//fNjf364Pf/31/vr+r2v95/7137X/uNaHx/37Q+8P+8N/+70/fL6/f/79oXv47P75sNbD1f3t8+e1f//98P5vD/cPf61/fPz88fH3Wv99uF9//H37533f/3y9v336fH/743//+eHr23u39u8P3X/2z/sfn91b+59rv1r38P55/f33j66/vt2//f7w7f7u/cM//m+v2u/uYd3r/dvn7v2h9e360P35/v7h44f/+L89fP399+vrh959+Gvdf13722e/1t3/uf94/9m9P+zf//7v5e+1/un3X921+/v9fdf97cMfn+6/6/+/d9/ufn0/1L2P9w8/t7372q/9ev+j6//8uGv9+N9//+HjD7u1/2n/cK27f9x96N0//m3d/9n7W/9u199f/Xrv1197vV8fOtD/7a/W+v3Tfde1Xvffuvv1/e0P98/fHx73a2vX69P/X/t1eP+8v3/76b+7790//vH+7fPj/u5+7b/r2u/f997/+H3Xh9a9+/XzWrvf/+sPf637p0/X39/+tX/9+vA4vO//+l/r/n7dvz88Htf+0P/r/r/78P/19lq73t331of1cK3/ef347L7d1vrpU/dP69vvH7rvd9//3Prn9bN1+Hj/8f3D/brff3Ufvr0//f+f1//6+d1/+K71/b1f+6/9/u77n9f+8cO9D4///ufDtbX/9XF9Xbvv//J/99u9a7f+0L3X53X/uF/d3X14f/+/a/3t8/1v6/eHfX+4v19d+/Xj6vX7q+/Wut8f9/v3r73+fP251s/7H7X3v5+7+9vvPz+7P7z//PHhf/96uLp3/8Pf/+/93/4/a33/9f7r3j/r61+329X9+2d/f+j/9uG//7fWh+v+7uf+/a/3h6713b///Wv/e/+v3397rffP69f9P++7v7w/rK69frp+vP+/7w+r/b/Xp7UPu6/7tT4+9Pev3f8fP334d73/f5+f1z8/P64+ffq92t//W9c///Hh+3t//+H6r18vHn0B67dK/Yx1W50AAAAASUVORK5CYII=";

export default function App() {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'searching' | 'connected' | 'offline'>('searching');
  const [showSettings, setShowSettings] = useState(false);
  const [lastPing, setLastPing] = useState('--:--');

  const ENDPOINTS = ['http://192.168.1.38:5000', 'https://barkr.nl'];
  const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    if (saved) return JSON.parse(saved);
    return {
      myPhone: '', name: '', vacationMode: false, useCustomSchedule: false,
      activeDays: [0, 1, 2, 3, 4, 5, 6], startTime: '07:00', endTime: '08:30',
      contacts: [] as {name: string, phone: string}[], schedules: {} as any
    };
  });

  useEffect(() => {
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
    if (!activeUrl) return;
    const timer = setTimeout(() => {
      fetch(`${activeUrl}/save_settings`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(settings)
      }).catch(e => console.error("Save error:", e));
    }, 800);
    return () => clearTimeout(timer);
  }, [settings, activeUrl]);

  const findConnection = useCallback(async () => {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          const data = await res.json();
          setActiveUrl(url);
          setStatus('connected');
          setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
          return; 
        }
      } catch (e) {}
    }
    setStatus('offline');
  }, []);

  useEffect(() => {
    findConnection();
    const interval = setInterval(findConnection, 5000);
    return () => clearInterval(interval);
  }, [findConnection]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <style>{`
        @keyframes bounce-zz {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-15px) scale(1.2); opacity: 1; }
        }
        .animate-zz { animation: bounce-zz 2s infinite ease-in-out; }
      `}</style>
      
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg shadow-sm overflow-hidden flex items-center justify-center w-8 h-8">
             <img src={IMG_BARKING} alt="Logo" className="w-6 h-6 object-contain invert" />
          </div>
          <div>
            <h1 className="text-lg font-black italic tracking-tighter text-slate-800">BARKR</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? (settings.vacationMode ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-red-500'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {status === 'offline' ? 'Geen verbinding' : status === 'searching' ? 'Zoeken...' : settings.vacationMode ? 'Systeem in rust' : 'Systeem Actief'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
          <Settings size={20} className="text-slate-600"/>
        </button>
      </header>

      {!showSettings && (
        <main className="flex-1 p-6 flex flex-col items-center justify-start pt-16 space-y-12">
          
          <button 
            onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
            disabled={status !== 'connected'}
            className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl active:scale-95 group p-0 overflow-hidden border-[1px] ${
              status !== 'connected' ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' : 
              settings.vacationMode ? 'border-blue-300' : 'border-orange-300'
            }`}
          >
            {status !== 'connected' ? (
              <div className="flex flex-col items-center animate-pulse">
                <Wifi size={80} className="text-slate-400 mb-2"/>
                <span className="text-xs font-bold text-slate-400 uppercase">Verbinding zoeken...</span>
              </div>
            ) : settings.vacationMode ? (
              <div className="relative w-full h-full bg-slate-900 flex flex-col items-center justify-center">
                <img src={IMG_SLEEPING} alt="Slaapstand" className="w-40 h-40 object-contain mb-4" />
                <div className="absolute top-16 right-16 flex gap-1">
                  <span className="text-blue-300 font-black text-2xl animate-zz" style={{animationDelay:'0s'}}>Z</span>
                  <span className="text-blue-300 font-black text-xl animate-zz" style={{animationDelay:'0.4s'}}>z</span>
                  <span className="text-blue-300 font-black text-lg animate-zz" style={{animationDelay:'0.8s'}}>z</span>
                </div>
                <span className="text-sm font-black uppercase text-blue-200 tracking-widest">Wakker worden</span>
              </div>
            ) : (
              <div className="relative w-full h-full bg-orange-600 flex flex-col items-center justify-center">
                 <img src={IMG_BARKING} alt="Actief" className="w-44 h-44 object-contain mb-4" />
                 <span className="text-sm font-black uppercase text-white tracking-widest">Tik om te slapen</span>
              </div>
            )}

            {activeUrl && (
              <div className={`absolute bottom-6 px-5 py-2 rounded-full text-[10px] font-bold uppercase flex items-center gap-2 shadow-lg border backdrop-blur-md ${
                settings.vacationMode ? 'bg-slate-800/80 text-blue-200 border-slate-700' : 'bg-white/90 text-orange-600 border-orange-100'
              }`}>
                {activeUrl.includes('barkr') ? <Signal size={12}/> : <Wifi size={12}/>}
                {activeUrl.includes('barkr') ? '4G Verbinding' : 'Wifi Verbinding'}
              </div>
            )}
          </button>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 w-full max-w-xs text-center shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center justify-center gap-1 tracking-widest">
               <Activity size={12}/> Laatste Controle
             </p>
             <p className="text-4xl font-black text-slate-800 tabular-nums tracking-tight">{lastPing}</p>
          </div>
        </main>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto">
          <header className="px-6 py-4 bg-white border-b sticky top-0 z-10 flex justify-between items-center shadow-sm">
            <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Barkr Setup</h2>
            <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20}/></button>
          </header>
          {/* De rest van je bestaande instellingen-UI... */}
        </div>
      )}
    </div>
  );
}