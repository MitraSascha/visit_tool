export interface CategoryCount {
  name: string;
  count: number;
}

export interface DashboardStats {
  total_contacts: number;
  avg_rating: number | null;
  contacts_by_category: CategoryCount[];
  contacts_by_priority: CategoryCount[];
  recently_added: number;
  overdue_reminders_count: number;
  contacts_without_rating: number;
}
