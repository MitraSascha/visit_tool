from datetime import datetime

from pydantic import BaseModel, field_validator

from app.models.contact import AssetTypeEnum, HasWorkedWithUsEnum, PriorityEnum, ResponseSpeedEnum


# --- Asset Schemas ---

class AssetOut(BaseModel):
    id: int
    partner_contact_id: int
    file_path: str
    type: AssetTypeEnum
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Contact Schemas ---

class ContactBase(BaseModel):
    company_name: str | None = None
    contact_name: str | None = None
    job_title: str | None = None
    phone: str | None = None
    mobile: str | None = None
    email: str | None = None
    website: str | None = None
    street: str | None = None
    zip_code: str | None = None
    city: str | None = None
    category: str | None = None
    trade: str | None = None
    service_description: str | None = None
    service_area: str | None = None
    tags: list[str] | None = None
    note: str | None = None
    recommended_by: str | None = None
    has_worked_with_us: HasWorkedWithUsEnum | None = None
    internal_rating: int | None = None
    last_project: str | None = None
    response_speed: ResponseSpeedEnum | None = None
    priority: PriorityEnum | None = None
    known_by: str | None = None
    last_contacted_at: datetime | None = None

    @field_validator("internal_rating")
    @classmethod
    def validate_rating(cls, v: int | None) -> int | None:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("internal_rating must be between 1 and 5")
        return v


class ContactCreate(ContactBase):
    pass


class ContactUpdate(ContactBase):
    pass


class ContactOut(ContactBase):
    id: int
    created_at: datetime
    updated_at: datetime
    assets: list[AssetOut] = []
    lat: float | None = None
    lng: float | None = None

    model_config = {"from_attributes": True}


class ContactListOut(BaseModel):
    items: list[ContactOut]
    total: int
    page: int
    page_size: int
    pages: int
