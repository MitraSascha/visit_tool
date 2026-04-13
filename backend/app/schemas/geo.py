from pydantic import BaseModel


class GeoContactOut(BaseModel):
    id: int
    company_name: str | None
    city: str | None
    category: str | None
    lat: float | None
    lng: float | None

    model_config = {"from_attributes": True}
