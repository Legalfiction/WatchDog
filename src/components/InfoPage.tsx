import React from 'react';
import { 
  X, Plane, Briefcase, Home, Mountain, Heart, Shield, Zap, Dog,
  Smartphone, BellRing, Globe, Mail, Clock, Info
} from 'lucide-react';

interface InfoPageProps {
  onClose: () => void;
  lang: string;
  t: (key: string, lang: string) => string;
}

export default function InfoPage({ onClose, lang, t }: InfoPageProps) {
  return (
    <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 pb-20 no-scrollbar">
      <header className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Handleiding</h2>
        <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm border border-slate-100">
          <X size={20}/>
        </button>
      </header>

      <div className="space-y-6">
        
        {/* DE BETEKENIS VAN BARKR */}
        <div className="bg-white border border-orange-100 p-5 rounded-3xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Dog size={18} className="text-orange-600" />
            <h4 className="text-xs font-black uppercase tracking-widest text-orange-600">De betekenis van Barkr</h4>
          </div>
          <p className="text-sm font-medium text-slate-700 leading-relaxed">
            Barkr is afgeleid van het Engelse 'Barker' (blaffer). Het staat voor een trouwe digitale waakhond die over je waakt wanneer je alleen bent. Net zoals een echte waakhond slaat Barkr alarm wanneer er iets niet pluis is, om zo de mensen die om je geven te waarschuwen.
          </p>
        </div>

        {/* WAAROM DEZE APPLICATIE? */}
        <div>
          <div className="flex items-center gap-2 mb-4 px-1">
            <Heart size={14} className="text-slate-400" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Waarom deze applicatie?</h3>
          </div>
          
          <div className="space-y-3">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex gap-4">
              <div className="text-orange-500 mt-0.5"><Smartphone size={20} /></div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">Welzijnsbewaking</h4>
                <p className="text-xs text-slate-600 leading-relaxed">Ontworpen voor mensen die alleen wonen of werken. Het biedt een vangnet zonder je privacy te schenden; we kijken alleen of je actief bent.</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex gap-4">
              <div className="text-orange-500 mt-0.5"><BellRing size={20} /></div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">Automatische Escalatie</h4>
                <p className="text-xs text-slate-600 leading-relaxed">Indien je binnen je persoonlijke tijdvenster geen teken van leven geeft, worden je noodcontacten direct per WhatsApp op de hoogte gebracht.</p>
              </div>
            </div>
          </div>
        </div>

        {/* WANNEER GEBRUIK JE BARKR? */}
        <div>
          <div className="flex items-center gap-2 mb-4 px-1">
            <Zap size={14} className="text-slate-400" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Wanneer gebruik je Barkr?</h3>
          </div>

          {/* GROEP 1: DAGELIJKSE CHECK-IN */}
          <div className="bg-orange-50 border border-orange-100 rounded-[28px] p-2 mb-4 shadow-sm">
            <div className="px-4 pt-3 pb-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-800">De Dagelijkse Check-in</h4>
            </div>
            
            <div className="space-y-2">
              <div className="bg-white p-4 rounded-2xl shadow-sm flex gap-4">
                <div className="bg-orange-100 p-2.5 rounded-xl h-fit"><Heart size={20} className="text-orange-600" /></div>
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 italic mb-1">Ouderen</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">Een geruststelling voor kinderen of bekenden. Met een vaste ochtend-deadline weten zij direct dat alles in orde is, zolang de telefoon maar regulier gebruikt wordt.</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm flex gap-4">
                <div className="bg-orange-100 p-2.5 rounded-xl h-fit"><Home size={20} className="text-orange-600" /></div>
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 italic mb-1">Alleenwonenden</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">Een laagdrempelige check-in (vaak voor de jongere groep). Voor de omgeving én de gebruiker is het fijn om te laten weten dat je veilig aan de dag bent begonnen.</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm flex gap-4">
                <div className="bg-orange-100 p-2.5 rounded-xl h-fit"><Shield size={20} className="text-orange-600" /></div>
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 italic mb-1">Zorgdragers</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">Zorg je (deels) alleen voor een verstandelijk beperkt of afhankelijk persoon? Als jij onverhoopt uitvalt, worden anderen direct gewaarschuwd om de zorg over te nemen.</p>
                </div>
              </div>
            </div>
          </div>

          {/* GROEP 2: INCIDENTEEL GEBRUIK */}
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4">
              <div className="bg-orange-50 p-2.5 rounded-xl h-fit"><Plane size={20} className="text-orange-600" /></div>
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800 italic mb-1">De Vroege Reiziger</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">Vlieg je vroeg? Stel je deadline vlak na je wekker in. Verslaap je je? Dan krijgen je reisgenoten direct bericht.</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4">
              <div className="bg-orange-50 p-2.5 rounded-xl h-fit"><Briefcase size={20} className="text-orange-600" /></div>
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800 italic mb-1">Afspraak & Werk</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">Laat familie of collega's automatisch weten als je niet op tijd 'online' bent gekomen of verschenen bent.</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4">
              <div className="bg-orange-50 p-2.5 rounded-xl h-fit"><Mountain size={20} className="text-orange-600" /></div>
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800 italic mb-1">Outdoor & Sport</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">Ga je alleen wandelen of sporten? Stel een deadline in voor je verwachte terugkomst als veiligheidsnet.</p>
              </div>
            </div>
          </div>
        </div>

        {/* HOE GEBRUIK JE BARKR? */}
        <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Clock size={18} className="text-orange-700" />
            <h4 className="text-[11px] font-black uppercase tracking-widest text-orange-900">Hoe gebruik je Barkr?</h4>
          </div>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-xs shrink-0">1</div>
              <div>
                <h5 className="text-sm font-bold text-orange-900 mb-1">Configuratie</h5>
                <p className="text-xs text-orange-800/80 leading-relaxed">Voer je naam in en stel je kritieke venster in (bijv. 07:00 - 08:30). Voeg minimaal één noodcontact toe.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-xs shrink-0">2</div>
              <div>
                <h5 className="text-sm font-bold text-orange-900 mb-1">Activering</h5>
                <p className="text-xs text-orange-800/80 leading-relaxed">
                  Open de applicatie minimaal één keer binnen je tijdvenster. Hierna kan de app gewoon op de achtergrond blijven draaien zonder dat je verder iets hoeft te doen.
                </p>
                <p className="text-[10px] italic text-orange-700/70 mt-1.5 leading-snug">
                  (Let op: in een volgende versie van Barkr maken we dit proces nog verder geautomatiseerd en eenvoudiger.)
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-xs shrink-0">3</div>
              <div>
                <h5 className="text-sm font-bold text-orange-900 mb-1">Veiligheid</h5>
                <p className="text-xs text-orange-800/80 leading-relaxed">Zodra je de deadline haalt, staakt het systeem de bewaking voor die dag. Mis je de deadline? Dan volgt het alarm.</p>
              </div>
            </div>
          </div>
        </div>

        {/* MEER INFORMATIE & SUPPORT */}
        <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <Info size={16} className="text-orange-500" />
            <h4 className="text-[11px] font-black uppercase tracking-widest text-orange-400">Meer informatie & support</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-5">
            Bezoek onze website voor uitgebreide documentatie of neem contact op voor hulp.
          </p>
          
          <div className="space-y-3">
            <div className="bg-slate-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="bg-orange-600 p-2 rounded-full"><Globe size={16} className="text-white"/></div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Website</p>
                <p className="text-sm font-bold text-white">www.barkr.nl</p>
              </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="bg-blue-600 p-2 rounded-full"><Mail size={16} className="text-white"/></div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Email</p>
                <p className="text-sm font-bold text-white">info@barkr.nl</p>
              </div>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="w-full py-4 bg-orange-600 hover:bg-orange-700 transition-colors text-white font-black uppercase rounded-2xl tracking-[0.1em] shadow-md">
          Sluiten
        </button>

      </div>
    </div>
  );
}
