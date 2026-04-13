export interface Reminder {
  id: number;
  contact_id: number | null;
  due_date: string;   // ISO datetime string
  note: string | null;
  is_done: boolean;
  notify_before_minutes: number;
  created_at: string;
}

export interface ReminderCreate {
  contact_id?: number | null;
  due_date: string;
  note?: string | null;
  notify_before_minutes?: number;
}

export interface ReminderUpdate {
  due_date?: string;
  note?: string | null;
  is_done?: boolean;
  notify_before_minutes?: number;
}

export const NOTIFY_BEFORE_OPTIONS = [
  { value: 0,    label: 'Zum Zeitpunkt' },
  { value: 10,   label: '10 Minuten vorher' },
  { value: 15,   label: '15 Minuten vorher' },
  { value: 30,   label: '30 Minuten vorher' },
  { value: 60,   label: '1 Stunde vorher' },
  { value: 120,  label: '2 Stunden vorher' },
  { value: 1440, label: '1 Tag vorher' },
] as const;
