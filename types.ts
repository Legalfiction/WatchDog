
export interface DaySchedule {
  startTime: string;
  endTime: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  apiKey: string;
}

export interface UserSettings {
  email: string;
  myPhone: string;
  startTime: string; 
  endTime: string;   
  contacts: EmergencyContact[];
  vacationMode: boolean;
  activeDays: number[]; // 0=Ma, 1=Di, ..., 6=Zo
  useCustomSchedule: boolean;
  schedules: Record<number, DaySchedule>;
}

export interface ActivityLog {
  timestamp: number;
  timeStr: string;
  battery?: number;
}
