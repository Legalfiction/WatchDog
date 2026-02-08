
export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  apiKey: string;
}

export interface UserSettings {
  email: string;
  startTime: string; // Bijv. "07:00"
  endTime: string;   // Bijv. "09:00"
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
