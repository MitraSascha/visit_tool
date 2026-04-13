from datetime import datetime
from pydantic import BaseModel, Field


class EvaluationCreate(BaseModel):
    quality: int = Field(ge=1, le=5)
    punctuality: int = Field(ge=1, le=5)
    communication: int = Field(ge=1, le=5)
    price_perf: int = Field(ge=1, le=5)
    reliability: int = Field(ge=1, le=5)
    note: str | None = None


class EvaluationOut(EvaluationCreate):
    id: int
    contact_id: int
    created_at: datetime
    average_score: float = 0.0

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_avg(cls, obj):
        data = cls.model_validate(obj)
        data.average_score = round((obj.quality + obj.punctuality + obj.communication + obj.price_perf + obj.reliability) / 5, 2)
        return data
