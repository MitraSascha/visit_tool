export type ProjectStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface Project {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string | null;
  address?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: ProjectStatus;
}
