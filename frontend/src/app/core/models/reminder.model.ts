export interface Reminder {
  id: number;
  contact_id: number;
  due_date: string;   // ISO datetime string
  note: string | null;
  is_done: boolean;
  created_at: string;
}

export interface ReminderCreate {
  contact_id: number;
  due_date: string;
  note?: string | null;
}

export interface ReminderUpdate {
  due_date?: string;
  note?: string | null;
  is_done?: boolean;
}
