export type WorkedWith = 'yes' | 'no' | 'not_yet';
export type ResponseSpeed = 'very_fast' | 'fast' | 'medium' | 'slow';
export type Priority = 'high' | 'medium' | 'low';
export type AssetType = 'front' | 'back' | 'document';

export interface PartnerContact {
  id: number;
  company_name: string;
  contact_name: string;
  job_title: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  street: string;
  zip_code: string;
  city: string;
  category: string;
  trade: string;
  service_description: string;
  service_area: string;
  tags: string[];
  note: string;
  recommended_by: string;
  has_worked_with_us: WorkedWith;
  internal_rating: number | null;    // 1–5
  last_project: string;
  response_speed: ResponseSpeed | null;
  priority: Priority | null;
  known_by: string;
  last_contacted_at?: string;
  lat?: number;
  lng?: number;
  created_at: string;
  updated_at: string;
  assets?: PartnerCardAsset[];
}

export interface PartnerCardAsset {
  id: number;
  partner_contact_id: number;
  file_path: string;
  type: AssetType;
  created_at: string;
}

export interface ContactSearchParams {
  q?: string;
  category?: string;
  trade?: string;
  city?: string;
  has_worked_with_us?: WorkedWith;
  min_rating?: number;
  priority?: Priority;
  page?: number;
  page_size?: number;
}

// Leerer Kontakt als Formular-Startwert
export function emptyContact(): Partial<PartnerContact> {
  return {
    company_name: '',
    contact_name: '',
    job_title: '',
    phone: '',
    mobile: '',
    email: '',
    website: '',
    street: '',
    zip_code: '',
    city: '',
    category: '',
    trade: '',
    service_description: '',
    service_area: '',
    tags: [],
    note: '',
    recommended_by: '',
    has_worked_with_us: 'not_yet',
    internal_rating: null,
    last_project: '',
    response_speed: null,
    priority: null,
    known_by: '',
  };
}

// Kategorie-Optionen (kontrolliertes Vokabular)
export const CATEGORIES = [
  'Elektriker',
  'Fliesenleger',
  'Maler',
  'Sanitär',
  'Trocknerfirma',
  'Händler',
  'Versicherung',
  'Beratung',
  'Leckageortung',
  'Schlosser',
  'Schreiner',
  'Dachdecker',
  'Garten & Landschaft',
  'Reinigung',
  'Sonstiges',
] as const;

export const RESPONSE_SPEEDS: { value: ResponseSpeed; label: string }[] = [
  { value: 'very_fast', label: 'Sehr schnell' },
  { value: 'fast',      label: 'Schnell' },
  { value: 'medium',    label: 'Mittel' },
  { value: 'slow',      label: 'Langsam' },
];

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'high',   label: 'Hoch' },
  { value: 'medium', label: 'Mittel' },
  { value: 'low',    label: 'Niedrig' },
];

export const WORKED_WITH_OPTIONS: { value: WorkedWith; label: string }[] = [
  { value: 'yes',     label: 'Ja' },
  { value: 'no',      label: 'Nein' },
  { value: 'not_yet', label: 'Noch nicht' },
];
