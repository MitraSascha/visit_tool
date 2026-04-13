from datetime import datetime
from pydantic import BaseModel


class ContactGroupCreate(BaseModel):
    name: str
    description: str | None = None
    color: str | None = None


class ContactGroupOut(BaseModel):
    id: int
    name: str
    description: str | None
    color: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class GroupMemberAdd(BaseModel):
    contact_id: int
