import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Activity, ShieldCheck, Dog, Clock, Info, ExternalLink, Mail, AlertTriangle, Wifi, Smartphone, BellRing, HeartPulse, Plane, Briefcase, Home, Mountain, Zap
} from 'lucide-react';

const ENDPOINTS = ['https://barkr.nl', 'http://192.168.1.38:5000'];
const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

// --- VOLLEDIGE TAAL CONFIGURATIE ---
const LANGUAGES: any = {
  NL: { flag: '🇳🇱', prefix: '+31', name: 'Nederlands' },
  EN: { flag: '🇬🇧', prefix: '+44', name: 'English (UK)' },
  US: { flag: '🇺🇸', prefix: '+1', name: 'English (US)' },
  DE: { flag: '🇩🇪', prefix: '+49', name: 'Deutsch' },
  FR: { flag: '🇫🇷', prefix: '+33', name: 'Français' },
  BE: { flag: '🇧🇪', prefix: '+32', name: 'België' },
  ES: { flag: '🇪🇸', prefix: '+34', name: 'Español' },
  IT: { flag: '🇮🇹', prefix: '+39', name: 'Italiano' },
  PL: { flag: '🇵🇱', prefix: '+48', name: 'Polski' },
  TR: { flag: '🇹🇷', prefix: '+90', name: 'Türkçe' }
};

