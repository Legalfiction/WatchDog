// Landen — voor landcode/prefix telefoon
export const COUNTRIES: Record<string, { flag: string; prefix: string; name: string }> = {
  NL: { flag: '🇳🇱', prefix: '+31', name: 'Nederland' },
  BE: { flag: '🇧🇪', prefix: '+32', name: 'België' },
  UK: { flag: '🇬🇧', prefix: '+44', name: 'United Kingdom' },
  US: { flag: '🇺🇸', prefix: '+1',  name: 'United States' },
  DE: { flag: '🇩🇪', prefix: '+49', name: 'Deutschland' },
  FR: { flag: '🇫🇷', prefix: '+33', name: 'France' },
  ES: { flag: '🇪🇸', prefix: '+34', name: 'España' },
  IT: { flag: '🇮🇹', prefix: '+39', name: 'Italia' },
  PL: { flag: '🇵🇱', prefix: '+48', name: 'Polska' },
  TR: { flag: '🇹🇷', prefix: '+90', name: 'Türkiye' },
  AT: { flag: '🇦🇹', prefix: '+43', name: 'Österreich' },
  CH: { flag: '🇨🇭', prefix: '+41', name: 'Schweiz' },
  PT: { flag: '🇵🇹', prefix: '+351', name: 'Portugal' },
  GR: { flag: '🇬🇷', prefix: '+30', name: 'Ελλάδα' },
  SE: { flag: '🇸🇪', prefix: '+46', name: 'Sverige' },
  NO: { flag: '🇳🇴', prefix: '+47', name: 'Norge' },
  DK: { flag: '🇩🇰', prefix: '+45', name: 'Danmark' },
  FI: { flag: '🇫🇮', prefix: '+358', name: 'Suomi' },
  AU: { flag: '🇦🇺', prefix: '+61', name: 'Australia' },
  CA: { flag: '🇨🇦', prefix: '+1',  name: 'Canada' },
};

// Talen — voor de interface
export const LANGUAGES: Record<string, { flag: string; name: string; lang: string; days: string[] }> = {
  nl: { flag: '🇳🇱', name: 'Nederlands', lang: 'nl', days: ['Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag','Zondag'] },
  be: { flag: '🇧🇪', name: 'Nederlands (BE)', lang: 'be', days: ['Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag','Zondag'] },
  uk: { flag: '🇬🇧', name: 'English (UK)', lang: 'uk', days: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] },
  us: { flag: '🇺🇸', name: 'English (US)', lang: 'us', days: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] },
  de: { flag: '🇩🇪', name: 'Deutsch', lang: 'de', days: ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'] },
  fr: { flag: '🇫🇷', name: 'Français', lang: 'fr', days: ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'] },
  es: { flag: '🇪🇸', name: 'Español', lang: 'es', days: ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'] },
  it: { flag: '🇮🇹', name: 'Italiano', lang: 'it', days: ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'] },
  pl: { flag: '🇵🇱', name: 'Polski', lang: 'pl', days: ['Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota','Niedziela'] },
  tr: { flag: '🇹🇷', name: 'Türkçe', lang: 'tr', days: ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'] },
};
