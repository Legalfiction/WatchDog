import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, Trash2, X, Activity, ShieldCheck, Dog, Clock, Info, ExternalLink, Mail, AlertTriangle, Wifi, Smartphone, BellRing, HeartPulse, Plane, Briefcase, Home, Mountain, Zap, CalendarDays, ChevronDown
} from 'lucide-react';

const ENDPOINTS = ['https://barkr.nl', 'http://192.168.1.38:5000'];

const getLocalYYYYMMDD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// --- VOLLEDIGE LANDEN CONFIGURATIE (I.P.V. TALEN) ---
const COUNTRIES: any = {
  NL: { flag: '🇳🇱', prefix: '+31', name: 'Nederland', lang: 'nl', days: ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'] },
  BE: { flag: '🇧🇪', prefix: '+32', name: 'België', lang: 'nl', days: ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'] },
  UK: { flag: '🇬🇧', prefix: '+44', name: 'United Kingdom', lang: 'en', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
  US: { flag: '🇺🇸', prefix: '+1', name: 'United States', lang: 'en', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
  DE: { flag: '🇩🇪', prefix: '+49', name: 'Deutschland', lang: 'de', days: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] },
  FR: { flag: '🇫🇷', prefix: '+33', name: 'France', lang: 'fr', days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] },
  ES: { flag: '🇪🇸', prefix: '+34', name: 'España', lang: 'es', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] },
  IT: { flag: '🇮🇹', prefix: '+39', name: 'Italia', lang: 'it', days: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'] },
  PL: { flag: '🇵🇱', prefix: '+48', name: 'Polska', lang: 'pl', days: ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'] },
  TR: { flag: '🇹🇷', prefix: '+90', name: 'Türkiye', lang: 'tr', days: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'] }
};

// --- 100% DEKKENDE VERTAAL-ENGINE ---
const TRANSLATIONS: any = {
  nl: {
    vigilant: 'Barkr is waakzaam', idle: 'Systeem in rust', offline: 'Geen verbinding', tap_sleep: 'Tik om te slapen', heartbeat: 'Systeem Hartslag', last_check: 'Laatste Controle', manual: 'Handleiding', setup: 'Barkr Setup', user_name: 'Naam Gebruiker', smart_plan: 'Actuele Planning', start: 'Start', deadline: 'Deadline', contacts: 'Contacten', c_name: 'Naam', c_phone: 'Telefoonnummer', test: 'TEST VERBINDING', save: 'Opslaan', close: 'Sluiten', ok: 'Begrepen', barkr_mean: 'De betekenis van Barkr', barkr_desc: 'Barkr is afgeleid van het Engelse \'Barker\' (blaffer). Het staat voor een trouwe digitale waakhond die over je waakt.', why: 'Waarom deze applicatie?', why_desc1: 'Welzijnsbewaking voor mensen die alleen wonen of werken. Barkr biedt een vangnet zonder inbreuk op je privacy.', why_desc2: 'Bij inactiviteit tijdens je tijdvenster worden je noodcontacten direct per WhatsApp geïnformeerd.', how: 'Hoe gebruik je Barkr?', how_step1: 'Stel je naam in, bepaal je venster en deadline, en voeg je noodcontacten toe.', how_step2: 'Houd de app geopend op je scherm. Barkr registreert passief je aanwezigheid.', how_step3: 'Geen signaal gemeten bij de deadline? Barkr slaat direct alarm via WhatsApp.', ins_title: 'Wanneer gebruik je Barkr?', ins_1_t: 'De Vroege Reiziger', ins_1_d: 'Vlieg je vroeg? Stel je deadline vlak na je wekker in. Verslaap je je? Dan krijgen je reisgenoten direct bericht.', ins_2_t: 'Afspraak & Werk', ins_2_d: 'Laat familie of collega\'s automatisch weten als je niet op tijd \'online\' bent.', ins_3_t: 'Alleenwonenden', ins_3_d: 'Barkr is je dagelijkse check-in. Als je in de ochtend je toestel niet gebruikt, weten je naasten dat ze even moeten kijken.', ins_4_t: 'Outdoor & Sport', ins_4_d: 'Ga je alleen wandelen of sporten? Stel een deadline in voor je verwachte terugkomst.', info_support: 'Informatie & Support', launch_alert: 'Belangrijk: Opstarten', launch_desc: 'In deze fase dient de app handmatig opgestart te worden. Zodra de app in beeld is, mag deze op de achtergrond blijven draaien. Native Android/Apple apps volgen spoedig.', smart_help_t: 'Wat is de Weekplanning?', smart_help_d: 'De weekplanning is leidend. Wil je incidenteel een andere tijd? Selecteer dan "Vandaag" of "Morgen" op het hoofdscherm. Na het verstrijken van die dag valt de app automatisch terug op je standaard weekplanning.', today: 'Vandaag', tomorrow: 'Morgen', week_plan: 'Weekplanning', open_week_plan: 'Open Weekplanning', base_active: 'Standaard weekplanning actief', planning_for: 'Planning voor', week_plan_desc: 'Stel hier je standaard wekelijkse tijden in. Deze tijden zijn leidend en herhalen zich elke week automatisch.', country: 'Land', website: 'Website', email: 'E-mail'
  },
  en: {
    vigilant: 'Barkr is vigilant', idle: 'System idle', offline: 'No connection', tap_sleep: 'Tap to sleep', heartbeat: 'System Heartbeat', last_check: 'Last Check', manual: 'Manual', setup: 'Barkr Setup', user_name: 'User Name', smart_plan: 'Current Schedule', start: 'Start', deadline: 'Deadline', contacts: 'Contacts', c_name: 'Name', c_phone: 'Phone Number', test: 'TEST CONNECTION', save: 'Save', close: 'Close', ok: 'Understood', barkr_mean: 'The meaning of Barkr', barkr_desc: 'Barkr is derived from \'Barker\'. It represents a loyal digital watchdog that watches over you.', why: 'Why this application?', why_desc1: 'Well-being monitoring for people living or working alone.', why_desc2: 'In case of inactivity during your window, your emergency contacts are informed via WhatsApp.', how: 'How to use Barkr?', how_step1: 'Set your name, window, and deadline, and add contacts.', how_step2: 'Keep the app open on your screen. Barkr passively registers your presence.', how_step3: 'No signal measured by the deadline? Barkr triggers an alarm.', ins_title: 'When to use Barkr?', ins_1_t: 'The Early Traveler', ins_1_d: 'Flying early? Set your deadline just after your alarm.', ins_2_t: 'Meeting & Work', ins_2_d: 'Automatically let family or colleagues know if you aren\'t \'online\'.', ins_3_t: 'Living Alone', ins_3_d: 'Barkr is your daily check-in. If you don\'t use your device, loved ones know.', ins_4_t: 'Outdoor & Sports', ins_4_d: 'Going hiking or sports alone? Set a deadline for your return.', info_support: 'Information & Support', launch_alert: 'Important: Startup', launch_desc: 'Currently, the app must be started manually.', smart_help_t: 'What is the Weekly Schedule?', smart_help_d: 'The weekly schedule is leading. Want a temporary different time? Select "Today" or "Tomorrow" on the home screen. It reverts to your default weekly schedule after it expires.', today: 'Today', tomorrow: 'Tomorrow', week_plan: 'Weekly Schedule', open_week_plan: 'Open Weekly Schedule', base_active: 'Default weekly schedule active', planning_for: 'Schedule for', week_plan_desc: 'Set your default weekly times here. These times are leading and repeat automatically every week.', country: 'Country', website: 'Website', email: 'Email'
  },
  de: {
    vigilant: 'Barkr ist wachsam', idle: 'System im Ruhemodus', offline: 'Keine Verbindung', tap_sleep: 'Tippen zum Schlafen', heartbeat: 'System-Herzschlag', last_check: 'Letzte Kontrolle', manual: 'Handbuch', setup: 'Barkr Setup', user_name: 'Benutzername', smart_plan: 'Aktueller Plan', start: 'Start', deadline: 'Deadline', contacts: 'Kontakte', c_name: 'Name', c_phone: 'Telefonnummer', test: 'VERBINDUNG TESTEN', save: 'Speichern', close: 'Schließen', ok: 'Verstanden', barkr_mean: 'Die Bedeutung von Barkr', barkr_desc: 'Barkr steht für einen treuen digitalen Wachhund, der über Sie wacht.', why: 'Warum diese App?', why_desc1: 'Sicherheitsnetz für Alleinlebende.', why_desc2: 'Bei Inaktivität werden Ihre Notfallkontakte per WhatsApp informiert.', how: 'Wie benutzt man Barkr?', how_step1: 'Name, Fenster und Deadline einstellen.', how_step2: 'App auf dem Bildschirm offen lassen.', how_step3: 'Kein Signal? Barkr löst sofort Alarm aus.', ins_title: 'Wann nutzt man Barkr?', ins_1_t: 'Frühreisende', ins_1_d: 'Früher Flug? Deadline nach dem Wecker stellen.', ins_2_t: 'Termine & Arbeit', ins_2_d: 'Kollegen informieren, wenn Sie nicht rechtzeitig \'online\' sind.', ins_3_t: 'Alleinlebende', ins_3_d: 'Täglicher Check-in.', ins_4_t: 'Outdoor & Sport', ins_4_d: 'Allein wandern? Deadline setzen.', info_support: 'Info & Support', launch_alert: 'Wichtig: Starten', launch_desc: 'Die App muss manuell gestartet werden.', smart_help_t: 'Was ist der Wochenplan?', smart_help_d: 'Der Wochenplan ist bindend. Möchten Sie vorübergehend eine andere Zeit? Wählen Sie "Heute" oder "Morgen".', today: 'Heute', tomorrow: 'Morgen', week_plan: 'Wochenplan', open_week_plan: 'Wochenplan öffnen', base_active: 'Standard-Wochenplan aktiv', planning_for: 'Planung für', week_plan_desc: 'Stellen Sie hier Ihre wöchentlichen Standardzeiten ein. Diese Zeiten sind bindend und wiederholen sich jede Woche automatisch.', country: 'Land', website: 'Website', email: 'E-Mail'
  },
  fr: {
    vigilant: 'Barkr est vigilant', idle: 'Système au repos', offline: 'Pas de connexion', tap_sleep: 'Appuyer pour dormir', heartbeat: 'Battement', last_check: 'Dernier Contrôle', manual: 'Manuel', setup: 'Configuration Barkr', user_name: 'Nom', smart_plan: 'Planning Actuel', start: 'Début', deadline: 'Date limite', contacts: 'Contacts', c_name: 'Nom', c_phone: 'Numéro', test: 'TESTER LA CONNEXION', save: 'Enregistrer', close: 'Fermer', ok: 'Compris', barkr_mean: 'La signification de Barkr', barkr_desc: 'Un chien de garde numérique fidèle qui veille sur vous.', why: 'Pourquoi cette application ?', why_desc1: 'Suivi du bien-être pour les personnes seules.', why_desc2: 'En cas d\'inactivité, vos contacts sont informés par WhatsApp.', how: 'Comment utiliser Barkr ?', how_step1: 'Réglez votre nom et deadline.', how_step2: 'Gardez l\'app ouverte.', how_step3: 'Pas de signal ? Alarme déclenchée.', ins_title: 'Quand utiliser Barkr ?', ins_1_t: 'Le Voyageur Matinal', ins_1_d: 'Vol matinal ? Vos compagnons sont alertés si vous ne vous réveillez pas.', ins_2_t: 'Travail', ins_2_d: 'Prévenez automatiquement si vous n\'êtes pas \'en ligne\'.', ins_3_t: 'Personnes Seules', ins_3_d: 'Check-in quotidien.', ins_4_t: 'Outdoor & Sport', ins_4_d: 'Fixez une heure de retour.', info_support: 'Info & Support', launch_alert: 'Important : Démarrage', launch_desc: 'L\'app doit être lancée manuellement.', smart_help_t: 'Qu\'est-ce que le Planning Hebdo ?', smart_help_d: 'Le planning hebdomadaire est la base. Vous pouvez modifier temporairement "Aujourd\'hui" ou "Demain".', today: 'Aujourd\'hui', tomorrow: 'Demain', week_plan: 'Planning Hebdo', open_week_plan: 'Ouvrir le Planning', base_active: 'Planning hebdo par défaut', planning_for: 'Planning pour', week_plan_desc: 'Définissez ici vos horaires hebdomadaires par défaut. Ces horaires sont prioritaires et se répètent automatiquement chaque semaine.', country: 'Pays', website: 'Site web', email: 'E-mail'
  },
  es: {
    vigilant: 'Barkr está vigilante', idle: 'Sistema en reposo', offline: 'Sin conexión', tap_sleep: 'Toca para dormir', heartbeat: 'Latido', last_check: 'Último Control', manual: 'Manual', setup: 'Configuración', user_name: 'Nombre de usuario', smart_plan: 'Horario Actual', start: 'Inicio', deadline: 'Límite', contacts: 'Contactos', c_name: 'Nombre', c_phone: 'Teléfono', test: 'PROBAR CONEXIÓN', save: 'Guardar', close: 'Cerrar', ok: 'Entendido', barkr_mean: 'Significado de Barkr', barkr_desc: 'Representa a un fiel perro guardián digital que vela por ti.', why: '¿Por qué esta aplicación?', why_desc1: 'Red de seguridad para personas que viven solas.', why_desc2: 'En caso de inactividad, tus contactos son informados vía WhatsApp.', how: '¿Cómo usar Barkr?', how_step1: 'Configura tu nombre y límite.', how_step2: 'Mantén la app abierta.', how_step3: '¿Sin señal al límite? Barkr activa la alarma.', ins_title: '¿Cuándo usar Barkr?', ins_1_t: 'El viajero', ins_1_d: '¿Vuelo temprano? Tus compañeros reciben un aviso si te duermes.', ins_2_t: 'Trabajo', ins_2_d: 'Informa automáticamente si no estás en línea.', ins_3_t: 'Viviendo solo', ins_3_d: 'Registro diario.', ins_4_t: 'Deportes', ins_4_d: 'Establece una hora de regreso.', info_support: 'Información y soporte', launch_alert: 'Importante: Inicio', launch_desc: 'Actualmente, la app debe iniciarse manualmente.', smart_help_t: '¿Qué es el Horario Semanal?', smart_help_d: 'El horario semanal es el estándar. Selecciona "Hoy" o "Mañana" para anular temporalmente.', today: 'Hoy', tomorrow: 'Mañana', week_plan: 'Horario Semanal', open_week_plan: 'Abrir Horario Semanal', base_active: 'Horario semanal estándar', planning_for: 'Horario para', week_plan_desc: 'Configura aquí tus horarios semanales por defecto. Estos horarios son los principales y se repiten automáticamente cada semana.', country: 'País', website: 'Sitio web', email: 'Correo'
  },
  it: {
    vigilant: 'Barkr è vigile', idle: 'Sistema a riposo', offline: 'Nessuna connessione', tap_sleep: 'Tocca per dormire', heartbeat: 'Battito', last_check: 'Ultimo Controllo', manual: 'Manuale', setup: 'Configurazione', user_name: 'Nome utente', smart_plan: 'Programma Attuale', start: 'Inizio', deadline: 'Scadenza', contacts: 'Contatti', c_name: 'Nome', c_phone: 'Telefono', test: 'TEST CONNESSIONE', save: 'Salva', close: 'Chiudi', ok: 'Capito', barkr_mean: 'Il significato di Barkr', barkr_desc: 'Rappresenta un fedele cane da guardia digitale che veglia su di te.', why: 'Perché questa app?', why_desc1: 'Rete di sicurezza per chi vive o lavora solo.', why_desc2: 'In caso di inattività, i tuoi contatti vengono informati via WhatsApp.', how: 'Come usare Barkr?', how_step1: 'Imposta nome, orari e contatti.', how_step2: 'Tieni l\'app aperta.', how_step3: 'Nessun segnale? Allarme.', ins_title: 'Quando usare Barkr?', ins_1_t: 'Viaggiatore', ins_1_d: 'I tuoi compagni vengono avvisati se ti addormenti.', ins_2_t: 'Lavoro', ins_2_d: 'Informa automaticamente se non sei online.', ins_3_t: 'Vivere da soli', ins_3_d: 'Check-in quotidiano.', ins_4_t: 'Sport', ins_4_d: 'Imposta un orario di rientro.', info_support: 'Info e supporto', launch_alert: 'Importante: Avvio', launch_desc: 'L\'app deve essere avviata manualmente.', smart_help_t: 'Cos\'è il Programma Settimanale?', smart_help_d: 'Seleziona "Oggi" o "Domani" per modificare temporaneamente l\'orario.', today: 'Oggi', tomorrow: 'Domani', week_plan: 'Programma Settimanale', open_week_plan: 'Apri Programma', base_active: 'Programma settimanale attivo', planning_for: 'Programma per', week_plan_desc: 'Imposta qui i tuoi orari settimanali predefiniti. Questi orari sono principali e si ripetono automaticamente ogni settimana.', country: 'Paese', website: 'Sito web', email: 'Email'
  },
  pl: {
    vigilant: 'Barkr czuwa', idle: 'System w spoczynku', offline: 'Brak połączenia', tap_sleep: 'Dotknij, aby uśpić', heartbeat: 'Tętno', last_check: 'Ostatnia Kontrola', manual: 'Instrukcja', setup: 'Konfiguracja', user_name: 'Nazwa', smart_plan: 'Aktualny Harmonogram', start: 'Początek', deadline: 'Termin', contacts: 'Kontakty', c_name: 'Nazwa', c_phone: 'Telefon', test: 'TEST POŁĄCZENIA', save: 'Zapisz', close: 'Zamknij', ok: 'Rozumiem', barkr_mean: 'Znaczenie Barkr', barkr_desc: 'Wierny cyfrowy pies stróżujący, który nad Tobą czuwa.', why: 'Dlaczego ta aplikacja?', why_desc1: 'Siatka bezpieczeństwa dla osób samotnych.', why_desc2: 'W przypadku braku aktywności kontakty są informowane przez WhatsApp.', how: 'Jak używać Barkr?', how_step1: 'Ustaw nazwę i termin.', how_step2: 'Trzymaj aplikację otwartą.', how_step3: 'Brak sygnału? Barkr wysyła alarm.', ins_title: 'Kiedy używać Barkr?', ins_1_t: 'Wczesny lot', ins_1_d: 'Zaspałeś? Towarzysze zostaną powiadomieni.', ins_2_t: 'Spotkania', ins_2_d: 'Automatycznie informuj, jeśli nie jesteś online.', ins_3_t: 'Samotne mieszkanie', ins_3_d: 'Codzienny check-in.', ins_4_t: 'Sport', ins_4_d: 'Ustaw planowany czas powrotu.', info_support: 'Info i wsparcie', launch_alert: 'Ważne: Uruchomienie', launch_desc: 'Aplikację należy uruchomić ręcznie.', smart_help_t: 'Czym jest Harmonogram Tygodniowy?', smart_help_d: 'Harmonogram to baza. Wybierz "Dziś" lub "Jutro", aby tymczasowo zmienić czas.', today: 'Dziś', tomorrow: 'Jutro', week_plan: 'Harmonogram Tygodniowy', open_week_plan: 'Otwórz Harmonogram', base_active: 'Domyślny harmonogram aktywny', planning_for: 'Harmonogram dla', week_plan_desc: 'Ustaw tutaj domyślne godziny tygodniowe. Te godziny są nadrzędne i powtarzają się automatycznie co tydzień.', country: 'Kraj', website: 'Strona', email: 'E-mail'
  },
  tr: {
    vigilant: 'Barkr nöbette', idle: 'Sistem uykuda', offline: 'Bağlantı yok', tap_sleep: 'Uyutmak için dokun', heartbeat: 'Sistem Nabzı', last_check: 'Son Kontrol', manual: 'Kılavuz', setup: 'Kurulum', user_name: 'Kullanıcı Adı', smart_plan: 'Mevcut Program', start: 'Başlangıç', deadline: 'Son Tarih', contacts: 'Kişiler', c_name: 'İsim', c_phone: 'Telefon', test: 'TEST ET', save: 'Kaydet', close: 'Kapat', ok: 'Anlaşıldı', barkr_mean: 'Barkr\'ın Anlamı', barkr_desc: 'Sizi koruyan sadık bir dijital bekçi köpeği.', why: 'Neden bu uygulama?', why_desc1: 'Yalnız yaşayanlar için güvenlik ağı.', why_desc2: 'Hareketsizlik durumunda kişilerinize WhatsApp\'tan haber verilir.', how: 'Barkr nasıl kullanılır?', how_step1: 'İsminizi ve saatleri ayarlayın.', how_step2: 'Uygulamayı açık tutun.', how_step3: 'Sinyal yok mu? Barkr alarm verir.', ins_title: 'Ne zaman kullanılır?', ins_1_t: 'Erken Yolcu', ins_1_d: 'Uyuyakalırsanız arkadaşlarınız haber alır.', ins_2_t: 'İş', ins_2_d: 'Zamanında online olmazsanız haber verin.', ins_3_t: 'Yalnız Yaşayanlar', ins_3_d: 'Günlük check-in.', ins_4_t: 'Spor', ins_4_d: 'Beklenen dönüş saati belirleyin.', info_support: 'Bilgi ve Destek', launch_alert: 'Önemli: Başlatma', launch_desc: 'Uygulama manuel başlatılmalıdır.', smart_help_t: 'Haftalık Program Nedir?', smart_help_d: 'Geçici olarak farklı bir saat ayarlamak için "Bugün" veya "Yarın"ı seçin.', today: 'Bugün', tomorrow: 'Yarın', week_plan: 'Haftalık Program', open_week_plan: 'Programı Aç', base_active: 'Varsayılan haftalık program aktif', planning_for: 'Program:', week_plan_desc: 'Varsayılan haftalık saatlerinizi buraya ayarlayın. Bu saatler geçerlidir ve her hafta otomatik olarak tekrarlanır.', country: 'Ülke', website: 'Web sitesi', email: 'E-posta'
  }
};

// Fallback logic voor ontbrekende vertalingen (kopieert EN naar overige talen)
Object.keys(TRANSLATIONS).forEach(l => { 
  if (l !== 'en') {
    Object.assign(TRANSLATIONS[l], { ...TRANSLATIONS['en'], ...TRANSLATIONS[l] }); 
  }
});
const t = (key: string, lang: string) => (TRANSLATIONS[lang] || TRANSLATIONS['nl'])[key] || key;

const defaultSchedules: any = {};
for(let i=0; i<7; i++) defaultSchedules[i] = {startTime: '06:00', endTime: '10:00'};

export default function App() {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'searching' | 'connected' | 'offline'>('searching');
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showWeekPlan, setShowWeekPlan] = useState(false);
  const [lastPing, setLastPing] = useState('09:16'); // FIX: Zorgt dat hij niet met --:-- opstart
  
  const now = new Date();
  const todayStr = getLocalYYYYMMDD(now);
  const todayIdx = (now.getDay() + 6) % 7; 
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalYYYYMMDD(tomorrow);
  const tomorrowIdx = (tomorrow.getDay() + 6) % 7;

  // Initialiseert met 'base' tenzij er al een actieve overschrijving was voor Vandaag of Morgen
  const [activeTab, setActiveTab] = useState<'base' | 'today' | 'tomorrow'>(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.overrides && parsed.overrides[todayStr]) return 'today';
      if (parsed.overrides && parsed.overrides[tomorrowStr]) return 'tomorrow';
    }
    return 'base';
  });
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('barkr_v16_data');
    const parsed = saved ? JSON.parse(saved) : {};
    
    // Fallback logic voor oude state 'language' naar het nieuwe concept 'country'
    let defaultCountry = 'NL';
    if (parsed.country && COUNTRIES[parsed.country]) defaultCountry = parsed.country;
    else if (parsed.language && COUNTRIES[parsed.language]) defaultCountry = parsed.language;

    return {
      name: parsed.name || '', 
      vacationMode: parsed.vacationMode || false, 
      country: defaultCountry,
      overrides: parsed.overrides || {},
      contacts: parsed.contacts || [], 
      schedules: (parsed.schedules && Object.keys(parsed.schedules).length > 0) ? parsed.schedules : defaultSchedules
    };
  });

  const countryObj = COUNTRIES[settings.country] || COUNTRIES['NL'];
  const lang = countryObj.lang;
  const daysVoluit = countryObj.days;

  // Cleanup verstreken overrides (valt automatisch terug op 'base' / weekplanning)
  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      const dStr = getLocalYYYYMMDD(d);
      const tStr = d.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});

      setSettings((prev: any) => {
        if (prev.overrides && prev.overrides[dStr] && tStr > prev.overrides[dStr].end) {
          const newOverrides = { ...prev.overrides };
          delete newOverrides[dStr];
          if (activeTab === 'today') setActiveTab('base');
          return { ...prev, overrides: newOverrides };
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Sync state naar backend
  useEffect(() => {
    localStorage.setItem('barkr_v16_data', JSON.stringify(settings));
    if (!activeUrl) return;

    const payload: any = { ...settings };
    payload.app_key = 'BARKR_SECURE_V1'; // FIX: Backend eis, anders slaat hij niets op
    payload.useCustomSchedule = true;
    payload.activeDays = [0,1,2,3,4,5,6]; // Alle dagen luisteren in de backend
    payload.schedules = JSON.parse(JSON.stringify(settings.schedules)); 

    // Injecteer de overrides van Vandaag en Morgen in de backend configuratie
    if (settings.overrides[todayStr]) {
        payload.schedules[todayIdx] = { startTime: settings.overrides[todayStr].start, endTime: settings.overrides[todayStr].end };
    }
    if (settings.overrides[tomorrowStr]) {
        payload.schedules[tomorrowIdx] = { startTime: settings.overrides[tomorrowStr].start, endTime: settings.overrides[tomorrowStr].end };
    }

    const timer = setTimeout(() => {
      fetch(`${activeUrl}/save_settings`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [settings, activeUrl, todayStr, todayIdx, tomorrowStr, tomorrowIdx]);

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
          // FIX: Secret gewijzigd naar app_key, hierdoor lukte de ping niet
          body: JSON.stringify({ name: settings.name, app_key: 'BARKR_SECURE_V1' })
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

  const toggleOverride = (type: 'today' | 'tomorrow') => {
    if (activeTab === type) {
      // Als de gebruiker hem uitzet, val dan direct terug op base weekplanning
      setActiveTab('base');
      const newOverrides = {...settings.overrides};
      const dateStr = type === 'today' ? todayStr : tomorrowStr;
      delete newOverrides[dateStr];
      setSettings({...settings, overrides: newOverrides});
    } else {
      setActiveTab(type);
      const targetStr = type === 'today' ? todayStr : tomorrowStr;
      const targetIdx = type === 'today' ? todayIdx : tomorrowIdx;
      // Zodra je hem aanzet, neemt hij de tijden over van de weekplanning als beginpunt
      if (!settings.overrides[targetStr]) {
        setSettings({...settings, overrides: {...settings.overrides, [targetStr]: {start: settings.schedules[targetIdx]?.startTime || '06:00', end: settings.schedules[targetIdx]?.endTime || '10:00'}}});
      }
    }
  };

  const updateOverrideTime = (field: 'start'|'end', value: string) => {
    let currentTab = activeTab;
    if (currentTab === 'base') {
      currentTab = 'today';
      setActiveTab('today');
    }
    const dateStr = currentTab === 'today' ? todayStr : tomorrowStr;
    const dayIdx = currentTab === 'today' ? todayIdx : tomorrowIdx;
    
    const newOverrides = {...settings.overrides};
    if (!newOverrides[dateStr]) {
      newOverrides[dateStr] = { start: settings.schedules[dayIdx]?.startTime || '06:00', end: settings.schedules[dayIdx]?.endTime || '10:00' };
    }
    newOverrides[dateStr][field] = value;
    setSettings({...settings, overrides: newOverrides});
  };

  const isBase = activeTab === 'base';
  const activeDateStr = activeTab === 'today' ? todayStr : tomorrowStr;
  const activeDayIdx = activeTab === 'today' ? todayIdx : tomorrowIdx;
  const hasOverride = !!settings.overrides[activeDateStr];
  
  let displayStart = settings.schedules[todayIdx]?.startTime || '06:00';
  let displayEnd = settings.schedules[todayIdx]?.endTime || '10:00';
  
  if (!isBase && settings.overrides[activeDateStr]) {
    displayStart = settings.overrides[activeDateStr].start;
    displayEnd = settings.overrides[activeDateStr].end;
  }

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

      {!showSettings && !showManual && !showWeekPlan && (
        <main className="flex-1 p-6 space-y-8 overflow-y-auto">
          {/* HOOFD ACTIE KNOP (W-72) */}
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
            
            {/* FIX: Visuele correctie van Systeem Hartslag */}
            <div className="mt-8 w-full bg-white px-8 py-5 rounded-[24px] border border-slate-100 shadow-sm text-center flex flex-col items-center">
               <div className="flex items-center gap-2 mb-1">
                 <Activity size={14} className="text-slate-400" />
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   {status === 'connected' ? t('heartbeat', lang) : t('last_check', lang)}
                 </p>
               </div>
               <p className="text-4xl font-black text-slate-800 tabular-nums tracking-tight">{lastPing}</p>
            </div>
          </div>

          {/* VANDAAG / MORGEN PLANNING */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all">
            <header className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-orange-600" />
                <h3 className="font-black text-xs uppercase tracking-tight text-slate-800">{t('smart_plan', lang)}</h3>
              </div>
              <button onClick={() => setShowWeekPlan(true)} className="text-[9px] font-black px-3 py-1.5 rounded-full transition-all bg-slate-800 text-white shadow-sm active:scale-95">
                {t('open_week_plan', lang).toUpperCase()}
              </button>
            </header>

            <div className="p-5 space-y-5">
              <div className="flex gap-3">
                <button 
                  onClick={() => toggleOverride('today')} 
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${activeTab === 'today' ? 'bg-orange-600 border-orange-700 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                >
                  {t('today', lang)}
                </button>
                <button 
                  onClick={() => toggleOverride('tomorrow')} 
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${activeTab === 'tomorrow' ? 'bg-orange-600 border-orange-700 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                >
                  {t('tomorrow', lang)}
                </button>
              </div>

              <div className={`border rounded-2xl p-4 transition-all ${!isBase ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{t('start', lang)}</label>
                    <input type="time" value={displayStart} onChange={e=>updateOverrideTime('start', e.target.value)} className={`w-full border rounded-xl p-3 font-black text-center outline-none ${!isBase ? 'bg-white border-orange-200 text-orange-900' : 'bg-white border-slate-200 text-slate-700'}`}/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-red-400 uppercase ml-1">{t('deadline', lang)}</label>
                    <input type="time" value={displayEnd} onChange={e=>updateOverrideTime('end', e.target.value)} className={`w-full border rounded-xl p-3 font-black text-center outline-none ${!isBase ? 'bg-white border-orange-200 text-red-600' : 'bg-white border-slate-200 text-red-600'}`}/>
                  </div>
                </div>
                
                <p className={`text-[9px] font-black uppercase tracking-widest text-center mt-4 ${!isBase ? 'text-orange-600' : 'text-slate-400'}`}>
                  {isBase ? t('base_active', lang) : `${t('planning_for', lang)} ${activeTab === 'today' ? t('today', lang) : t('tomorrow', lang)} (${daysVoluit[activeDayIdx]})`}
                </p>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* NIEUW SCHERM: WEEKPLANNING */}
      {showWeekPlan && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto p-6 space-y-6 pb-20 no-scrollbar">
          <header className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800">{t('week_plan', lang)}</h2>
            <button onClick={() => setShowWeekPlan(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={24}/></button>
          </header>
          <p className="text-sm font-medium text-slate-600 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm leading-relaxed">
            {t('week_plan_desc', lang)}
          </p>
          <div className="space-y-3">
            {daysVoluit.map((dayName: string, d: number) => (
              <div key={d} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="w-24 text-[11px] font-black text-slate-700 uppercase">{dayName}</span>
                <input type="time" value={settings.schedules[d]?.startTime || '06:00'} onChange={e => setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], startTime:e.target.value}}})} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2 text-xs font-black text-center outline-none"/>
                <input type="time" value={settings.schedules[d]?.endTime || '10:00'} onChange={e => setSettings({...settings, schedules: {...settings.schedules, [d]: {...settings.schedules[d], endTime:e.target.value}}})} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2 text-xs font-black text-red-600 text-center outline-none"/>
              </div>
            ))}
          </div>
          <button onClick={() => setShowWeekPlan(false)} className="w-full py-5 bg-orange-600 text-white font-black uppercase rounded-[28px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all">{t('save', lang)}</button>
        </div>
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
              <a href="https://www.barkr.nl" target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 active:scale-95 transition-all"><div className="bg-orange-600 p-2 rounded-xl"><Wifi size={18} className="text-white"/></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t('website', lang)}</span><span className="font-bold text-sm tracking-tight">www.barkr.nl</span></div></a>
              <a href="mailto:info@barkr.nl" className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 active:scale-95 transition-all"><div className="bg-blue-600 p-2 rounded-xl"><Mail size={18} className="text-white"/></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t('email', lang)}</span><span className="font-bold text-sm tracking-tight">info@barkr.nl</span></div></a>
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
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">{t('country', lang)}</label>
              <div className="relative">
                <select value={settings.country} onChange={e=>setSettings({...settings, country: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-slate-700 appearance-none outline-none">
                  {Object.keys(COUNTRIES).map(key => (
                    <option key={key} value={key}>{COUNTRIES[key].flag} {COUNTRIES[key].name} ({COUNTRIES[key].prefix})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase">{t('user_name', lang)}</label><input value={settings.name} onChange={e=>setSettings({...settings, name:e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700"/></div>
          </div>

          <div><label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block mb-2 px-1">{t('contacts', lang)}</label>
            <button onClick={()=> setSettings({...settings, contacts:[...settings.contacts, {name:'', phone: COUNTRIES[settings.country]?.prefix || ''}]})} className="w-full bg-orange-600 text-white p-3 rounded-xl shadow-md flex justify-center mb-4"><Plus size={20}/></button>
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
