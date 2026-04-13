from datetime import datetime

from pydantic import BaseModel

from app.models.interaction import InteractionType


class InteractionCreate(BaseModel):
    date: datetime
    type: InteractionType
    note: str | None = None


class InteractionOut(BaseModel):
    id: int
    contact_id: int
    date: datetime
    type: InteractionType
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
