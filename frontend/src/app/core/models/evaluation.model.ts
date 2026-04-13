export interface Evaluation {
  id: number;
  contact_id: number;
  quality: number;
  punctuality: number;
  communication: number;
  price_perf: number;
  reliability: number;
  note: string | null;
  created_at: string;
  average_score: number;
}

export interface EvaluationCreate {
  quality: number;
  punctuality: number;
  communication: number;
  price_perf: number;
  reliability: number;
  note?: string | null;
}
