
/**
 * SafeGuard Watchdog Logic
 * 
 * Gebruiker's Instructie: "Intelligence mag bij mij blijven. Ik zal waar nodig api koppelingen leggen."
 * 
 * Hoe dit werkt voor een 'Geen App' oplossing:
 * 
 * 1. PWA Frontend (React):
 *    - Registreert een 'Activity Log' in de browser state of een externe database (Supabase/Firebase) 
 *      zodra de gebruiker de telefoon ontgrendelt en de tab (die open staat) focust.
 * 
 * 2. Backend Cron (Vercel/GitHub Actions):
 *    - Draait elke dag om de 'checkTime' (bijv 08:30).
 *    - Controleert in de database of er een log is tussen (08:30 - gracePeriod) en 08:30.
 *    - Indien FALSE: Stuurt mail via SendGrid/Postmark naar 'emergencyEmail'.
 */

export const triggerAlert = async (userEmail: string, emergencyEmail: string) => {
  // Dit is de placeholder voor de API koppeling van de gebruiker.
  console.log(`Zou nu een mail sturen van ${userEmail} naar ${emergencyEmail}`);
};

export const checkActivity = (logs: any[], gracePeriodHours: number): boolean => {
  const now = Date.now();
  const graceThreshold = now - (gracePeriodHours * 60 * 60 * 1000);
  return logs.some(log => log.timestamp > graceThreshold);
};
