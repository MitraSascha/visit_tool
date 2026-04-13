export type InteractionType = 'call' | 'meeting' | 'email' | 'note';

export interface Interaction {
  id: number;
  contact_id: number;
  date: string; // ISO string
  type: InteractionType;
  note?: string | null;
  created_at: string;
}

export interface InteractionCreate {
  date: string;
  type: InteractionType;
  note?: string | null;
}

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  call: '📞 Anruf',
  meeting: '🤝 Treffen',
  email: '📧 E-Mail',
  note: '📝 Notiz',
};
