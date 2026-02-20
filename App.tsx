import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Activity, ShieldCheck, Dog, Clock, Info, ExternalLink, Mail, AlertTriangle, Wifi, Smartphone, BellRing, HeartPulse, Plane, Briefcase, Home, Mountain, Zap, CalendarDays, ChevronDown
} from 'lucide-react';

const ENDPOINTS = ['https://barkr.nl', 'http://192.168.1.38:5000'];

// --- 100% VOLLEDIGE TAAL & DAGEN CONFIGURATIE ---
const LANGUAGES: any = {
  NL: { flag: '🇳🇱', prefix: '+31', name: 'Nederlands', days: ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'] },
  EN: { flag: '🇬🇧', prefix: '+44', name: 'English (UK)', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
  US: { flag: '🇺🇸', prefix: '+1', name: 'English (US)', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
  DE: { flag: '🇩🇪', prefix: '+49', name: 'Deutsch', days: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] },
  FR: { flag: '🇫🇷', prefix: '+33', name: 'Français', days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] },
  BE: { flag: '🇧🇪', prefix: '+32', name: 'België (NL)', days: ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'] },
  ES: { flag: '🇪🇸', prefix: '+34', name: 'Español', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] },
  IT: { flag: '🇮🇹', prefix: '+39', name: 'Italiano', days: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'] },
  PL: { flag: '🇵🇱', prefix: '+48', name: 'Polski', days: ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'] },
  TR: { flag: '🇹🇷', prefix: '+90', name: 'Türkçe', days: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'] }
};

const TRANSLATIONS: any = {
  NL: {
    vigilant: 'Barkr is waakzaam', idle: 'Systeem in rust', offline: 'Geen verbinding', tap_sleep: 'Tik om te slapen', heartbeat: 'Systeem Hartslag', manual: 'Handleiding', setup: 'Barkr Setup', user_name: 'Naam Gebruiker', smart_plan: 'Slimme Planning', start: 'Start', deadline: 'Deadline', contacts: 'Contacten', c_name: 'Naam', c_phone: 'Telefoonnummer', test: 'TEST VERBINDING', save: 'Opslaan', close: 'Sluiten', ok: 'Begrepen', barkr_mean: 'De betekenis van Barkr', barkr_desc: 'Barkr is afgeleid van het Engelse \'Barker\' (blaffer). Het staat voor een trouwe digitale waakhond die over je waakt.', why: 'Waarom deze applicatie?', why_desc1: 'Welzijnsbewaking voor mensen die alleen wonen of werken. Barkr biedt een vangnet zonder inbreuk op je privacy.', why_desc2: 'Bij inactiviteit tijdens je tijdvenster worden je noodcontacten direct per WhatsApp geïnformeerd.', how: 'Hoe gebruik je Barkr?', how_step1: 'Stel je naam in, bepaal je venster en deadline, en voeg je noodcontacten toe.', how_step2: 'Houd de app geopend op je scherm. Barkr registreert passief je aanwezigheid zolang je het toestel bedient.', how_step3: 'Geen signaal gemeten bij de deadline? Barkr slaat direct alarm via WhatsApp.', ins_title: 'Wanneer gebruik je Barkr?', ins_1_t: 'De Vroege Reiziger', ins_1_d: 'Vlieg je vroeg? Stel je deadline vlak na je wekker in. Verslaap je je? Dan krijgen je reisgenoten direct bericht.', ins_2_t: 'Afspraak & Werk', ins_2_d: 'Laat familie of collega\'s automatisch weten als je niet op tijd \'online\' bent bij belangrijke verplichtingen.', ins_3_t: 'Alleenwonenden', ins_3_d: 'Barkr is je dagelijkse check-in. Als je in de ochtend je toestel niet gebruikt, weten je naasten dat ze even moeten kijken.', ins_4_t: 'Outdoor & Sport', ins_4_d: 'Ga je alleen wandelen of sporten? Stel een deadline in voor je verwachte terugkomst.', info_support: 'Informatie & Support', launch_alert: 'Belangrijk: Opstarten', launch_desc: 'In deze fase dient de app handmatig opgestart te worden. Zodra de app in beeld is, mag deze op de achtergrond blijven draaien. Native Android/Apple apps volgen spoedig.', smart_help_t: 'Wat is Slimme Planning?', smart_help_d: 'Hiermee kun je per dag unieke tijden instellen. Handig als je in het weekend later opstaat dan doordeweeks. Deze planning is leidend.', today: 'Vandaag', active_schedule: 'Weekplanning', toggle_on: 'AAN', toggle_off: 'UIT'
  },
  EN: {
    vigilant: 'Barkr is vigilant', idle: 'System idle', offline: 'No connection', tap_sleep: 'Tap to sleep', heartbeat: 'System Heartbeat', manual: 'Manual', setup: 'Barkr Setup', user_name: 'User Name', smart_plan: 'Smart Planning', start: 'Start', deadline: 'Deadline', contacts: 'Contacts', c_name: 'Name', c_phone: 'Phone Number', test: 'TEST CONNECTION', save: 'Save', close: 'Close', ok: 'Understood', barkr_mean: 'The meaning of Barkr', barkr_desc: 'Barkr is derived from \'Barker\'. It represents a loyal digital watchdog that watches over you.', why: 'Why this application?', why_desc1: 'Well-being monitoring for people living or working alone. Barkr provides a safety net without invading your privacy.', why_desc2: 'In case of inactivity during your window, your emergency contacts are informed via WhatsApp.', how: 'How to use Barkr?', how_step1: 'Set your name, window, and deadline, and add your emergency contacts.', how_step2: 'Keep the app open on your screen. Barkr passively registers your presence while you use the device.', how_step3: 'No signal measured by the deadline? Barkr triggers an alarm via WhatsApp.', ins_title: 'Inspiration: When to use Barkr?', ins_1_t: 'The Early Traveler', ins_1_d: 'Flying early? Set your deadline just after your alarm. Overslept? Your travel mates get notified immediately.', ins_2_t: 'Meeting & Work', ins_2_d: 'Automatically let family or colleagues know if you aren\'t \'online\' in time for important obligations.', ins_3_t: 'Living Alone', ins_3_d: 'Barkr is your daily check-in. If you don\'t use your device in the morning, loved ones know to check in.', ins_4_t: 'Outdoor & Sports', ins_4_d: 'Going hiking or sports alone? Set a deadline for your expected return.', info_support: 'Information & Support', launch_alert: 'Important: Startup', launch_desc: 'Currently, the app must be started manually. Once open, it can run in the background. Native Android/Apple apps are coming soon.', smart_help_t: 'What is Smart Planning?', smart_help_d: 'This allows you to set unique times per day. Useful if you wake up later on weekends. This schedule is leading.', today: 'Today', active_schedule: 'Weekly Schedule', toggle_on: 'ON', toggle_off: 'OFF'
  },
  DE: {
    vigilant: 'Barkr ist wachsam', idle: 'System im Ruhemodus', offline: 'Keine Verbindung', tap_sleep: 'Tippen zum Schlafen', heartbeat: 'System-Herzschlag', manual: 'Handbuch', setup: 'Barkr Setup', user_name: 'Benutzername', smart_plan: 'Smarte Planung', start: 'Start', deadline: 'Deadline', contacts: 'Kontakte', c_name: 'Name', c_phone: 'Telefonnummer', test: 'VERBINDUNG TESTEN', save: 'Speichern', close: 'Schließen', ok: 'Verstanden', barkr_mean: 'Die Bedeutung von Barkr', barkr_desc: 'Barkr leitet sich von \'Barker\' ab. Es steht für einen treuen digitalen Wachhund, der über Sie wacht.', why: 'Warum diese App?', why_desc1: 'Sicherheitsnetz für Alleinlebende. Barkr überwacht passiv, ohne Ihre Privatsphäre zu verletzen.', why_desc2: 'Bei Inaktivität während Ihres Zeitfensters werden Ihre Notfallkontakte sofort per WhatsApp informiert.', how: 'Wie benutzt man Barkr?', how_step1: 'Name, Fenster und Deadline einstellen und Kontakte hinzufügen.', how_step2: 'App auf dem Bildschirm offen lassen. Barkr registriert passiv Ihre Anwesenheit.', how_step3: 'Kein Signal bis zur Deadline? Barkr löst sofort Alarm via WhatsApp aus.', ins_title: 'Wann nutzt man Barkr?', ins_1_t: 'Frühreisende', ins_1_d: 'Früher Flug? Deadline kurz nach dem Wecker stellen. Verschlafen? Ihre Mitreisenden werden benachrichtigt.', ins_2_t: 'Termine & Arbeit', ins_2_d: 'Kollegen automatisch informieren, wenn Sie nicht rechtzeitig \'online\' sind.', ins_3_t: 'Alleinlebende', ins_3_d: 'Ihr täglicher Check-in. Wenn Sie das Gerät morgens nicht nutzen, wissen Angehörige Bescheid.', ins_4_t: 'Outdoor & Sport', ins_4_d: 'Allein wandern? Deadline für die Rückkehr setzen.', info_support: 'Info & Support', launch_alert: 'Wichtig: Starten', launch_desc: 'Die App muss manuell gestartet werden. Native Apps folgen bald.', smart_help_t: 'Was ist Smarte Planung?', smart_help_d: 'Legen Sie einzigartige Zeiten pro Tag fest. Praktisch fürs Wochenende. Dieser Plan ist bindend.', today: 'Heute', active_schedule: 'Wochenplan', toggle_on: 'AN', toggle_off: 'AUS'
  },
  FR: {
    vigilant: 'Barkr est vigilant', idle: 'Système au repos', offline: 'Pas de connexion', tap_sleep: 'Appuyer pour dormir', heartbeat: 'Battement du système', manual: 'Manuel', setup: 'Configuration Barkr', user_name: 'Nom', smart_plan: 'Planning Intelligent', start: 'Début', deadline: 'Date limite', contacts: 'Contacts', c_name: 'Nom', c_phone: 'Numéro', test: 'TESTER LA CONNEXION', save: 'Enregistrer', close: 'Fermer', ok: 'Compris', barkr_mean: 'La signification de Barkr', barkr_desc: 'Un chien de garde numérique fidèle qui veille sur vous.', why: 'Pourquoi cette application ?', why_desc1: 'Suivi du bien-être pour les personnes seules. Un filet de sécurité sans intrusion.', why_desc2: 'En cas d\'inactivité, vos contacts d\'urgence sont informés par WhatsApp.', how: 'Comment utiliser Barkr ?', how_step1: 'Réglez votre nom, fenêtre et deadline, et ajoutez vos contacts.', how_step2: 'Gardez l\'app ouverte. Barkr enregistre passivement votre présence.', how_step3: 'Pas de signal à l\'échéance ? Barkr déclenche l\'alarme.', ins_title: 'Quand utiliser Barkr ?', ins_1_t: 'Le Voyageur Matinal', ins_1_d: 'Vol matinal ? Vos compagnons sont alertés si vous ne vous réveillez pas.', ins_2_t: 'Travail', ins_2_d: 'Prévenez automatiquement si vous n\'êtes pas \'en ligne\' pour vos obligations.', ins_3_t: 'Personnes Seules', ins_3_d: 'Check-in quotidien. Sans activité le matin, vos proches sont prévenus.', ins_4_t: 'Outdoor & Sport', ins_4_d: 'Fixez une heure de retour pour vos randonnées.', info_support: 'Info & Support', launch_alert: 'Important : Démarrage', launch_desc: 'L\'app doit être lancée manuellement. Apps natives à venir.', smart_help_t: 'Qu\'est-ce que le Planning Intelligent ?', smart_help_d: 'Permet de définir des horaires uniques par jour. Pratique pour le week-end.', today: 'Aujourd\'hui', active_schedule: 'Planning Hebdomadaire', toggle_on: 'ON', toggle_off: 'OFF'
  },
  ES: {
    vigilant: 'Barkr está vigilante', idle: 'Sistema en reposo', offline: 'Sin conexión', tap_sleep: 'Toca para dormir', heartbeat: 'Latido del sistema', manual: 'Manual', setup: 'Configuración Barkr', user_name: 'Nombre de usuario', smart_plan: 'Planificación inteligente', start: 'Inicio', deadline: 'Límite', contacts: 'Contactos', c_name: 'Nombre', c_phone: 'Teléfono', test: 'PROBAR CONEXIÓN', save: 'Guardar', close: 'Cerrar', ok: 'Entendido', barkr_mean: 'El significado de Barkr', barkr_desc: 'Barkr representa a un fiel perro guardián digital que vela por ti.', why: '¿Por qué esta aplicación?', why_desc1: 'Red de seguridad para personas que viven solas. Sin invadir tu privacidad.', why_desc2: 'En caso de inactividad, tus contactos de emergencia son informados vía WhatsApp.', how: '¿Cómo usar Barkr?', how_step1: 'Configura tu nombre, horario y límite, y añade contactos.', how_step2: 'Mantén la app abierta. Barkr registra pasivamente tu presencia.', how_step3: '¿Sin señal al límite? Barkr activa la alarma.', ins_title: '¿Cuándo usar Barkr?', ins_1_t: 'El viajero madrugador', ins_1_d: '¿Vuelo temprano? Tus compañeros reciben un aviso si te duermes.', ins_2_t: 'Trabajo', ins_2_d: 'Informa automáticamente si no estás en línea a tiempo.', ins_3_t: 'Viviendo solo', ins_3_d: 'Registro diario. Si no usas el dispositivo, tus seres queridos lo sabrán.', ins_4_t: 'Aire libre y deportes', ins_4_d: 'Establece una hora de regreso para tus caminatas.', info_support: 'Información y soporte', launch_alert: 'Importante: Inicio', launch_desc: 'Actualmente, la app debe iniciarse manualmente. Próximamente apps nativas.', smart_help_t: '¿Qué es la Planificación Inteligente?', smart_help_d: 'Permite horarios únicos por día. Útil para los fines de semana.', today: 'Hoy', active_schedule: 'Horario Semanal', toggle_on: 'ON', toggle_off: 'OFF'
  },
  IT: {
    vigilant: 'Barkr è vigile', idle: 'Sistema a riposo', offline: 'Nessuna connessione', tap_sleep: 'Tocca per dormire', heartbeat: 'Battito del sistema', manual: 'Manuale', setup: 'Configurazione Barkr', user_name: 'Nome utente', smart_plan: 'Pianificazione intelligente', start: 'Inizio', deadline: 'Scadenza', contacts: 'Contatti', c_name: 'Nome', c_phone: 'Telefono', test: 'TEST CONNESSIONE', save: 'Salva', close: 'Chiudi', ok: 'Capito', barkr_mean: 'Il significato di Barkr', barkr_desc: 'Barkr rappresenta un fedele cane da guardia digitale che veglia su di te.', why: 'Perché questa app?', why_desc1: 'Rete di sicurezza per chi vive o lavora solo, senza invadere la privacy.', why_desc2: 'In caso di inattività, i tuoi contatti vengono informati via WhatsApp.', how: 'Come usare Barkr?', how_step1: 'Imposta nome, orari e contatti.', how_step2: 'Tieni l\'app aperta. Barkr registra passivamente la tua presenza.', how_step3: 'Nessun segnale alla scadenza? Barkr attiva l\'allarme.', ins_title: 'Quando usare Barkr?', ins_1_t: 'Viaggiatore mattutino', ins_1_d: 'Volo presto? I tuoi compagni vengono avvisati se ti addormenti.', ins_2_t: 'Lavoro', ins_2_d: 'Informa automaticamente se non sei online in tempo per impegni.', ins_3_t: 'Vivere da soli', ins_3_d: 'Check-in quotidiano. Se non usi il dispositivo, i tuoi cari lo sapranno.', ins_4_t: 'Outdoor e sport', ins_4_d: 'Imposta un orario di rientro per le tue escursioni.', info_support: 'Info e supporto', launch_alert: 'Importante: Avvio', launch_desc: 'L\'app deve essere avviata manualmente. App native in arrivo.', smart_help_t: 'Cos\'è la Pianificazione Intelligente?', smart_help_d: 'Consente orari unici per ogni giorno. Molto utile per i fine settimana.', today: 'Oggi', active_schedule: 'Programma Settimanale', toggle_on: 'ON', toggle_off: 'OFF'
  },
  PL: {
    vigilant: 'Barkr czuwa', idle: 'System w spoczynku', offline: 'Brak połączenia', tap_sleep: 'Dotknij, aby uśpić', heartbeat: 'Tętno systemu', manual: 'Instrukcja', setup: 'Konfiguracja Barkr', user_name: 'Nazwa', smart_plan: 'Inteligentne planowanie', start: 'Początek', deadline: 'Termin', contacts: 'Kontakty', c_name: 'Nazwa', c_phone: 'Telefon', test: 'TEST POŁĄCZENIA', save: 'Zapisz', close: 'Zamknij', ok: 'Rozumiem', barkr_mean: 'Znaczenie Barkr', barkr_desc: 'Wierny cyfrowy pies stróżujący, który nad Tobą czuwa.', why: 'Dlaczego ta aplikacja?', why_desc1: 'Siatka bezpieczeństwa dla osób samotnych, chroniąca prywatność.', why_desc2: 'W przypadku braku aktywności kontakty są informowane przez WhatsApp.', how: 'Jak używać Barkr?', how_step1: 'Ustaw nazwę, okno czasowe i dodaj kontakty.', how_step2: 'Trzymaj aplikację otwartą. Barkr rejestruje Twoją obecność.', how_step3: 'Brak sygnału w terminie? Barkr wysyła alarm.', ins_title: 'Kiedy używać Barkr?', ins_1_t: 'Wczesny lot', ins_1_d: 'Zaspałeś? Twoi towarzysze podróży zostaną powiadomieni.', ins_2_t: 'Spotkania', ins_2_d: 'Automatycznie informuj, jeśli nie jesteś online na czas.', ins_3_t: 'Samotne mieszkanie', ins_3_d: 'Codzienny check-in. Brak aktywności rano powiadomi bliskich.', ins_4_t: 'Sport', ins_4_d: 'Ustaw planowany czas powrotu z samotnych wędrówek.', info_support: 'Info i wsparcie', launch_alert: 'Ważne: Uruchomienie', launch_desc: 'Aplikację należy uruchomić ręcznie. Wkrótce aplikacje natywne.', smart_help_t: 'Czym jest Inteligentne Planowanie?', smart_help_d: 'Pozwala ustawić unikalne czasy dla każdego dnia.', today: 'Dziś', active_schedule: 'Harmonogram Tygodniowy', toggle_on: 'WŁ', toggle_off: 'WYŁ'
  },
  TR: {
    vigilant: 'Barkr nöbette', idle: 'Sistem uykuda', offline: 'Bağlantı yok', tap_sleep: 'Uyutmak için dokun', heartbeat: 'Sistem Nabzı', manual: 'Kılavuz', setup: 'Barkr Kurulumu', user_name: 'Kullanıcı Adı', smart_plan: 'Akıllı Planlama', start: 'Başlangıç', deadline: 'Son Tarih', contacts: 'Kişiler', c_name: 'İsim', c_phone: 'Telefon', test: 'TEST ET', save: 'Kaydet', close: 'Kapat', ok: 'Anlaşıldı', barkr_mean: 'Barkr\'ın Anlamı', barkr_desc: 'Sizi koruyan sadık bir dijital bekçi köpeği.', why: 'Neden bu uygulama?', why_desc1: 'Yalnız yaşayanlar için güvenlik ağı. Gizliliğinizi ihlal etmez.', why_desc2: 'Hareketsizlik durumunda kişilerinize WhatsApp\'tan haber verilir.', how: 'Barkr nasıl kullanılır?', how_step1: 'İsminizi ve saatleri ayarlayın, kişilerinizi ekleyin.', how_step2: 'Uygulamayı açık tutun. Barkr varlığınızı kaydeder.', how_step3: 'Süre dolduğunda sinyal yok mu? Barkr alarm verir.', ins_title: 'Barkr ne zaman kullanılır?', ins_1_t: 'Erken Yolcu', ins_1_d: 'Erken uçuş? Uyuyakalırsanız arkadaşlarınız haber alır.', ins_2_t: 'İş ve Toplantı', ins_2_d: 'Zamanında online olmazsanız ailenize haber verin.', ins_3_t: 'Yalnız Yaşayanlar', ins_3_d: 'Sabah cihazı kullanmazsanız sevdikleriniz durumu anlar.', ins_4_t: 'Doğa ve Spor', ins_4_d: 'Beklenen dönüş saatiniz için bir son tarih belirleyin.', info_support: 'Bilgi ve Destek', launch_alert: 'Önemli: Başlatma', launch_desc: 'Uygulama manuel başlatılmalıdır. Yakında mobil uygulamalar gelecek.', smart_help_t: 'Akıllı Planlama Nedir?', smart_help_d: 'Hafta sonları için her güne özel saat belirlemenizi sağlar.', today: 'Bugün', active_schedule: 'Haftalık Program', toggle_on: 'AÇIK', toggle_off: 'KAPALI'
  }
};

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
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      name: parsed.name || '', 
      vacationMode: parsed.vacationMode || false, 
      language: parsed.language || 'NL',
      useCustomSchedule: parsed.useCustomSchedule !== undefined ? parsed.useCustomSchedule : true,
      activeDays: parsed.activeDays || [0, 1, 2, 3, 4, 5, 6], 
      // Default tijden geüpdatet naar 06:00 - 10:00
      startTime: parsed.startTime || '06:00', 
      endTime: parsed.endTime || '10:00',
      contacts: parsed.contacts || [], 
      schedules: parsed.schedules || {}
    };
  });

  const lang = settings.language || 'NL';
  const daysVoluit = LANGUAGES[lang].days;
  const currentDayIndex = (new Date().getDay() + 6) % 7; 

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
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col overflow-x-hidden">
      <style>{`
        @keyframes bounce-zz { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-15px); opacity: 1; } }
        .animate-zz { animation: bounce-zz 2.5s infinite ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
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
        <main className="flex-1 p-6 space-y-8 overflow-y-auto">
          {/* HOOFD ACTIE KNOP */}
          <div className="flex flex-col items-center pt-8">
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
                      <span className="text-[11px] font-black uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] tracking-widest text-center px-4 leading-tight italic">{t('tap_sleep', lang)}</span>
                   </div>
                </div>
              )}
            </button>
            <div className="mt-8 bg-white px-8 py-3 rounded-2xl border border-slate-100 shadow-sm text-center">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('heartbeat', lang)}</p>
               <p className="text-3xl font-black text-slate-800 tabular-nums">{lastPing}</p>
            </div>
          </div>

          {/* WEEKPLANNING OP HOOFDSCHERM */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all">
            <header className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-orange-600" />
                <h3 className="font-black text-xs uppercase tracking-tight text-slate-800">{t('active_schedule', lang)}</h3>
              </div>
              <button onClick={() => setSettings({...settings, useCustomSchedule: !settings.useCustomSchedule})} className={`text-[9px] font-black px-3 py-1.5 rounded-full transition-all border ${settings.useCustomSchedule ? 'bg-orange-600 border-orange-700 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                {settings.useCustomSchedule ? t('toggle_on', lang) : t('toggle_off', lang)}
              </button>
            </header>

            <div className="p-5 space-y-5">
              {!settings.useCustomSchedule ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">{t('start', lang)}</label><input type="time" value={settings.startTime} onChange={e=>setSettings({...settings, startTime:e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 font-black text-slate-700 text-center"/></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-red-400 uppercase ml-1">{t('deadline', lang)}</label><input type="time" value={settings.endTime} onChange={e=>setSettings({...settings, endTime:e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 font-black text-red-600 text-center"/></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {settings.activeDays.sort().map((d: number) => {
                    const isToday = d === currentDayIndex;
                    return (
                      <div key={d} className={`flex items-center gap-3 p-3 rounded-2xl border ${isToday ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="w-24 flex flex-col">
                          <span className={`text-[10px] font-black uppercase ${isToday ? 'text-orange-600' : 'text-slate-500'}`}>{daysVoluit[d]}</span>
                          {isToday && <span className="text-[8px] font-black text-orange-400 uppercase">{t('today', lang)}</span>}
                        </div>
                        <input type="time" value={settings.schedules[d]?.startTime || settings.startTime} onChange={e=>setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], startTime:e.target.value}}})} className="flex-1 bg-white border border-slate-200 rounded-lg py-1.5 text-xs font-black text-center outline-none"/>
                        <input type="time" value={settings.schedules[d]?.endTime || settings.endTime} onChange={e=>setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], endTime:e.target.value}}})} className="flex-1 bg-white border border-slate-200 rounded-lg py-1.5 text-xs font-black text-red-600 text-center outline-none"/>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      {showManual && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-8 pb-20 no-scrollbar">
          <header className="flex justify-between items-center py-2"><h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-800">{t('manual', lang)}</h2><button onClick={() => setShowManual(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={24}/></button></header>
          
          <section className="bg-blue-600 p-6 rounded-[32px] text-white shadow-lg space-y-3 relative overflow-hidden"><h4 className="font-black flex items-center gap-2 uppercase text-xs tracking-[0.15em]"><AlertTriangle size={18} className="text-orange-400"/> {t('launch_alert', lang)}</h4><p className="text-sm font-bold">{t('launch_desc', lang)}</p></section>
          
          <section className="bg-orange-50 p-6 rounded-3xl border border-orange-200 space-y-3">
            <h4 className="font-black text-orange-800 flex items-center gap-2 uppercase text-xs tracking-widest"><CalendarDays size={18}/> {t('smart_help_t', lang)}</h4>
            <p className="text-sm text-orange-900 leading-relaxed font-medium">{t('smart_help_d', lang)}</p>
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
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"><h4 className="font-black text-orange-600 flex items-center gap-2 uppercase text-xs tracking-[0.15em]"><HeartPulse size={20}/> {t('why', lang)}</h4><div className="space-y-2"><p className="text-sm text-slate-600 leading-relaxed font-medium">{t('why_desc1', lang)}</p><p className="text-sm text-slate-600 leading-relaxed font-medium">{t('why_desc2', lang)}</p></div></section>

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

          <button onClick={() => setShowManual(false)} className="w-full py-5 bg-orange-600 text-white font-black uppercase rounded-3xl tracking-widest shadow-lg active:scale-95 transition-all">{t('close', lang)}</button>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20 no-scrollbar">
          <header className="flex justify-between items-center mb-4"><h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">{t('setup', lang)}</h2><button onClick={() => setShowSettings(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button></header>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">App Language</label>
              <div className="relative">
                <select value={settings.language} onChange={e=>setSettings({...settings, language: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-slate-700 appearance-none outline-none">
                  {Object.keys(LANGUAGES).map(key => (
                    <option key={key} value={key}>{LANGUAGES[key].flag} {LANGUAGES[key].name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase">{t('user_name', lang)}</label><input value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700"/></div>
          </div>

          <div><label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block mb-2 px-1">{t('contacts', lang)}</label>
            <button onClick={()=> setSettings({...settings, contacts:[...settings.contacts, {name:'', phone: LANGUAGES[lang]?.prefix || ''}]})} className="w-full bg-orange-600 text-white p-3 rounded-xl shadow-md flex justify-center mb-4"><Plus size={20}/></button>
            <div className="space-y-4">{settings.contacts.map((c: any, i: number) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative space-y-4">
                <button onClick={()=> {const n=[...settings.contacts]; n.splice(i,1); setSettings({...settings, contacts:n})}} className="absolute top-4 right-4 text-slate-300"><Trash2 size={18}/></button>
                <div><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">{t('c_name', lang)}</label><input placeholder={t('c_name', lang)} value={c.name} onChange={e=>{const n=[...settings.contacts]; n[i].name=e.target.value; setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none"/></div>
                <div><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">{t('c_phone', lang)}</label><input value={c.phone} onChange={e=>{const n=[...settings.contacts]; n[i].phone=e.target.value; setSettings({...settings, contacts:n})}} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-mono text-slate-600 outline-none"/></div>
                <button onClick={() => activeUrl && fetch(`${activeUrl}/test_contact`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(c)})} className="w-full bg-emerald-50 text-emerald-600 text-[10px] font-black py-2 rounded-lg border border-emerald-100 flex items-center justify-center gap-2"><ShieldCheck size={14}/> {t('test', lang)}</button>
              </div>
            ))}</div>
          </div>
          <button onClick={() => setShowSettings(false)} className="w-full py-5 bg-slate-900 text-white font-black uppercase rounded-[28px] tracking-[0.2em] shadow-2xl">{t('save', lang)}</button>
        </div>
      )}
    </div>
  );
}