const TRANSLATIONS: any = {
  NL: {
    vigilant: 'Barkr is waakzaam', idle: 'Systeem in rust', offline: 'Geen verbinding', tap_sleep: 'Tik om te slapen', heartbeat: 'Systeem Hartslag', manual: 'Handleiding', setup: 'Barkr Setup', user_name: 'Naam Gebruiker', smart_plan: 'Slimme Planning', win_day: 'Vensters per dag', start: 'Start', deadline: 'Deadline', contacts: 'Contacten', c_name: 'Naam', c_phone: 'Telefoonnummer', test: 'TEST VERBINDING', save: 'Configuratie Opslaan', close: 'Sluiten', ok: 'Begrepen', barkr_mean: 'De betekenis van Barkr', barkr_desc: 'Barkr is afgeleid van het Engelse \'Barker\' (blaffer). Het staat voor een trouwe digitale waakhond die over je waakt. Net als een echte hond slaat hij aan wanneer er een ongewone situatie optreedt.', why: 'Waarom deze applicatie?', why_desc1: 'Welzijnsbewaking voor mensen die alleen wonen of werken. Barkr biedt een vangnet zonder inbreuk op je privacy.', why_desc2: 'Bij inactiviteit tijdens je tijdvenster worden je noodcontacten direct per WhatsApp geïnformeerd.', how: 'Hoe gebruik je Barkr?', how_step1: 'Stel je naam in, bepaal je venster en deadline, en voeg je noodcontacten toe.', how_step2: 'Houd de app geopend op je scherm. Barkr registreert passief je aanwezigheid zolang je het toestel bedient.', how_step3: 'Geen signaal gemeten bij de deadline? Barkr slaat direct alarm via WhatsApp.', ins_title: 'Inspiratie: Wanneer zet je Barkr in?', ins_1_t: 'De Vroege Reiziger', ins_1_d: 'Vlieg je vroeg? Stel je deadline vlak na je wekker in. Verslaap je je? Dan krijgen je reisgenoten direct bericht.', ins_2_t: 'Afspraak & Werk', ins_2_d: 'Laat familie of collega\'s automatisch weten als je niet op tijd \'online\' bent bij belangrijke verplichtingen.', ins_3_t: 'Alleenwonenden', ins_3_d: 'Barkr is je dagelijkse check-in. Als je in de ochtend je toestel niet gebruikt, weten je naasten dat ze even moeten kijken.', ins_4_t: 'Outdoor & Sport', ins_4_d: 'Ga je alleen wandelen of sporten? Stel een deadline in voor je verwachte terugkomst.', info_support: 'Informatie & Support', launch_alert: 'Belangrijk: Opstarten', launch_desc: 'In deze fase dient de app handmatig opgestart te worden. Zodra de app in beeld is, mag deze op de achtergrond blijven draaien. Native Android/Apple apps volgen spoedig.'
  },
  EN: {
    vigilant: 'Barkr is vigilant', idle: 'System idle', offline: 'No connection', tap_sleep: 'Tap to sleep', heartbeat: 'System Heartbeat', manual: 'Manual', setup: 'Barkr Setup', user_name: 'User Name', smart_plan: 'Smart Planning', win_day: 'Windows per day', start: 'Start', deadline: 'Deadline', contacts: 'Contacts', c_name: 'Name', c_phone: 'Phone Number', test: 'TEST CONNECTION', save: 'Save Configuration', close: 'Close', ok: 'Understood', barkr_mean: 'The meaning of Barkr', barkr_desc: 'Barkr is derived from \'Barker\'. It represents a loyal digital watchdog that watches over you. Like a real dog, it alerts when an unusual situation occurs.', why: 'Why this application?', why_desc1: 'Well-being monitoring for people living or working alone. Barkr provides a safety net without invading your privacy.', why_desc2: 'In case of inactivity during your window, your emergency contacts are informed via WhatsApp.', how: 'How to use Barkr?', how_step1: 'Set your name, window, and deadline, and add your emergency contacts.', how_step2: 'Keep the app open on your screen. Barkr passively registers your presence while you use the device.', how_step3: 'No signal measured by the deadline? Barkr triggers an alarm via WhatsApp.', ins_title: 'Inspiration: When to use Barkr?', ins_1_t: 'The Early Traveler', ins_1_d: 'Flying early? Set your deadline just after your alarm. Overslept? Your travel mates get notified immediately.', ins_2_t: 'Meeting & Work', ins_2_d: 'Automatically let family or colleagues know if you aren\'t \'online\' in time for important obligations.', ins_3_t: 'Living Alone', ins_3_d: 'Barkr is your daily check-in. If you don\'t use your device in the morning, loved ones know to check in.', ins_4_t: 'Outdoor & Sports', ins_4_d: 'Going hiking or sports alone? Set a deadline for your expected return.', info_support: 'Information & Support', launch_alert: 'Important: Startup', launch_desc: 'Currently, the app must be started manually. Once open, it can run in the background. Native Android/Apple apps are coming soon.'
  },
  ES: {
    vigilant: 'Barkr está vigilante', idle: 'Sistema en reposo', offline: 'Sin conexión', tap_sleep: 'Toca para dormir', heartbeat: 'Latido del sistema', manual: 'Manual', setup: 'Configuración Barkr', user_name: 'Nombre de usuario', smart_plan: 'Planificación inteligente', win_day: 'Ventanas por día', start: 'Inicio', deadline: 'Fecha límite', contacts: 'Contactos', c_name: 'Nombre', c_phone: 'Número de teléfono', test: 'PROBAR CONEXIÓN', save: 'Guardar configuración', close: 'Cerrar', ok: 'Entendido', barkr_mean: 'El significado de Barkr', barkr_desc: 'Barkr proviene de \'Barker\' (el que ladra). Representa a un fiel perro guardián digital. Al igual que un perro real, alerta cuando ocurre una situación inusual.', why: '¿Por qué esta aplicación?', why_desc1: 'Monitoreo del bienestar para personas que viven o trabajan solas. Barkr ofrece una red de seguridad sin invadir tu privacidad.', why_desc2: 'En caso de inactividad durante tu horario, tus contactos de emergencia serán informados vía WhatsApp.', how: '¿Cómo usar Barkr?', how_step1: 'Configura tu nombre, horario y fecha límite, y añade tus contactos.', how_step2: 'Mantén la aplicación abierta. Barkr registra pasivamente tu presencia mientras usas el dispositivo.', how_step3: '¿Sin señal al llegar la fecha límite? Barkr activa una alarma vía WhatsApp.', ins_title: 'Inspiración: ¿Cuándo usar Barkr?', ins_1_t: 'El viajero madrugador', ins_1_d: '¿Vuelo temprano? Ajusta la fecha límite después de tu alarma. ¿Te quedaste dormido? Tus compañeros reciben un aviso.', ins_2_t: 'Citas y trabajo', ins_2_d: 'Informa automáticamente si no estás en línea a tiempo para obligaciones importantes.', ins_3_t: 'Viviendo solo', ins_3_d: 'Barkr es tu registro diario. Si no usas el dispositivo por la mañana, tus seres queridos lo sabrán.', ins_4_t: 'Aire libre y deportes', ins_4_d: '¿Sales a caminar solo? Establece una hora de regreso prevista.', info_support: 'Información y soporte', launch_alert: 'Importante: Inicio', launch_desc: 'Actualmente, la app debe iniciarse manualmente. Una vez abierta, puede funcionar en segundo plano. Próximamente apps nativas.'
  },
  DE: {
    vigilant: 'Barkr ist wachsam', idle: 'System im Ruhemodus', offline: 'Keine Verbindung', tap_sleep: 'Tippen zum Schlafen', heartbeat: 'System-Herzschlag', manual: 'Handbuch', setup: 'Barkr Setup', user_name: 'Benutzername', smart_plan: 'Smarte Planung', win_day: 'Fenster pro Tag', start: 'Start', deadline: 'Deadline', contacts: 'Kontakte', c_name: 'Name', c_phone: 'Telefonnummer', test: 'VERBINDUNG TESTEN', save: 'Konfiguration speichern', close: 'Schließen', ok: 'Verstanden', barkr_mean: 'Die Bedeutung von Barkr', barkr_desc: 'Barkr leitet sich von \'Barker\' (Beller) ab. Es steht für einen treuen digitalen Wachhund. Wie ein echter Hund schlägt er bei ungewöhnlichen Situationen an.', why: 'Warum diese App?', why_desc1: 'Wohlergehens-Überwachung für Alleinlebende. Barkr bietet ein Sicherheitsnetz ohne Privatsphäre-Eingriff.', why_desc2: 'Bei Inaktivität während Ihres Zeitfensters werden Ihre Notfallkontakte sofort per WhatsApp informiert.', how: 'Wie benutzt man Barkr?', how_step1: 'Name, Fenster und Deadline einstellen und Kontakte hinzufügen.', how_step2: 'App auf dem Bildschirm offen lassen. Barkr registriert passiv Ihre Anwesenheit.', how_step3: 'Kein Signal bis zur Deadline? Barkr löst sofort Alarm via WhatsApp aus.', ins_title: 'Inspiration: Wann nutzt man Barkr?', ins_1_t: 'Frühreisende', ins_1_d: 'Früher Flug? Deadline kurz nach den Wecker stellen. Verschlafen? Ihre Mitreisenden werden sofort benachrichtigt.', ins_2_t: 'Termine & Arbeit', ins_2_d: 'Familie oder Kollegen automatisch informieren, wenn Sie nicht rechtzeitig \'online\' sind.', ins_3_t: 'Alleinlebende', ins_3_d: 'Barkr ist Ihr täglicher Check-in. Wenn Sie das Gerät morgens nicht nutzen, wissen Angehörige Bescheid.', ins_4_t: 'Outdoor & Sport', ins_4_d: 'Allein wandern oder Sport treiben? Deadline für die Rückkehr setzen.', info_support: 'Info & Support', launch_alert: 'Wichtig: Starten', launch_desc: 'In dieser Phase muss die App manuell gestartet werden. Danach kann sie im Hintergrund laufen. Native Apps folgen bald.'
  },
  FR: {
    vigilant: 'Barkr est vigilant', idle: 'Système au repos', offline: 'Pas de connexion', tap_sleep: 'Appuyer pour dormir', heartbeat: 'Battement du système', manual: 'Manuel', setup: 'Configuration Barkr', user_name: 'Nom d\'utilisateur', smart_plan: 'Planning Intelligent', win_day: 'Fenêtres par jour', start: 'Début', deadline: 'Date limite', contacts: 'Contacts', c_name: 'Nom', c_phone: 'Numéro de téléphone', test: 'TESTER LA CONNEXION', save: 'Enregistrer', close: 'Fermer', ok: 'Compris', barkr_mean: 'La signification de Barkr', barkr_desc: 'Barkr vient de \'Barker\' (aboyeur). C\'est un chien de garde numérique fidèle. Comme un vrai chien, il alerte en cas de situation inhabituelle.', why: 'Pourquoi cette application ?', why_desc1: 'Suivi du bien-être pour les personnes vivant seules. Un filet de sécurité sans intrusion.', why_desc2: 'En cas d\'inactivité, vos contacts d\'urgence sont informés par WhatsApp.', how: 'Comment utiliser Barkr ?', how_step1: 'Réglez votre nom, fenêtre et deadline, et ajoutez vos contacts.', how_step2: 'Gardez l\'app ouverte. Barkr enregistre passivement votre présence.', how_step3: 'Pas de signal à l\'échéance ? Barkr déclenche l\'alarme via WhatsApp.', ins_title: 'Inspiration : Quand utiliser Barkr ?', ins_1_t: 'Le Voyageur Matinal', ins_1_d: 'Vol matinal ? Réglez la deadline après le réveil. En retard ? Vos compagnons sont alertés.', ins_2_t: 'Rendez-vous & Travail', ins_2_d: 'Prévenez automatiquement si vous n\'êtes pas \'en ligne\' pour vos obligations.', ins_3_t: 'Personnes Seules', ins_3_d: 'Barkr est votre check-in quotidien. Sans activité le matin, vos proches sont prévenus.', ins_4_t: 'Outdoor & Sport', ins_4_d: 'Randonnée en solo ? Fixez une heure de retour prévue.', info_support: 'Info & Support', launch_alert: 'Important : Démarrage', launch_desc: 'L\'app doit être lancée manuellement. Elle peut ensuite tourner en arrière-plan. Apps natives à venir.'
  },
  IT: {
    vigilant: 'Barkr è vigile', idle: 'Sistema a riposo', offline: 'Nessuna connessione', tap_sleep: 'Tocca per dormire', heartbeat: 'Battito del sistema', manual: 'Manuale', setup: 'Configurazione Barkr', user_name: 'Nome utente', smart_plan: 'Pianificazione intelligente', win_day: 'Finestre al giorno', start: 'Inizio', deadline: 'Scadenza', contacts: 'Contatti', c_name: 'Nome', c_phone: 'Numero di telefono', test: 'TEST CONNESSIONE', save: 'Salva configurazione', close: 'Chiudi', ok: 'Capito', barkr_mean: 'Il significato di Barkr', barkr_desc: 'Barkr deriva da \'Barker\' (colui che abbaia). Rappresenta un fedele cane da guardia digitale. Come un cane vero, avverte quando si verifica una situazione insolita.', why: 'Perché questa applicazione?', why_desc1: 'Monitoraggio del benessere per chi vive o lavora solo. Barkr offre una rete di sicurezza senza invadere la privacy.', why_desc2: 'In caso di inattività, i tuoi contatti di emergenza vengono informati via WhatsApp.', how: 'Come usare Barkr?', how_step1: 'Imposta nome, finestra e scadenza e aggiungi i contatti.', how_step2: 'Tieni l\'app aperta. Barkr registra passivamente la tua presenza.', how_step3: 'Nessun segnale alla scadenza? Barkr attiva l\'allarme via WhatsApp.', ins_title: 'Ispirazione: Quando usare Barkr?', ins_1_t: 'Il viaggiatore mattutino', ins_1_d: 'Volo presto? Imposta la scadenza dopo la sveglia. Ti sei addormentato? I tuoi compagni vengono avvisati.', ins_2_t: 'Appuntamenti e lavoro', ins_2_d: 'Informa automaticamente se non sei online in tempo per impegni importanti.', ins_3_t: 'Vivere da soli', ins_3_d: 'Barkr è il tuo check-in quotidiano. Se non usi il dispositivo, i tuoi cari lo sapranno.', ins_4_t: 'Outdoor e sport', ins_4_d: 'Escursioni in solitaria? Imposta un orario di rientro previsto.', info_support: 'Info e supporto', launch_alert: 'Importante: Avvio', launch_desc: 'L\'app deve essere avviata manualmente. Una volta aperta, può girare in background. App native in arrivo.'
  },
  PL: {
    vigilant: 'Barkr czuwa', idle: 'System w spoczynku', offline: 'Brak połączenia', tap_sleep: 'Dotknij, aby uśpić', heartbeat: 'Tętno systemu', manual: 'Instrukcja', setup: 'Konfiguracja Barkr', user_name: 'Nazwa użytkownika', smart_plan: 'Inteligentne planowanie', win_day: 'Okna na dzień', start: 'Początek', deadline: 'Termin', contacts: 'Kontakty', c_name: 'Nazwa', c_phone: 'Numer telefonu', test: 'TEST POŁĄCZENIA', save: 'Zapisz konfigurację', close: 'Zamknij', ok: 'Rozumiem', barkr_mean: 'Znaczenie Barkr', barkr_desc: 'Barkr pochodzi od słowa \'Barker\' (szczekający). To wierny cyfrowy pies stróżujący. Jak prawdziwy pies, alarmuje w nietypowych sytuacjach.', why: 'Dlaczego ta aplikacja?', why_desc1: 'Monitorowanie dobrostanu dla osób samotnych. Barkr zapewnia bezpieczeństwo bez naruszania prywatności.', why_desc2: 'W przypadku braku aktywności, Twoje kontakty zostaną powiadomione przez WhatsApp.', how: 'Jak używać Barkr?', how_step1: 'Ustaw nazwę, okno czasowe i dodaj kontakty.', how_step2: 'Trzymaj aplikację otwartą. Barkr rejestruje Twoją obecność podczas używania urządzenia.', how_step3: 'Brak sygnału w terminie? Barkr wysyła alarm przez WhatsApp.', ins_title: 'Inspiracja: Kiedy używać Barkr?', ins_1_t: 'Wczesny podróżnik', ins_1_d: 'Wczesny lot? Ustaw termin po budziku. Zaspałeś? Twoi towarzysze zostaną powiadomieni.', ins_2_t: 'Spotkania i praca', ins_2_d: 'Automatycznie informuj bliskich, jeśli nie jesteś online na ważne spotkania.', ins_3_t: 'Samotne mieszkanie', ins_3_d: 'Barkr to Twój codzienny check-in. Brak aktywności rano powiadomi bliskich.', ins_4_t: 'Outdoor i sport', ins_4_d: 'Samotne wędrówki? Ustaw planowany czas powrotu.', info_support: 'Info i wsparcie', launch_alert: 'Ważne: Uruchomienie', launch_desc: 'Aplikację należy uruchomić ręcznie. Może działać w tle. Wkrótce pojawią się aplikacje natywne.'
  },
  TR: {
    vigilant: 'Barkr nöbette', idle: 'Sistem uykuda', offline: 'Bağlantı yok', tap_sleep: 'Uyutmak için dokun', heartbeat: 'Sistem Nabzı', manual: 'Kılavuz', setup: 'Barkr Kurulumu', user_name: 'Kullanıcı Adı', smart_plan: 'Akıllı Planlama', win_day: 'Günlük Pencereler', start: 'Başlangıç', deadline: 'Son Tarih', contacts: 'Kişiler', c_name: 'İsim', c_phone: 'Telefon Numarası', test: 'BAĞLANTIYI TEST ET', save: 'Yapılandırmayı Kaydet', close: 'Kapat', ok: 'Anlaşıldı', barkr_mean: 'Barkr\'ın Anlamı', barkr_desc: 'Barkr, \'Barker\' (havlayan) kelimesinden türetilmiştir. Sizi koruyan sadık bir dijital bekçi köpeğini temsil eder. Gerçek bir köpek gibi, olağandışı bir durumda uyarı verir.', why: 'Neden bu uygulama?', why_desc1: 'Yalnız yaşayanlar için refah izleme. Gizliliğinizi ihlal etmeden bir güvenlik ağı sunar.', why_desc2: 'Belirlenen sürede hareketsizlik durumunda, acil durum kişilerinize WhatsApp üzerinden haber verilir.', how: 'Barkr nasıl kullanılır?', how_step1: 'İsminizi, sürenizi ve son tarihinizi ayarlayın, kişilerinizi ekleyin.', how_step2: 'Uygulamayı açık tutun. Barkr, cihazı kullanırken varlığınızı pasif olarak kaydeder.', how_step3: 'Süre dolduğunda sinyal yok mu? Barkr WhatsApp üzerinden alarm verir.', ins_title: 'İlham: Barkr ne zaman kullanılır?', ins_1_t: 'Erken Yolcu', ins_1_d: 'Erken uçuş mu? Son tarihi alarmınızdan hemen sonraya kurun. Uyuyakalırsanız yol arkadaşlarınız anında haber alır.', ins_2_t: 'Randevu ve İş', ins_2_d: 'Önemli görevler için zamanında online olmazsanız ailenize otomatik haber verin.', ins_3_t: 'Yalnız Yaşayanlar', ins_3_d: 'Barkr günlük check-in aracınızdır. Sabah cihazı kullanmazsanız sevdikleriniz durumu anlar.', ins_4_t: 'Outdoor ve Spor', ins_4_d: 'Yalnız yürüyüş mü? Beklenen dönüş saatiniz için bir son tarih belirleyin.', info_support: 'Bilgi ve Destek', launch_alert: 'Önemli: Başlatma', launch_desc: 'Şu an uygulama manuel başlatılmalıdır. Açıldıktan sonra arka planda çalışabilir. Yakında mobil uygulamalar gelecek.'
  }
};

