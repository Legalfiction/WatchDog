import React from 'react';
import { X, Plane, Briefcase, Home, Mountain, Heart, Shield, Zap, Dog } from 'lucide-react';

interface InfoPageProps {
  onClose: () => void;
  lang: string;
  t: (key: string, lang: string) => string;
}

export default function InfoPage({ onClose, lang, t }: InfoPageProps) {
  return (
    <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 pb-20 no-scrollbar">
      <header className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">Uitleg & Gebruik</h2>
        <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm">
          <X size={20}/>
        </button>
      </header>

      <div className="space-y-6">
        
        <div className="bg-orange-50 border border-orange-100 p-5 rounded-3xl shadow-sm">
          <p className="text-sm font-bold text-orange-900 leading-relaxed">
            De weekplanning is leidend. Wil je incidenteel een andere tijd? Selecteer dan "Vandaag" of "Morgen" op het hoofdscherm. Na het verstrijken van die dag valt de app automatisch terug op je standaard weekplanning.
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4 px-1">
            <Zap size={14} className="text-slate-400" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Wanneer gebruik je Barkr?</h3>
          </div>

          {/* GROEP 1: DAGELIJKSE CHECK-IN (Visueel samengevoegd) */}
          <div className="bg-orange-600/5 border border-orange-600/10 rounded-[28px] p-2 mb-4">
            <div className="px-4 pt-3 pb-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600">De Dagelijkse Check-in</h4>
            </div>
            
            <div className="space-y-2">
              <div className="bg-white p-4 rounded-2xl shadow-sm flex gap-4">
                <div className="bg-orange-100 p-2.5 rounded-xl h-fit"><Heart size={20} className="text-orange-600" /></div>
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 italic mb-1">Ouderen</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">Een geruststelling voor kinderen of bekenden. Met een vaste ochtend-deadline weten zij direct dat alles in orde is, zolang de telefoon maar regulier gebruikt wordt.</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm flex gap-4">
                <div className="bg-orange-100 p-2.5 rounded-xl h-fit"><Home size={20} className="text-orange-600" /></div>
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 italic mb-1">Alleenwonenden</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">Een laagdrempelige check-in (vaak voor de iets jongere groep). Voor de omgeving én de gebruiker is het fijn om te laten weten dat je veilig aan de dag bent begonnen.</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm flex gap-4">
                <div className="bg-orange-100 p-2.5 rounded-xl h-fit"><Shield size={20} className="text-orange-600" /></div>
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 italic mb-1">Zorgdragers</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">Zorg je (deels) alleen voor een verstandelijk beperkt of afhankelijk persoon? Als jij onverhoopt uitvalt, worden anderen direct gewaarschuwd zodat zij de zorg kunnen overnemen.</p>
                </div>
              </div>
            </div>
          </div>

          {/* GROEP 2: INCIDENTEEL GEBRUIK (Losse kaarten) */}
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4">
              <div className="bg-orange-50 p-2.5 rounded-xl h-fit"><Plane size={20} className="text-orange-600" /></div>
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800 italic mb-1">De Vroege Reiziger</h4>
                <p className="text-xs text-slate-600 leading-relaxed">Vlieg je vroeg? Stel je deadline vlak na je wekker in. Verslaap je je? Dan krijgen je reisgenoten direct bericht.</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4">
              <div className="bg-orange-50 p-2.5 rounded-xl h-fit"><Briefcase size={20} className="text-orange-600" /></div>
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800 italic mb-1">Afspraak & Werk</h4>
                <p className="text-xs text-slate-600 leading-relaxed">Laat familie of collega's automatisch weten als je niet op tijd 'online' bent gekomen of verschenen bent.</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4">
              <div className="bg-orange-50 p-2.5 rounded-xl h-fit"><Mountain size={20} className="text-orange-600" /></div>
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800 italic mb-1">Outdoor & Sport</h4>
                <p className="text-xs text-slate-600 leading-relaxed">Ga je alleen wandelen of sporten? Stel een deadline in voor je verwachte terugkomst als veiligheidsnet.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-orange-200 p-5 rounded-3xl shadow-sm mt-8">
          <div className="flex items-center gap-2 mb-2">
            <Dog size={16} className="text-orange-600" />
            <h4 className="text-xs font-black uppercase text-orange-900 tracking-tight">De betekenis van Barkr</h4>
          </div>
          <p className="text-xs font-medium text-slate-600 leading-relaxed">
            Barkr is afgeleid van het Engelse 'Barker' (blaffer). Het staat voor een trouwe digitale waakhond die over je waakt en pas van zich laat horen als er daadwerkelijk iets mis is.
          </p>
        </div>

      </div>
    </div>
  );
}
