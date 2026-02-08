
export interface UserSettings {
  email: string;
  emergencyEmail: string;
  startTime: string; // Bijv. "07:00"
  endTime: string;   // Bijv. "09:00"
  whatsappPhone: string; // Voor CallMeBot WhatsApp
  whatsappApiKey: string; // Voor CallMeBot API
  webhookUrl: string;
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
