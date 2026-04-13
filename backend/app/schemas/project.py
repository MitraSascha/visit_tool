from datetime import datetime, date
from pydantic import BaseModel
from app.models.project import ProjectStatus


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    address: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: ProjectStatus = ProjectStatus.planned


class ProjectUpdate(ProjectCreate):
    pass


class ProjectOut(ProjectCreate):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ProjectContactCreate(BaseModel):
    contact_id: int
    role: str | None = None


class ProjectContactOut(BaseModel):
    id: int
    project_id: int
    contact_id: int
    role: str | None
    model_config = {"from_attributes": True}
