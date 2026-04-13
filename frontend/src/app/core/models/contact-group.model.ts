export interface ContactGroup {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
}

export interface ContactGroupCreate {
  name: string;
  description?: string | null;
  color?: string | null;
}
