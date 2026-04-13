from datetime import datetime
from pydantic import BaseModel


class ReminderCreate(BaseModel):
    contact_id: int
    due_date: datetime
    note: str | None = None


class ReminderUpdate(BaseModel):
    due_date: datetime | None = None
    note: str | None = None
    is_done: bool | None = None


class ReminderOut(BaseModel):
    id: int
    contact_id: int
    due_date: datetime
    note: str | None
    is_done: bool
    created_at: datetime
    model_config = {"from_attributes": True}
