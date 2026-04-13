from pydantic import BaseModel


class CategoryCount(BaseModel):
    name: str
    count: int


class DashboardStats(BaseModel):
    total_contacts: int
    avg_rating: float | None
    contacts_by_category: list[CategoryCount]
    contacts_by_priority: list[CategoryCount]
    recently_added: int  # letzte 30 Tage
    overdue_reminders_count: int
    contacts_without_rating: int
