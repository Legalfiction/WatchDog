
export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  apiKey: string;
}

export interface UserSettings {
  email: string;      // Jouw Naam (bijv. Aldo)
  startTime: string; 
  endTime: string;   
  contacts: EmergencyContact[];
}

export interface ActivityLog {
  timestamp: number;
  type: 'focus' | 'manual' | 'background';
  status: 'sent' | 'failed' | 'local';
}

export enum AppStatus {
  WATCHING = 'WATCHING',
  WARNING = 'WARNING',
  INACTIVE = 'INACTIVE'
}
