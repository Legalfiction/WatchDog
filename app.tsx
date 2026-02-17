/* Gecorrigeerde sectie voor de Main Button in App.tsx */
<button 
  onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
  disabled={status !== 'connected'}
  className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl active:scale-95 group overflow-hidden border-[10px] ${
    status !== 'connected' ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' : 
    settings.vacationMode ? 'bg-slate-900 border-slate-700' : 'bg-orange-600 border-orange-700'
  }`}
>
  {status !== 'connected' ? (
    <div className="flex flex-col items-center animate-pulse">
      <Wifi size={80} className="text-slate-400 mb-2"/>
      <span className="text-xs font-bold text-slate-400 uppercase">Verbinding zoeken...</span>
    </div>
  ) : settings.vacationMode ? (
    <div className="flex flex-col items-center justify-center relative w-full h-full">
      <div className="absolute top-16 right-20 flex font-black text-blue-300 pointer-events-none z-10">
        <span className="text-3xl animate-zz" style={{animationDelay: '0s'}}>Z</span>
        <span className="text-2xl animate-zz ml-1" style={{animationDelay: '0.4s'}}>z</span>
        <span className="text-xl animate-zz ml-1" style={{animationDelay: '0.8s'}}>z</span>
      </div>
      <img src="/logo.png" alt="Barkr Logo" className="w-full h-full object-cover scale-[1.02] opacity-40 grayscale" />
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
        <span className="text-xs font-black uppercase text-blue-100 tracking-widest mt-24">Wakker worden</span>
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center w-full h-full relative">
       <img src="/logo.png" alt="Barkr Logo" className="w-full h-full object-cover scale-[1.02] drop-shadow-xl" />
       <div className="absolute bottom-6 inset-x-0 text-center">
          <span className="text-[11px] font-black uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] tracking-widest">Tik om te slapen</span>
       </div>
    </div>
  )}
</button>