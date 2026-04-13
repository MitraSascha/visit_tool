from datetime import datetime
from pydantic import BaseModel


class ActivityLogOut(BaseModel):
    id: int
    user_id: int | None
    action: str
    entity_type: str
    entity_id: int | None
    detail: str | None
    created_at: datetime
    model_config = {"from_attributes": True}