// Aliases
TRANSLATIONS.US = TRANSLATIONS.EN;
TRANSLATIONS.BE = TRANSLATIONS.NL;

const t = (key: string, lang: string) => (TRANSLATIONS[lang] || TRANSLATIONS['NL'])[key] || key;

export default function App() {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'searching' | 'connected' | 'offline'>('searching');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [lastPing, setLastPing] = useState('--:--');
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    return saved ? JSON.parse(saved) : {
      name: '', vacationMode: false, useCustomSchedule: false, language: 'NL',
      activeDays: [0, 1, 2, 3, 4, 5, 6], startTime: '07:00', endTime: '08:30',
      contacts: [], schedules: {}
    };
  });

  const lang = settings.language || 'NL';

  useEffect(() => {
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
    if (!activeUrl) return;
    const timer = setTimeout(() => {
      fetch(`${activeUrl}/save_settings`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(settings)
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [settings, activeUrl]);

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

  useEffect(() => {
    if (status !== 'connected' || !activeUrl || settings.vacationMode) return;
    const sendPing = () => {
      if (document.visibilityState === 'visible') {
        fetch(`${activeUrl}/ping`, { 
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: settings.name, secret: 'BARKR_SECURE_V1' })
        }).then(res => {
          if(res.ok) setLastPing(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
        }).catch(() => {});
      }
    };
    if (document.visibilityState === 'visible') sendPing();
    const pingInterval = setInterval(sendPing, 5000); 
    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') sendPing(); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => { clearInterval(pingInterval); document.removeEventListener('visibilitychange', handleVisibilityChange); };
  }, [status, activeUrl, settings.vacationMode, settings.name]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <style>{`
        @keyframes bounce-zz { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-15px); opacity: 1; } }
        .animate-zz { animation: bounce-zz 2.5s infinite ease-in-out; }
      `}</style>
      
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-1.5 rounded-lg shadow-sm"><Dog size={20} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-black italic tracking-tighter text-slate-800 uppercase">Barkr</h1>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? (settings.vacationMode ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-red-500'}`} />
              <span className={status === 'connected' ? (settings.vacationMode ? 'text-blue-600' : 'text-emerald-600') : 'text-red-500'}>
                {status === 'offline' ? t('offline', lang) : status === 'searching' ? '...' : settings.vacationMode ? t('idle', lang) : t('vigilant', lang)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><Info size={20} className="text-slate-600"/></button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><Settings size={20} className="text-slate-600"/></button>
        </div>
      </header>

      {!showSettings && !showManual && (
        <main className="flex-1 p-6 flex flex-col items-center justify-start pt-16 space-y-12">
          <div className="flex flex-col items-center gap-8 w-full">
            <button 
              onClick={() => setSettings({...settings, vacationMode: !settings.vacationMode})}
              disabled={status !== 'connected'}
              className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl overflow-hidden border-[10px] ${
                status !== 'connected' ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' : 
                settings.vacationMode ? 'bg-slate-900 border-slate-700' : 'bg-orange-600 border-orange-700'
              }`}
            >
              {status !== 'connected' ? <Wifi size={80} className="text-slate-400 animate-pulse"/> : 
               settings.vacationMode ? (
                <div className="flex flex-col items-center justify-center relative w-full h-full">
                  <div className="absolute top-16 right-20 flex font-black text-blue-300 pointer-events-none z-10"><span className="text-3xl animate-zz">Z</span><span className="text-2xl animate-zz ml-1">z</span><span className="text-xl animate-zz ml-1">z</span></div>
                  <img src="/logo.png" alt="Barkr Logo" className="w-full h-full object-cover scale-[1.02] opacity-40 grayscale" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full relative">
                   <img src="/logo.png" alt="Barkr Logo" className="w-full h-full object-cover scale-[1.02] drop-shadow-xl" />
                   <div className="absolute bottom-6 inset-x-0 text-center">
                      <span className="text-[11px] font-black uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] tracking-widest px-4 font-black italic">{t('tap_sleep', lang)}</span>
                   </div>
                </div>
              )}
            </button>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 w-full max-w-xs text-center shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest"><Activity size={12} className="inline mr-1"/> {t('heartbeat', lang)}</p>
             <p className="text-4xl font-black text-slate-800 tabular-nums">{lastPing}</p>
          </div>
        </main>
      )}

      {showManual && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-8 pb-20">
          <header className="flex justify-between items-center py-2"><h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-800">{t('manual', lang)}</h2><button onClick={() => setShowManual(false)} className="p-2 bg-white rounded-full shadow-md border border-slate-100"><X size={24}/></button></header>
          
          <section className="bg-blue-600 p-6 rounded-[32px] text-white shadow-lg space-y-3 relative overflow-hidden">
            <h4 className="font-black flex items-center gap-2 uppercase text-xs tracking-[0.15em]"><AlertTriangle size={18} className="text-orange-400"/> {t('launch_alert', lang)}</h4>
            <p className="text-sm leading-relaxed font-bold">{t('launch_desc', lang)}</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-2"><Zap size={14}/> {t('ins_title', lang)}</h3>
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex gap-4 items-start">
                  <div className="bg-orange-100 p-3 rounded-2xl text-orange-600">
                    {i===1 && <Plane size={24}/>} {i===2 && <Briefcase size={24}/>} {i===3 && <Home size={24}/>} {i===4 && <Mountain size={24}/>}
                  </div>
                  <div><h5 className="font-black text-slate-800 text-sm uppercase italic tracking-tight">{t(`ins_${i}_t`, lang)}</h5><p className="text-xs text-slate-500 leading-relaxed">{t(`ins_${i}_d`, lang)}</p></div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"><h4 className="font-black text-orange-600 flex items-center gap-2 uppercase text-xs tracking-[0.15em]"><Dog size={20}/> {t('barkr_mean', lang)}</h4><p className="text-sm text-slate-600 leading-relaxed font-medium">{t('barkr_desc', lang)}</p></section>

          <section className="bg-orange-50 p-7 rounded-[40px] border border-orange-200 space-y-5">
            <h4 className="font-black text-orange-800 flex items-center gap-2 uppercase text-xs tracking-widest"><Clock size={20}/> {t('how', lang)}</h4>
            <div className="space-y-4 font-medium">
              <div className="flex gap-4"><div className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs shadow-md">1</div><div><p className="text-sm font-bold text-orange-900">{t('setup', lang)}</p><p className="text-xs text-orange-800/70 leading-relaxed">{t('how_step1', lang)}</p></div></div>
              <div className="flex gap-4"><div className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs shadow-md">2</div><div><p className="text-sm font-bold text-orange-900">{t('vigilant', lang)}</p><p className="text-xs text-orange-800/70 leading-relaxed">{t('how_step2', lang)}</p></div></div>
              <div className="flex gap-4"><div className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs shadow-md">3</div><div><p className="text-sm font-bold text-orange-900">{t('deadline', lang)}</p><p className="text-xs text-orange-800/70 leading-relaxed">{t('how_step3', lang)}</p></div></div>
            </div>
          </section>

          <section className="bg-slate-900 p-8 rounded-[40px] text-white space-y-6 shadow-2xl">
            <h4 className="font-black flex items-center gap-2 uppercase text-xs tracking-widest text-orange-400"><ExternalLink size={18}/> {t('info_support', lang)}</h4>
            <div className="space-y-4">
              <a href="https://www.barkr.nl" target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 active:scale-95 transition-all"><div className="bg-orange-600 p-2 rounded-xl"><Wifi size={18} className="text-white"/></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Website</span><span className="font-bold text-sm tracking-tight">www.barkr.nl</span></div></a>
              <a href="mailto:info@barkr.nl" className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 active:scale-95 transition-all"><div className="bg-blue-600 p-2 rounded-xl"><Mail size={18} className="text-white"/></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Email</span><span className="font-bold text-sm tracking-tight">info@barkr.nl</span></div></a>
            </div>
          </section>

          <button onClick={() => setShowManual(false)} className="w-full py-5 bg-orange-600 text-white font-black uppercase rounded-3xl tracking-widest shadow-lg active:scale-95 transition-all">{t('ok', lang)}</button>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20">
          <header className="flex justify-between items-center mb-4"><h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">{t('setup', lang)}</h2><button onClick={() => setShowSettings(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button></header>
          
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-3 block">Language / Taal</label>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {Object.keys(LANGUAGES).map(key => (
                <button key={key} onClick={() => setSettings({...settings, language: key})} className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${settings.language === key ? 'bg-orange-600 border-orange-700 text-white shadow-md scale-105' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <span className="text-lg">{LANGUAGES[key].flag}</span><span className="text-xs font-black">{key}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div><label className="text-[10px] font-bold text-slate-400 uppercase">{t('user_name', lang)}</label><input value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700"/></div>
            <div className="flex justify-between items-center pt-2"><div><h3 className="font-bold text-slate-800 text-sm italic uppercase tracking-tighter">{t('smart_plan', lang)}</h3><p className="text-[10px] text-slate-400 uppercase font-bold text-center">{t('win_day', lang)}</p></div><button onClick={() => setSettings({...settings, useCustomSchedule: !settings.useCustomSchedule})} className={`w-12 h-7 rounded-full relative transition-colors ${settings.useCustomSchedule ? 'bg-orange-600' : 'bg-slate-200'}`}><div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.useCustomSchedule ? 'translate-x-5' : ''}`}/></button></div>
            {!settings.useCustomSchedule ? (
              <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-slate-400 uppercase">{t('start', lang)}</label><input type="time" value={settings.startTime} onChange={e=>setSettings({...settings, startTime:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700 text-center"/></div><div><label className="text-[10px] font-bold text-red-400 uppercase">{t('deadline', lang)}</label><input type="time" value={settings.endTime} onChange={e=>setSettings({...settings, endTime:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-red-600 text-center"/></div></div>
            ) : (
              <div className="space-y-3">{settings.activeDays.sort().map(d => (<div key={d} className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 space-y-2"><span className="text-xs font-black uppercase text-orange-800 block border-b border-orange-100 pb-1">{DAYS[d]}</span><div className="grid grid-cols-2 gap-3"><div><p className="text-[9px] font-bold text-slate-400 uppercase">{t('start', lang)}</p><input type="time" value={settings.schedules[d]?.startTime || settings.startTime} onChange={e=>{setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], startTime:e.target.value}}})}} className="w-full bg-white px-2 py-1.5 rounded-lg border border-orange-200 text-xs font-bold text-slate-700 text-center"/></div><div><p className="text-[9px] font-bold text-red-400 uppercase">{t('deadline', lang)}</p><input type="time" value={settings.schedules[d]?.endTime || settings.endTime} onChange={e=>{setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], endTime:e.target.value}}})}} className="w-full bg-white px-2 py-1.5 rounded-lg border border-orange-200 text-xs font-bold text-red-600 text-center"/></div></div></div>))}</div>
            )}
          </div>
          <div><label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block mb-2 px-1">{t('contacts', lang)}</label>
            <button onClick={()=> {
              const prefix = LANGUAGES[lang]?.prefix || '';
              setSettings({...settings, contacts:[...settings.contacts, {name:'', phone: prefix}]})
            }} className="w-full bg-orange-600 text-white p-3 rounded-xl shadow-md flex justify-center mb-4"><Plus size={20}/></button>
            <div className="space-y-4">{settings.contacts.map((c, i) => (<div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative space-y-4"><button onClick={()=> {const n=[...settings.contacts]; n.splice(i,1); setSettings({...settings, contacts:n})}} className="absolute top-4 right-4 text-slate-300"><Trash2 size={18}/></button><div><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">{t('c_name', lang)}</label><input placeholder={t('c_name', lang)} value={c.name} onChange={e=>{const n=[...settings.contacts]; n[i].name=e.target.value; setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none"/></div><div><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">{t('c_phone', lang)}</label><input placeholder="+.." value={c.phone} onChange={e=>{const n=[...settings.contacts]; n[i].phone=e.target.value; setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-mono text-slate-600 outline-none"/></div><button onClick={() => activeUrl && fetch(`${activeUrl}/test_contact`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(c)})} className="w-full bg-emerald-50 text-emerald-600 text-[10px] font-black py-2 rounded-lg border border-emerald-100 flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"><ShieldCheck size={14}/> {t('test', lang)}</button></div>))}</div>
          </div>
          <button onClick={() => setShowSettings(false)} className="w-full py-5 bg-slate-900 text-white font-black uppercase rounded-[28px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all">{t('save', lang)}</button>
        </div>
      )}
    </div>
  );
}
