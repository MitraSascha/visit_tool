from datetime import datetime
from pydantic import BaseModel


class ReminderCreate(BaseModel):
    contact_id: int | None = None
    due_date: datetime
    note: str | None = None
    notify_before_minutes: int = 30


class ReminderUpdate(BaseModel):
    due_date: datetime | None = None
    note: str | None = None
    is_done: bool | None = None
    notify_before_minutes: int | None = None


class ReminderOut(BaseModel):
    id: int
    contact_id: int | None
    due_date: datetime
    note: str | None
    is_done: bool
    notify_before_minutes: int
    created_at: datetime
    model_config = {"from_attributes": True}
