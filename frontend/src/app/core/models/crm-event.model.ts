export interface CrmEvent {
  id: number;
  title: string;
  start: string;   // ISO datetime
  end: string;     // ISO datetime
  partners: string[];
}

export const CRM_DAY_OPTIONS = [
  { value: 7,  label: 'Nächste 7 Tage' },
  { value: 30, label: 'Nächste 30 Tage' },
  { value: 90, label: 'Nächste 3 Monate' },
] as const;
